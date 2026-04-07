import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MICROS = [
  { key: 'b12',     label: 'Vitamina B12', unit: 'mcg', rda: 2.4,   emoji: '🧬' },
  { key: 'vitd',    label: 'Vitamina D',   unit: 'mcg', rda: 15,    emoji: '☀️' },
  { key: 'iron',    label: 'Hierro',       unit: 'mg',  rda: 18,    emoji: '🩸' },
  { key: 'omega3',  label: 'Omega-3',      unit: 'g',   rda: 1.6,   emoji: '🌊' },
  { key: 'zinc',    label: 'Zinc',         unit: 'mg',  rda: 11,    emoji: '⚡' },
  { key: 'calcium', label: 'Calcio',       unit: 'mg',  rda: 1000,  emoji: '🦴' },
] as const;

type MicroKey = typeof MICROS[number]['key'];

interface WeekPoint {
  week_start: string;
  vitamin_b12_mcg: number;
  iron_mg: number;
  zinc_mg: number;
  calcium_mg: number;
  vitamin_d_mcg: number;
  omega3_g: number;
  b12_from_supp: number;
  iron_from_supp: number;
  zinc_from_supp: number;
  calcium_from_supp: number;
  vitd_from_supp: number;
  omega3_from_supp: number;
}

interface ChartPoint {
  label: string;
  pct: number;
  total: number;
  fromFood: number;
  fromSupp: number;
}

type MicroConfig = { key: MicroKey; label: string; unit: string; rda: number; emoji: string };

function buildChartData(rows: WeekPoint[], micro: MicroConfig): ChartPoint[] {
  return rows.map((row) => {
    let fromFood = 0;
    let fromSupp = 0;

    switch (micro.key) {
      case 'b12':     fromFood = row.vitamin_b12_mcg; fromSupp = row.b12_from_supp;     break;
      case 'vitd':    fromFood = row.vitamin_d_mcg;   fromSupp = row.vitd_from_supp;    break;
      case 'iron':    fromFood = row.iron_mg;          fromSupp = row.iron_from_supp;    break;
      case 'omega3':  fromFood = row.omega3_g;         fromSupp = row.omega3_from_supp;  break;
      case 'zinc':    fromFood = row.zinc_mg;          fromSupp = row.zinc_from_supp;    break;
      case 'calcium': fromFood = row.calcium_mg;       fromSupp = row.calcium_from_supp; break;
    }

    const total = fromFood + fromSupp;
    const pct = Math.min(Math.round((total / micro.rda) * 100), 200);
    const date = new Date(row.week_start + 'T12:00:00');
    const label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    return { label, pct, total, fromFood, fromSupp };
  });
}

function getTrend(data: ChartPoint[]): 'up' | 'down' | 'flat' {
  const withData = data.filter((d) => d.pct > 0);
  if (withData.length < 2) return 'flat';
  const first = withData.slice(0, Math.ceil(withData.length / 2));
  const last = withData.slice(Math.ceil(withData.length / 2));
  const avgFirst = first.reduce((s, d) => s + d.pct, 0) / first.length;
  const avgLast = last.reduce((s, d) => s + d.pct, 0) / last.length;
  if (avgLast > avgFirst + 5) return 'up';
  if (avgLast < avgFirst - 5) return 'down';
  return 'flat';
}

function getBarColor(pct: number): string {
  if (pct >= 90) return '#16a34a';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

const CustomTooltip = ({ active, payload, label, micro }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartPoint;
  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-surface-700 mb-1">Semana del {label}</p>
      <p className="text-surface-900 font-mono font-bold">{d.pct}% de RDA</p>
      {d.fromSupp > 0 && (
        <p className="text-surface-400 mt-1">
          Dieta: {d.fromFood.toFixed(1)}{micro.unit} · Supl: {d.fromSupp.toFixed(1)}{micro.unit}
        </p>
      )}
    </div>
  );
};

