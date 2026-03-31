import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Scale, Plus, Trash2 } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-4 pt-12 pb-8 text-white">
        <h1 className="text-2xl font-bold">Progreso de peso</h1>
        <p className="text-green-100 text-sm mt-1">Registra y visualiza tu evolución</p>
      </div>

      {/* Quick log card */}
      <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-800 text-sm">
            {todayLog ? 'Peso de hoy' : 'Registrar peso de hoy'}
          </span>
          {todayLog && (
            <span className="ml-auto text-xl font-bold text-green-700">
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
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSave}
            disabled={saving || !inputWeight.trim()}
            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
        {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 text-xs mt-2 font-medium">{successMsg}</p>}
      </div>

      {/* Stats */}
      {stats.current !== null && (
        <div className="mx-4 grid grid-cols-4 gap-2 mb-4">
          <StatCard label="Actual" value={`${stats.current}kg`} colorClass="text-green-700 bg-green-50" />
          <StatCard label="Mínimo" value={`${stats.min}kg`} colorClass="text-blue-700 bg-blue-50" />
          <StatCard label="Máximo" value={`${stats.max}kg`} colorClass="text-orange-700 bg-orange-50" />
          <StatCard
            label="Cambio"
            value={
              stats.change !== null
                ? `${stats.change > 0 ? '+' : ''}${stats.change}kg`
                : '-'
            }
            colorClass={
              stats.change === null
                ? 'text-gray-600 bg-gray-50'
                : stats.change < 0
                ? 'text-green-700 bg-green-50'
                : stats.change > 0
                ? 'text-red-600 bg-red-50'
                : 'text-gray-600 bg-gray-50'
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
      <div className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-800 text-sm">Evolución</span>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p.days
                    ? 'bg-green-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    val != null ? `${val} kg` : '-',
                    name === 'weight' ? 'Peso' : 'Media 7 días',
                  ]}
                  labelStyle={{ fontSize: 11, color: '#374151' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
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
                <div className="w-3 h-3 rounded-full bg-green-600" />
                <span className="text-xs text-gray-500">Peso registrado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 border-t-2 border-dashed border-green-300" />
                <span className="text-xs text-gray-500">Media 7 días</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">
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
                  className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{log.weight_kg} kg</span>
                      {diff !== null && diff !== 0 && (
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            diff < 0
                              ? 'text-green-700 bg-green-100'
                              : 'text-red-600 bg-red-50'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff} kg
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
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
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors rounded-lg"
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
