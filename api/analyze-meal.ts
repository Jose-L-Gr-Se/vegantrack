/**
 * analyze-meal — Analiza la foto de un plato con Claude (visión) y devuelve
 * macros estimados + verificación vegana. La API key vive sólo en el servidor.
 *
 * Flujo:
 *   1. Verifica el JWT de Supabase (Bearer) → userId.
 *   2. Comprueba el plan: si es free y ya gastó la cuota diaria → 402.
 *   3. Llama a Claude con la imagen y un contrato JSON estricto.
 *   4. Registra el escaneo (meal_scans) y devuelve resultado + cuota restante.
 *
 * Env requeridas:
 *   ANTHROPIC_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (opcional) ANTHROPIC_MODEL, FREE_DAILY_SCANS
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const FREE_DAILY_SCANS = Number(process.env.FREE_DAILY_SCANS ?? '3');

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `Eres un nutricionista experto en cocina vegana que estima la composición de un plato a partir de una foto.
Devuelve SIEMPRE valores nutricionales POR 100 g (no del plato entero) y una estimación del peso total del plato en gramos.
Sé realista y conservador. Si la imagen no es comida, responde is_food=false.
Marca is_vegan=false si detectas cualquier ingrediente de origen animal (carne, pescado, huevo, lácteos, miel, gelatina).
Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional.`;

const JSON_CONTRACT = `Esquema JSON exacto:
{
  "is_food": boolean,
  "food_name": "string corto en español (p. ej. 'Bowl de garbanzos y aguacate')",
  "estimated_grams": number,
  "per_100g": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "saturated_fat_g": number
  },
  "is_vegan": boolean,
  "vegan_confidence": "high" | "medium" | "low" | "unknown",
  "non_vegan_ingredients": ["lista de ingredientes no veganos detectados, vacía si es vegano"],
  "notes": "una frase opcional con supuestos de la estimación"
}`;

function parseJson(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    // 1. Auth: validar el token de Supabase
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return json({ error: 'No autorizado' }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: 'Sesión no válida' }, 401);
    const userId = userData.user.id;

    const { image_base64, mime_type } = await req.json();
    if (!image_base64) return json({ error: 'Falta la imagen' }, 400);

    // 2. Plan + cuota diaria
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    const isPro =
      profile?.subscription_tier === 'pro' &&
      (!profile.subscription_expires_at ||
        new Date(profile.subscription_expires_at).getTime() > Date.now());

    const today = todayUTC();
    let usedToday = 0;
    if (!isPro) {
      const { count } = await supabase
        .from('meal_scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', today);
      usedToday = count ?? 0;
      if (usedToday >= FREE_DAILY_SCANS) {
        return json({ error: 'quota_exceeded', remaining: 0, limit: FREE_DAILY_SCANS }, 402);
      }
    }

    // 3. Claude (visión)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json({ error: 'IA no configurada' }, 500);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime_type || 'image/jpeg',
                  data: image_base64,
                },
              },
              { type: 'text', text: `Analiza este plato. ${JSON_CONTRACT}` },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      console.error('Anthropic error:', aiRes.status, detail);
      return json({ error: 'No se pudo analizar la imagen' }, 502);
    }

    const aiJson = await aiRes.json();
    const text = aiJson?.content?.[0]?.text ?? '';
    let result: any;
    try {
      result = parseJson(text);
    } catch {
      console.error('Parse error, raw:', text);
      return json({ error: 'Respuesta de IA no interpretable' }, 502);
    }

    if (!result?.is_food) {
      return json({ error: 'no_food', message: 'No parece un plato de comida.' }, 422);
    }

    // 4. Registrar el escaneo (sólo en éxito) y devolver cuota
    await supabase.from('meal_scans').insert({ user_id: userId, date: today });

    const remaining = isPro ? null : Math.max(0, FREE_DAILY_SCANS - (usedToday + 1));
    return json({ result, remaining, limit: FREE_DAILY_SCANS });
  } catch (err: any) {
    console.error('analyze-meal error:', err);
    return json({ error: err?.message ?? 'Error interno' }, 500);
  }
}
