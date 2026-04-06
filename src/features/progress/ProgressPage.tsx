import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Scale, Plus, Trash2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useWeightStore } from '@/stores/weightStore';
import { useAuthStore } from '@/stores/authStore';

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
];

export function ProgressPage() {
  const { user } = useAuthStore();
  const { logs, loading, fetchLogs, addLog, deleteLog, getChartData, getStats } = useWeightStore();

  const [period, setPeriod] = useState(30);
  const [inputWeight, setInputWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) fetchLogs(user.id);
  }, [user?.id]);

  const todayLog = logs.find((l) => l.date === today);
  const chartData = getChartData(period);
  const stats = getStats();
  const hasData = chartData.some((d) => d.weight !== null);

  const handleSave = async () => {
    if (!user || !inputWeight.trim()) return;
    const kg = parseFloat(inputWeight.replace(',', '.'));
    if (isNaN(kg) || kg < 20 || kg > 300) {
      setErrorMsg('Introduce un peso valido entre 20 y 300 kg');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    const { error } = await addLog(user.id, today, kg);
    if (error) {
      setErrorMsg(error);
    } else {
      setInputWeight('');
      setSuccessMsg(todayLog ? 'Peso actualizado ✓' : 'Peso registrado ✓');
      setTimeout(() => setSuccessMsg(null), 2500);
    }
    setSaving(false);
  };

  return (
    <div className="pb-32 px-4 pt-6">
      <SectionHeader
        title="Progreso"
        subtitle="Registra y visualiza tu evolución"
        action={
          <div className="icon-badge">
            <Scale className="w-5 h-5 text-brand-600" />
          </div>
        }
      />

      <div className="page-shell p-5 mb-4">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="section-label mb-2">Registro rapido</p>
              <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">
                {todayLog ? 'Peso de hoy' : 'Registrar peso'}
              </h2>
            </div>
            {todayLog && <span className="status-pill font-mono">{todayLog.weight_kg} kg</span>}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="20"
              max="300"
              step="0.1"
              placeholder={todayLog ? `Actualizar (${todayLog.weight_kg} kg)` : 'Tu peso en kg, ej: 72.5'}
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="input flex-1"
            />
            <button
              onClick={handleSave}
              disabled={saving || !inputWeight.trim()}
              className="btn-primary flex items-center gap-1.5 px-4"
            >
              <Plus className="w-4 h-4" />
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-xs mt-3">{errorMsg}</p>}
          {successMsg && <p className="text-brand-600 text-xs mt-3 font-medium">{successMsg}</p>}
        </div>
      </div>

      {stats.current !== null && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Actual" value={`${stats.current}kg`} colorClass="text-brand-700" />
          <StatCard label="Minimo" value={`${stats.min}kg`} colorClass="text-blue-700" />
          <StatCard label="Maximo" value={`${stats.max}kg`} colorClass="text-amber-700" />
          <StatCard
            label="Cambio"
            value={stats.change !== null ? `${stats.change > 0 ? '+' : ''}${stats.change}kg` : '-'}
            colorClass={
              stats.change === null
                ? 'text-surface-700'
                : stats.change < 0
                  ? 'text-brand-600'
                  : stats.change > 0
                    ? 'text-red-500'
                    : 'text-surface-700'
            }
            icon={
              stats.change !== null ? (
                stats.change < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                ) : stats.change > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                ) : undefined
              ) : undefined
            }
          />
        </div>
      )}

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-2">Evolución</p>
            <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Tendencia de peso</h2>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  period === p.days
                    ? 'bg-brand-600 text-white'
                    : 'text-surface-500 hover:bg-surface-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-surface-400">
            <Scale className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">Sin datos todavia</p>
            <p className="text-xs mt-1 text-center">
              Registra tu primer peso arriba para ver tu grafico
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    val != null ? `${val} kg` : '-',
                    name === 'weight' ? 'Peso' : 'Media 7 dias',
                  ]}
                  labelStyle={{ fontSize: 11, color: '#334155' }}
                  contentStyle={{
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 18px 40px -28px rgba(15,23,42,0.35)',
                    backgroundColor: 'rgba(255,255,255,0.94)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#16a34a', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg7"
                  stroke="#86efac"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  strokeDasharray="5 4"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-brand-600" />
                <span className="text-xs text-surface-500">Peso registrado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 border-t-2 border-dashed border-brand-300" />
                <span className="text-xs text-surface-500">Media 7 dias</span>
              </div>
            </div>
          </>
        )}
      </div>

      {logs.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-4 border-b border-surface-100">
            <p className="section-label mb-2">Historial</p>
            <span className="text-sm font-semibold text-surface-700">{logs.length} registros</span>
          </div>
          {[...logs]
            .reverse()
            .slice(0, 20)
            .map((log, idx, arr) => {
              const prev = arr[idx + 1];
              const diff =
                prev != null
                  ? Math.round((log.weight_kg - prev.weight_kg) * 10) / 10
                  : null;
              return (
                <div
                  key={log.id}
                  className="flex items-center px-4 py-3 border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-surface-800">{log.weight_kg} kg</span>
                      {diff !== null && diff !== 0 && (
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            diff < 0
                              ? 'text-brand-700 bg-brand-100'
                              : 'text-red-600 bg-red-50'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff} kg
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-surface-400 mt-1">
                      {new Date(log.date + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="icon-badge w-9 h-9 text-surface-300 hover:text-red-400 transition-colors"
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="metric-tile text-center">
      <div className={`flex items-center justify-center gap-1 min-h-[22px] ${colorClass}`}>
        {icon}
        <span className="text-base font-display font-bold truncate">{value}</span>
      </div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-surface-500 mt-2 leading-tight">{label}</div>
    </div>
  );
}
