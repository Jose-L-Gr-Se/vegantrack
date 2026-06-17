# VeganLens — guía de activación

Foto-logueo de platos con IA + paywall medido. Esta guía cubre los pasos para
ponerlo en producción. El código ya está en la rama `claude/happy-heisenberg-ya19i8`
de ambos repos (`vegantrack` = backend/PWA, `Vegantrack-mobileclaude` = app).

## 1. Supabase — migración (una vez)

Ejecuta en el editor SQL de Supabase:

```
supabase/meal-scans-and-analytics.sql
```

Crea dos tablas:
- `meal_scans` — un registro por foto analizada con éxito. Base de la cuota
  diaria del plan free. Escritura sólo desde la API (service_role).
- `analytics_events` — eventos del embudo. El cliente sólo inserta los suyos.

La columna `food_log.source` es texto libre (sin CHECK), así que el nuevo valor
`'ai_photo'` se guarda sin cambios de esquema.

## 2. Vercel — variables de entorno (proyecto `vegantrack`)

| Variable | Obligatoria | Por defecto | Para qué |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Sí** | — | Llamada a Claude (visión) |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Modelo de visión |
| `FREE_DAILY_SCANS` | No | `3` | Cuota diaria del plan free |
| `VITE_SUPABASE_URL` | Ya existe | — | Reutiliza la del webhook de Stripe |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya existe | — | Reutiliza la del webhook de Stripe |

Despliega la rama (o haz merge) para que `POST /api/analyze-meal` esté vivo.

## 3. App móvil — reconstruir la APK ⚠️

`expo-image-picker` es un módulo **nativo**. La APK actual NO lo incluye, así que
**hay que generar una nueva build** (no basta con recargar el JS):

```
npm run build:apk     # o el workflow de Android del CI
```

Asegúrate de que la build apunta a la API desplegada:
`EXPO_PUBLIC_WEB_BASE_URL` debe ser el origen de la PWA (por defecto
`https://vegantrack.app`). La app llama a `${EXPO_PUBLIC_WEB_BASE_URL}/api/analyze-meal`.

## 4. Probar de punta a punta

1. Diario → **Analizar plato con IA** → *Hacer foto* o *Elegir de galería*.
2. La ficha muestra macros estimados, confianza vegana y, si procede, un aviso
   de ingredientes no veganos. Ajusta los gramos y *Añadir al diario*.
3. La entrada aparece en el día y suma al VeganScore.
4. Tras `FREE_DAILY_SCANS` fotos (plan free), la siguiente abre el paywall.
5. Comprueba filas nuevas en `meal_scans` y `analytics_events`.

## 5. Medir el embudo

Eventos en `analytics_events`:
`app_open`, `photo_scan_started`, `photo_scan_success`, `photo_scan_quota_blocked`,
`photo_scan_error`, `photo_entry_saved`, `paywall_viewed`, `checkout_opened`.

Conversión de la palanca (fotos → paywall → checkout), últimos 30 días:

```sql
select event, count(*) 
from analytics_events
where created_at > now() - interval '30 days'
  and event in ('photo_scan_success','photo_scan_quota_blocked','paywall_viewed','checkout_opened')
group by event
order by 2 desc;
```

## Notas

- **Coste IA**: acotado por la cuota gratuita. Vigila el gasto real y ajusta
  `ANTHROPIC_MODEL`/`FREE_DAILY_SCANS`. Para abaratar, `claude-haiku-4-5` es más
  barato a costa de algo de precisión.
- **La foto estima macros, no micros** (B12/hierro/etc. quedan "desconocidos" a
  propósito: prometer micros desde una foto sería falso). Los micros siguen
  viniendo de productos etiquetados y suplementos.
- **Privacidad**: la imagen se envía al backend y de ahí a Anthropic para el
  análisis; no se almacena la foto (sólo el resultado al guardar la entrada).