export function MicroTrendsChart() {
  const { user, profile } = useAuthStore();
  const [selected, setSelected] = useState<MicroKey>('b12');
  const [rows, setRows] = useState<WeekPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .rpc('get_micro_trends', { p_user_id: user.id, p_weeks: 8 })
      .then(({ data, error }) => {
        if (!error && data) setRows(data as WeekPoint[]);
        setLoading(false);
      });
  }, [user?.id]);

  const micro = MICROS.find((m) => m.key === selected)!;

  // Ajustar RDA hierro por sexo
  const rda = micro.key === 'iron' && profile?.sex === 'male' ? 8 : micro.rda;
  const microWithRda = { ...micro, rda };

  const chartData = buildChartData(rows, microWithRda);
  const withData = chartData.filter((d) => d.pct > 0);
  const avg4w = withData.length > 0
    ? Math.round(withData.slice(-4).reduce((s, d) => s + d.pct, 0) / Math.min(withData.slice(-4).length, 4))
    : 0;
  const trend = getTrend(chartData);
  const hasAnyData = withData.length > 0;

  return (
    <div className="card p-5 mt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="section-label mb-2">Tendencias Pro</p>
          <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">
            Evolución de micros
          </h2>
        </div>
        {hasAnyData && (
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-brand-500" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
              {trend === 'flat' && <Minus className="w-4 h-4 text-surface-400" />}
              <span className={`text-sm font-semibold ${
                trend === 'up' ? 'text-brand-600'
                : trend === 'down' ? 'text-red-500'
                : 'text-surface-500'
              }`}>
                {trend === 'up' ? 'Mejorando' : trend === 'down' ? 'Bajando' : 'Estable'}
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-0.5">últimas 4 semanas</p>
          </div>
        )}
      </div>

      {/* Selector de micronutriente */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
        {MICROS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selected === m.key
                ? 'bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgba(22,163,74,0.5)]'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Stat destacado */}
      {hasAnyData && (
        <div className="flex items-center gap-4 mb-5">
          <div className="metric-tile flex-1 text-center py-3">
            <div
              className="font-display text-3xl font-bold"
              style={{ color: getBarColor(Math.min(avg4w, 100)) }}
            >
              {avg4w > 200 ? '>200%' : `${avg4w}%`}
            </div>
            <div className="text-[11px] text-surface-500 uppercase tracking-[0.18em] mt-1">
              Media 4 semanas
            </div>
          </div>
          <div className="metric-tile flex-1 text-center py-3">
            <div className="font-display text-3xl font-bold text-surface-700">
              {microWithRda.rda}{microWithRda.unit}
            </div>
            <div className="text-[11px] text-surface-500 uppercase tracking-[0.18em] mt-1">
              Objetivo diario
            </div>
          </div>
        </div>
      )}

      {/* Gráfica */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !hasAnyData ? (
        <div className="h-48 flex flex-col items-center justify-center text-surface-400">
          <span className="text-3xl mb-2">{micro.emoji}</span>
          <p className="text-sm font-medium">Sin datos suficientes aún</p>
          <p className="text-xs mt-1 text-center px-8">
            Registra alimentos durante algunas semanas para ver tu evolución
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 220]}
              />
              <Tooltip content={<CustomTooltip micro={microWithRda} />} />
              <ReferenceLine
                y={100}
                stroke="#16a34a"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: 'Objetivo', position: 'right', fontSize: 9, fill: '#16a34a' }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={getBarColor(avg4w)}
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.pct === 0) return <g key={`dot-${cx}-${cy}`} />;
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={getBarColor(payload.pct)}
                      strokeWidth={0}
                    />
                  );
                }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBarColor(avg4w) }} />
              <span className="text-xs text-surface-500">{micro.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-px w-6 border-t border-dashed border-brand-500" />
              <span className="text-xs text-surface-500">Objetivo RDA</span>
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-surface-400 text-center mt-4">
        Incluye aportación de suplementos marcados como tomados
      </p>
    </div>
  );
}
