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
  const { logs, loading, fetchLogs, addLog, deleteLog, getChartData, getStats } =
    useWeightStore();

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
      setErrorMsg('Introduce un peso válido entre 20 y 300 kg');
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
    <div className="pb-28 px-4 pt-6">
      <SectionHeader title="Progreso de peso" subtitle="Registra y visualiza tu evolución" />

      {/* Quick log card */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-5 h-5 text-brand-600" />
          <span className="font-semibold text-surface-800 text-sm">
            {todayLog ? 'Peso de hoy' : 'Registrar peso de hoy'}
          </span>
          {todayLog && (
            <span className="ml-auto text-xl font-bold text-brand-700">
              {todayLog.weight_kg} kg
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="20"
            max="300"
            step="0.1"
            placeholder={
              todayLog ? `Actualizar (${todayLog.weight_kg} kg)` : 'Tu peso en kg, ej: 72.5'
            }
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="input flex-1"
          />
          <button
            onClick={handleSave}
            disabled={saving || !inputWeight.trim()}
            className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brand-700 active:bg-brand-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
        {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
        {successMsg && <p className="text-brand-600 text-xs mt-2 font-medium">{successMsg}</p>}
      </div>

      {/* Stats */}
      {stats.current !== null && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard label="Actual" value={`${stats.current}kg`} colorClass="text-brand-700 bg-brand-50" />
          <StatCard label="Mínimo" value={`${stats.min}kg`} colorClass="text-blue-700 bg-blue-50" />
          <StatCard label="Máximo" value={`${stats.max}kg`} colorClass="text-amber-700 bg-amber-50" />
          <StatCard
            label="Cambio"
            value={
              stats.change !== null
                ? `${stats.change > 0 ? '+' : ''}${stats.change}kg`
                : '-'
            }
            colorClass={
              stats.change === null
                ? 'text-surface-600 bg-surface-50'
                : stats.change < 0
                ? 'text-brand-600 bg-surface-50'
                : stats.change > 0
                ? 'text-red-500 bg-surface-50'
                : 'text-surface-600 bg-surface-50'
            }
            icon={
              stats.change !== null ? (
                stats.change < 0 ? (
                  <TrendingDown className="w-3 h-3 shrink-0" />
                ) : stats.change > 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" />
                ) : undefined
              ) : undefined
            }
          />
        </div>
      )}

      {/* Chart */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-surface-400 uppercase tracking-widest">Evolución</span>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
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
            <p className="text-sm font-medium">Sin datos todavía</p>
            <p className="text-xs mt-1 text-center">
              Registra tu primer peso arriba para ver tu gráfico
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
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
                    name === 'weight' ? 'Peso' : 'Media 7 días',
                  ]}
                  labelStyle={{ fontSize: 11, color: '#334155' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
                <span className="text-xs text-surface-500">Media 7 días</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-surface-100">
            <span className="text-xs font-medium text-surface-400 uppercase tracking-widest">
              Historial ({logs.length} registros)
            </span>
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
                    <div className="text-xs text-surface-400 mt-0.5">
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
                    className="p-2 text-surface-300 hover:text-red-400 transition-colors rounded-xl"
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
    <div className={`rounded-xl p-2 text-center ${colorClass}`}>
      <div className="flex items-center justify-center gap-0.5 min-h-[20px]">
        {icon}
        <span className="text-sm font-bold truncate">{value}</span>
      </div>
      <div className="text-xs opacity-60 mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
