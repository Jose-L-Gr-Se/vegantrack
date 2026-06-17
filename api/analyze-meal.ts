/**
 * analyze-meal — Analiza la foto de un plato con Google Gemini (visión) y
 * devuelve macros estimados. Análisis nutricional GENERAL para cualquier
 * persona: no rechaza platos por llevar carne, pescado, huevo o lácteos. La
 * información vegana es sólo un dato opcional. La API key vive en el servidor.
 *
 * Flujo:
 *   1. Verifica el JWT de Supabase (Bearer) → userId.
 *   2. Comprueba el plan: si es free y ya gastó la cuota diaria → 402.
 *   3. Llama a Gemini con la imagen y un contrato JSON estricto (responseSchema).
 *   4. Registra el escaneo (meal_scans + analytics) y devuelve resultado + cuota.
 *
 * Env requeridas:
 *   GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (opcional) GEMINI_MODEL (default gemini-2.5-flash-lite), FREE_DAILY_SCANS
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
const FREE_DAILY_SCANS = Number(process.env.FREE_DAILY_SCANS ?? '3');

export const config = { runtime: 'edge' };

const PROMPT = `Analiza la foto de comida para una app de nutrición general que usa todo tipo de personas (no sólo veganas).
Estima el plato más probable, los ingredientes visibles, los gramos aproximados del plato y los valores nutricionales POR 100 g (calorías, proteínas, carbohidratos, grasas, fibra, azúcares y grasas saturadas).
No rechaces ni penalices platos por llevar carne, pescado, huevo, lácteos, miel u otros ingredientes de origen animal: simplemente analízalos.
Indica si el plato es vegano (is_vegan) sólo como dato informativo. Si ves ingredientes posiblemente NO veganos, repórtalos en non_vegan_ingredients como información opcional, sin juzgar.
Si no estás seguro de algo, indícalo (vegan_confidence más baja, o una nota breve); no inventes datos.
Si la imagen no es comida, responde is_food=false.
Devuelve ÚNICAMENTE el JSON con el contrato esperado.`;

// Contrato de salida (idéntico al que espera la app móvil).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    food_name: { type: 'string' },
    estimated_grams: { type: 'number' },
    per_100g: {
      type: 'object',
      properties: {
        calories: { type: 'number' },
        protein_g: { type: 'number' },
        carbs_g: { type: 'number' },
        fat_g: { type: 'number' },
        fiber_g: { type: 'number' },
        sugar_g: { type: 'number' },
        saturated_fat_g: { type: 'number' },
      },
      required: ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'saturated_fat_g'],
    },
    is_vegan: { type: 'boolean' },
    vegan_confidence: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
    non_vegan_ingredients: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['is_food', 'food_name', 'estimated_grams', 'per_100g', 'is_vegan', 'vegan_confidence', 'non_vegan_ingredients'],
} as const;

function parseJson(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

/** Valida defensivamente la forma mínima del contrato. */
function isValidAnalysis(r: any): boolean {
  if (!r || typeof r.is_food !== 'boolean') return false;
  if (!r.is_food) return true; // "no es comida" es una respuesta válida
  const p = r.per_100g;
  return (
    typeof r.food_name === 'string' &&
    typeof r.estimated_grams === 'number' &&
    p &&
    typeof p.calories === 'number' &&
    typeof p.protein_g === 'number' &&
    typeof p.carbs_g === 'number' &&
    typeof p.fat_g === 'number'
  );
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

    // 3. Gemini (visión) con salida JSON forzada por esquema
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'IA no configurada' }, 500);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mime_type || 'image/jpeg', data: image_base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => '');
      console.error('Gemini error:', aiRes.status, detail);
      return json({ error: 'No se pudo analizar la imagen' }, 502);
    }

    const aiJson = await aiRes.json();
    const text = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      // p. ej. respuesta bloqueada por seguridad o vacía
      console.error('Gemini sin texto, finishReason:', aiJson?.candidates?.[0]?.finishReason);
      return json({ error: 'La IA no devolvió un resultado. Prueba con otra foto.' }, 502);
    }

    let result: any;
    try {
      result = parseJson(text);
    } catch {
      console.error('Parse error, raw:', text);
      return json({ error: 'Respuesta de IA no interpretable' }, 502);
    }

    if (!isValidAnalysis(result)) {
      console.error('Contrato inválido:', JSON.stringify(result));
      return json({ error: 'La IA no devolvió un análisis válido. Prueba con otra foto.' }, 502);
    }

    if (!result.is_food) {
      return json({ error: 'no_food', message: 'No parece un plato de comida.' }, 422);
    }

    // Normaliza campos opcionales para que el contrato sea estable.
    if (!Array.isArray(result.non_vegan_ingredients)) result.non_vegan_ingredients = [];
    if (typeof result.vegan_confidence !== 'string') result.vegan_confidence = 'unknown';

    // 4. Registrar el escaneo (sólo en éxito) + analítica de servidor.
    await supabase.from('meal_scans').insert({ user_id: userId, date: today });
    void supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event: 'meal_analyzed',
        props: { model: MODEL, is_vegan: result.is_vegan, vegan_confidence: result.vegan_confidence },
      })
      .then(() => undefined, () => undefined);

    const remaining = isPro ? null : Math.max(0, FREE_DAILY_SCANS - (usedToday + 1));
    return json({ result, remaining, limit: FREE_DAILY_SCANS });
  } catch (err: any) {
    console.error('analyze-meal error:', err);
    return json({ error: err?.message ?? 'Error interno' }, 500);
  }
}
