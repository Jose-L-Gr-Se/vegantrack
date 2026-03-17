# 🌱 VeganTrack

Tu nutrición plant-based, bajo control.

## Setup

### 1. Crear las tablas en Supabase

Ve a **Supabase Dashboard → SQL Editor → New Query**, pega el contenido de `vegantrack_supabase_setup.sql` y ejecuta.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Arrancar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

### 4. Build para producción

```bash
npm run build
```

### 5. Deploy en Vercel

```bash
npx vercel
```

## Stack

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS v3** (DM Sans + Bricolage Grotesque)
- **Supabase** (Auth + PostgreSQL + RLS)
- **OpenFoodFacts API** (datos nutricionales)
- **html5-qrcode** (escáner de código de barras)
- **Zustand** (estado global)
- **Lucide React** (iconos)

## Estructura

```
src/
├── components/
│   ├── layout/      → BottomNav
│   └── ui/          → ProgressRing, MacroBar, Spinner
├── features/
│   ├── auth/        → AuthPage
│   ├── diary/       → DiaryPage
│   ├── search/      → SearchPage (scanner + búsqueda)
│   ├── dashboard/   → DashboardPage
│   └── profile/     → OnboardingPage, ProfilePage
├── hooks/
├── lib/             → supabase.ts, openfoodfacts.ts
├── stores/          → authStore.ts, diaryStore.ts
├── types/           → index.ts
└── utils/           → nutrition.ts (TDEE calculator)
```

---

**DATOS > OPINIÓN** 🌱
