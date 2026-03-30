-- =============================================================================
-- VeganTrack — Supabase schema
-- Estado actual del proyecto (snapshot 2026-03-30)
-- =============================================================================
-- Pendiente de migrar al repo como migrations/ cuando se adopte supabase CLI.
-- Por ahora este fichero es la fuente de verdad del backend.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------------
-- pgcrypto viene habilitado en Supabase por defecto (gen_random_uuid)


-- ---------------------------------------------------------------------------
-- TABLA: profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text,
  height_cm        numeric,
  weight_kg        numeric,
  birth_date       date,
  sex              text        CHECK (sex IN ('male', 'female')),
  activity_level   text        DEFAULT 'moderate'
                               CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             text        DEFAULT 'maintain'
                               CHECK (goal IN ('cut','maintain','bulk')),
  calorie_target   integer,
  protein_target_g integer,
  carbs_target_g   integer,
  fat_target_g     integer,
  streak_count     integer     DEFAULT 0,
  last_log_date    date,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- TABLA: food_log
-- ---------------------------------------------------------------------------
-- Micros: nullable = dato ausente en OFF (distinto de 0 real).
-- *_known: false por defecto para entradas antiguas sin bandera explícita.
-- source: 'openfoodfacts' | 'manual' — controla el cómputo de coverage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date             date        NOT NULL DEFAULT CURRENT_DATE,
  meal_type        text        NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name        text        NOT NULL,
  barcode          text,
  brand            text,
  serving_size_g   numeric     NOT NULL,
  calories         numeric     NOT NULL DEFAULT 0,
  protein_g        numeric     NOT NULL DEFAULT 0,
  carbs_g          numeric     NOT NULL DEFAULT 0,
  fat_g            numeric     NOT NULL DEFAULT 0,
  fiber_g          numeric              DEFAULT 0,
  sugar_g          numeric              DEFAULT 0,
  saturated_fat_g  numeric              DEFAULT 0,
  sodium_mg        numeric              DEFAULT 0,

  -- Micros: NULL = no reportado por la fuente, 0 = reportado como cero real
  vitamin_b12_mcg  real,
  iron_mg          real,
  zinc_mg          real,
  calcium_mg       real,
  omega3_g         real,
  vitamin_d_mcg    real,
  iodine_mcg       real,
  selenium_mcg     real,

  -- Flags de cobertura (fuente declaró este micro explícitamente)
  vitamin_b12_known boolean NOT NULL DEFAULT false,
  iron_known        boolean NOT NULL DEFAULT false,
  zinc_known        boolean NOT NULL DEFAULT false,
  calcium_known     boolean NOT NULL DEFAULT false,
  omega3_known      boolean NOT NULL DEFAULT false,
  vitamin_d_known   boolean NOT NULL DEFAULT false,
  iodine_known      boolean NOT NULL DEFAULT false,
  selenium_known    boolean NOT NULL DEFAULT false,

  -- Trazabilidad de origen
  source            text    NOT NULL DEFAULT 'openfoodfacts',
  source_ref        text,

  is_vegan          boolean          DEFAULT true,
  image_url         text,
  created_at        timestamptz      DEFAULT now(),
  updated_at        timestamptz      DEFAULT now()
);

ALTER TABLE public.food_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own food_log"   ON public.food_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food_log" ON public.food_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food_log" ON public.food_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food_log" ON public.food_log FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- TABLA: food_cache
-- ---------------------------------------------------------------------------
-- Caché de productos OFF por barcode. Sin RLS de usuario (compartida).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_cache (
  barcode    text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE public.food_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read food_cache"
  ON public.food_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert food_cache"
  ON public.food_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cache"
  ON public.food_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- TABLA: custom_foods
-- ---------------------------------------------------------------------------
-- TODO: añadir brand, image_url, updated_at (divergencia con el tipo TS).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_foods (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  brand            text,
  image_url        text,
  calories_per_100g numeric    NOT NULL,
  protein_per_100g  numeric    NOT NULL,
  carbs_per_100g    numeric    NOT NULL,
  fat_per_100g      numeric    NOT NULL,
  fiber_per_100g    numeric             DEFAULT 0,
  is_vegan          boolean             DEFAULT true,
  created_at        timestamptz         DEFAULT now(),
  updated_at        timestamptz         DEFAULT now()
);

ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own custom_foods"   ON public.custom_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom_foods" ON public.custom_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom_foods" ON public.custom_foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom_foods" ON public.custom_foods FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- TABLA: micronutrients_log
-- ---------------------------------------------------------------------------
-- Tabla de agregados diarios de micros. Actualmente sin uso en el frontend
-- (la UI calcula los totales en cliente desde food_log). Reservada.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.micronutrients_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  vitamin_b12_mcg numeric   DEFAULT 0,
  iron_mg         numeric   DEFAULT 0,
  zinc_mg         numeric   DEFAULT 0,
  calcium_mg      numeric   DEFAULT 0,
  omega3_g        numeric   DEFAULT 0,
  iodine_mcg      numeric   DEFAULT 0,
  vitamin_d_mcg   numeric   DEFAULT 0,
  selenium_mcg    numeric   DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.micronutrients_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own micronutrients"   ON public.micronutrients_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own micronutrients" ON public.micronutrients_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own micronutrients" ON public.micronutrients_log FOR UPDATE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- FUNCIÓN: handle_new_user
-- Trigger: on_auth_user_created (auth.users → AFTER INSERT)
-- Crea el perfil automáticamente cuando se registra un usuario.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- FUNCIÓN: update_streak(p_user_id uuid, p_date date) → integer
-- Actualiza la racha del usuario en función de la última fecha de log.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_last_date date;
  v_streak    integer;
BEGIN
  SELECT last_log_date, COALESCE(streak_count, 0)
  INTO v_last_date, v_streak
  FROM profiles WHERE id = p_user_id;

  IF v_last_date IS NULL OR p_date > v_last_date + 1 THEN
    v_streak := 1;
  ELSIF p_date = v_last_date + 1 THEN
    v_streak := v_streak + 1;
  ELSIF p_date = v_last_date THEN
    RETURN v_streak;  -- Mismo día, no cambiar
  ELSE
    v_streak := 1;
  END IF;

  UPDATE profiles
  SET streak_count  = v_streak,
      last_log_date = p_date,
      updated_at    = NOW()
  WHERE id = p_user_id;

  RETURN v_streak;
END;
$$;
