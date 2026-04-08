import { useEffect, useState, useCallback } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { supabase } from '@/lib/supabase';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Leaf, X,
  Save, Info, ChevronDown, Flame, Copy,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { SupplementsWidget } from '@/features/diary/SupplementsWidget';
import type { FoodLogEntry, MealType } from '@/types';
import { usePro } from '@/hooks/usePro';
import { ProModal } from '@/features/pro/ProModal';

const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Desayuno' },
  { type: 'lunch', label: 'Comida' },
  { type: 'dinner', label: 'Cena' },
  { type: 'snack', label: 'Snacks' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Hoy';
  if (date.getTime() === yesterday.getTime()) return 'Ayer';

  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getWeekDays(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(y, m - 1, d + mondayOffset);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    days.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
    );
  }
  return days;
}

const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DiaryPageProps {
  successMessage?: string | null;
  onMessageShown?: () => void;
}

export function DiaryPage({ successMessage, onMessageShown }: DiaryPageProps) {
  const { user, profile } = useAuthStore();
  const { entries, selectedDate, setDate, fetchEntries, deleteEntry, getDaySummary, copyDayEntries } = useDiaryStore();
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [showMacroDetail, setShowMacroDetail] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCopySheet, setShowCopySheet] = useState(false);
  const [copyBanner, setCopyBanner] = useState<string | null>(null);
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const { isPro } = usePro();
  const [showProModal, setShowProModal] = useState(false);

  const FREE_HISTORY_DAYS = 14;
  const oldestFreeDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - FREE_HISTORY_DAYS);
    return d.toISOString().split('T')[0];
  })();
  const isDateLocked = !isPro && selectedDate < oldestFreeDate;

  const todayStr = new Date().toISOString().split('T')[0];
  const weekDays = getWeekDays(selectedDate);

  const fetchWeekDates = useCallback(async (week: string[]) => {
    if (!user) return;
    const { data } = await supabase
      .from('food_log')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', week[0])
      .lte('date', week[6]);
    if (data) {
      setDatesWithData(new Set(data.map((r: { date: string }) => r.date)));
    }
  }, [user?.id]);

  useEffect(() => {
    if (showCalendar) fetchWeekDates(weekDays);
  }, [showCalendar, weekDays[0], user?.id]);

  useEffect(() => {
    if (user) fetchEntries(user.id, selectedDate);
  }, [user?.id, selectedDate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchEntries(user.id, selectedDate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, selectedDate]);

  useEffect(() => {
    if (successMessage && onMessageShown) {
      const t = setTimeout(onMessageShown, 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (!copyBanner) return;
    const t = setTimeout(() => setCopyBanner(null), 3500);
    return () => clearTimeout(t);
  }, [copyBanner]);

  const summary = getDaySummary();
  const calorieTarget = profile?.calorie_target || 2000;
  const getEntriesForMeal = (type: MealType) => entries.filter((e) => e.meal_type === type);

  const handleCopySuccess = (count: number, fromDate: string) => {
    setShowCopySheet(false);
    const label = formatDate(fromDate).toLowerCase();
    setCopyBanner(`${count} alimentos copiados de ${label} OK`);
  };

  return (
    <div className="pb-32 px-4 pt-6">
      {successMessage && (
        <div className="mb-4 card text-brand-700 text-sm px-4 py-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {copyBanner && (
        <div className="mb-4 card text-brand-700 text-sm px-4 py-3 flex items-center gap-2">
          <Copy className="w-4 h-4 flex-shrink-0" />
          <span>{copyBanner}</span>
        </div>
      )}

      <div className="page-shell mb-6 px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const prev = shiftDate(selectedDate, -1);
              if (!isPro && prev < oldestFreeDate) {
                setShowProModal(true);
              } else {
                setDate(prev);
              }
            }}
            aria-label="Dia anterior"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 ${
              !isPro && shiftDate(selectedDate, -1) < oldestFreeDate
                ? 'text-surface-200'
                : 'text-surface-500'
            }`} />
          </button>
          <button onClick={() => setShowCalendar((v) => !v)} className="text-center">
            <p className="section-label mb-1">Diario</p>
            <h1 className="font-display text-[2rem] font-bold tracking-[-0.05em] capitalize flex items-center gap-1 justify-center leading-none">
              {formatDate(selectedDate)}
              <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
            </h1>
            <p className="text-xs text-surface-400 mt-2">{selectedDate}</p>
          </button>
          <button
            onClick={() => setDate(shiftDate(selectedDate, 1))}
            aria-label="Dia siguiente"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-4 px-1">
          <div>
            {profile && profile.streak_count > 0 && (
              <div className="status-pill">
                <Flame className="w-3 h-3" />
                {profile.streak_count === 1 ? 'Primer dia' : `${profile.streak_count} dias`}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCopySheet(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copiar dia
          </button>
        </div>

        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: showCalendar ? '80px' : '0px', opacity: showCalendar ? 1 : 0 }}
        >
          <div className="flex items-center justify-between mt-4 px-1">
            <button
              onClick={() => setDate(shiftDate(weekDays[0], -7))}
              aria-label="Semana anterior"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-surface-400" />
            </button>
            <div className="flex gap-1 flex-1 justify-around">
              {weekDays.map((day, i) => {
                const dayNum = parseInt(day.split('-')[2]);
                const isSelected = day === selectedDate;
                const isToday = day === todayStr;
                const hasData = datesWithData.has(day);
                const isLocked = !isPro && day < oldestFreeDate;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (isLocked) { setShowProModal(true); return; }
                      setDate(day);
                    }}
                    className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-[32px] rounded-xl transition-colors"
                  >
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-brand-600' : 'text-surface-400'}`}>{DAY_INITIALS[i]}</span>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isSelected ? 'bg-brand-500 text-white' : isLocked ? 'text-surface-200' : isToday ? 'bg-brand-50 text-brand-700' : 'text-surface-700 hover:bg-surface-100'
                    }`}>
                      {dayNum}
                    </span>
                    <span className="h-1 flex items-center justify-center">
                      {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-brand-500" />}
                      {hasData && !isSelected && !isToday && <span className="w-1 h-1 rounded-full bg-surface-300" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setDate(shiftDate(weekDays[6], 1))}
              aria-label="Semana siguiente"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
            </button>
          </div>
        </div>
      </div>

      {isDateLocked && (
        <div className="card p-6 mb-5 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">LOCK</span>
          </div>
          <h3 className="font-display text-lg font-bold text-surface-900 mb-1">Historial limitado a 14 dias</h3>
          <p className="text-sm text-surface-500 mb-4 leading-relaxed">Con el Plan Pro accedes a todo tu historial sin limite de dias.</p>
          <button onClick={() => setShowProModal(true)} className="btn-primary inline-flex items-center gap-2 mx-auto">
            <span>Ver planes Pro</span>
          </button>
        </div>
      )}

      {!isDateLocked && (
        <>
          <button onClick={() => setShowMacroDetail(true)} className="card p-5 mb-5 w-full text-left">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="section-label mb-2">Balance diario</p>
                <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-surface-900">Resumen nutricional</h2>
                <p className="text-sm text-surface-500 mt-2">Pulsa para ver el detalle completo de macros y calorias.</p>
              </div>
              <div className="status-pill whitespace-nowrap"><Info className="w-3.5 h-3.5" />Detalle</div>
            </div>
            <div className="flex items-center gap-5">
              <ProgressRing value={summary.calories} max={calorieTarget} size={120} strokeWidth={10}>
                <span className="font-display text-2xl font-bold">{Math.round(summary.calories)}</span>
                <span className="text-[10px] text-surface-500 -mt-0.5">/ {calorieTarget}</span>
                <span className="text-[10px] text-surface-400">kcal</span>
              </ProgressRing>
              <div className="flex-1 space-y-3">
                <MacroBar label="Proteina" value={summary.protein_g} target={profile?.protein_target_g || 120} color="#3b82f6" />
                <MacroBar label="Carbos" value={summary.carbs_g} target={profile?.carbs_target_g || 250} color="#f59e0b" />
                <MacroBar label="Grasas" value={summary.fat_g} target={profile?.fat_target_g || 65} color="#ef4444" />
              </div>
            </div>
            <div className="soft-divider my-4" />
            <div className="flex items-center justify-center gap-1">
              {calorieTarget - summary.calories > 0 ? (
                <p className="text-sm text-surface-500">Te quedan <span className="font-semibold text-brand-600">{Math.round(calorieTarget - summary.calories)} kcal</span></p>
              ) : summary.calories > 0 ? (
                <p className="text-sm text-red-500">Excedido por <span className="font-semibold">{Math.round(summary.calories - calorieTarget)} kcal</span></p>
              ) : null}
              <Info className="w-3 h-3 text-surface-300" />
            </div>
          </button>

          {showMacroDetail && <MacroDetailModal summary={summary} profile={profile} entries={entries} onClose={() => setShowMacroDetail(false)} />}

          {editingEntry && (
            <EditEntryModal
              entry={editingEntry}
              onClose={() => setEditingEntry(null)}
              onSaved={() => {
                setEditingEntry(null);
                if (user) fetchEntries(user.id, selectedDate);
              }}
            />
          )}

          {showCopySheet && <CopyDaySheet selectedDate={selectedDate} onClose={() => setShowCopySheet(false)} onCopied={handleCopySuccess} />}

          <div className="mt-5">
            <SupplementsWidget date={selectedDate} />
          </div>

          {entries.length === 0 && (
            <div className="card p-5 mb-4 text-center">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-surface-900 mb-1">Empieza a registrar</h3>
              <p className="text-sm text-surface-500 mb-4 leading-relaxed">Escanea un codigo de barras, busca un alimento o copia tus comidas de otro dia.</p>
              <div className="flex flex-col gap-2 items-center">
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-search'))} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Anadir primer alimento
                </button>
                <button onClick={() => setShowCopySheet(true)} className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <Copy className="w-4 h-4" /> Copiar de otro dia
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {MEALS.map((meal) => {
              const mealEntries = getEntriesForMeal(meal.type);
              const mealCalories = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0);
              return (
                <div key={meal.type} className="card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{meal.label}</span>
                      {mealEntries.length > 0 && <span className="status-pill py-1 px-2.5 text-[10px] font-mono">{Math.round(mealCalories)} kcal</span>}
                    </div>
                    <button
                      onClick={() => { window.dispatchEvent(new CustomEvent('navigate-search', { detail: meal.type })); }}
                      aria-label={`Anadir a ${meal.label}`}
                      className="icon-badge w-10 h-10 rounded-2xl text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                  {mealEntries.length === 0 ? (
                    <div className="px-4 pb-5 pt-1 text-center text-sm text-surface-400 border-t border-surface-50">Sin alimentos registrados</div>
                  ) : (
                    <div className="divide-y divide-surface-50 border-t border-surface-100">
                      {mealEntries.map((entry) => <FoodEntry key={entry.id} entry={entry} onDelete={deleteEntry} onEdit={setEditingEntry} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}

interface DayData {
  log_date: string;
  entry_count: number;
  total_calories: number;
}

function CopyDaySheet({ selectedDate, onClose, onCopied }: { selectedDate: string; onClose: () => void; onCopied: (count: number, fromDate: string) => void; }) {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copyDayEntries } = useDiaryStore();

  useBackHandler(true, onClose);
  const { sheetRef, backdropRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss({ onDismiss: onClose });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    supabase.rpc('get_days_with_data', { p_limit: 30 }).then(({ data, error: rpcError }) => {
      if (rpcError) {
        setError('No se pudieron cargar los dias anteriores.');
      } else {
        const filtered = (data ?? []).filter((d: DayData) => d.log_date !== selectedDate);
        setDays(filtered);
      }
      setLoading(false);
    });
    return () => { document.body.style.overflow = ''; };
  }, [selectedDate]);

  const handleCopy = async (fromDate: string) => {
    setCopying(fromDate);
    setError(null);
    const { count, error: copyError } = await copyDayEntries(fromDate, selectedDate);
    setCopying(null);
    if (copyError) setError('Error al copiar. Intentalo de nuevo.');
    else if (count === 0) setError('Ese dia no tiene alimentos para copiar.');
    else onCopied(count, fromDate);
  };

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    if (date.getTime() === yesterday.getTime()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        ref={sheetRef}
        className="card w-full rounded-t-[2rem] overflow-y-auto pb-10 max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white/90 rounded-t-[2rem] backdrop-blur-xl">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="section-label mb-1">Copiar al diario</p>
              <h3 className="font-display text-xl font-bold text-surface-900">De que dia copias?</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="icon-badge w-9 h-9">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>
          <p className="text-xs text-surface-400 mb-5 leading-relaxed">Se copiaran todos los alimentos de ese dia a <strong className="text-surface-600">{formatDate(selectedDate).toLowerCase()}</strong>.</p>
          {loading && <div className="flex items-center justify-center py-12"><Spinner className="text-brand-500 w-6 h-6" /></div>}
          {!loading && error && <div className="text-center py-8"><p className="text-sm text-red-500">{error}</p></div>}
          {!loading && !error && days.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Copy className="w-5 h-5 text-surface-300" /></div>
              <p className="text-sm text-surface-500 font-medium">Sin dias anteriores con datos</p>
              <p className="text-xs text-surface-400 mt-1">Registra alimentos varios dias para poder copiarlos.</p>
            </div>
          )}
          {!loading && days.length > 0 && (
            <div className="space-y-2">
              {days.map((day) => (
                <button
                  key={day.log_date}
                  onClick={() => handleCopy(day.log_date)}
                  disabled={copying !== null}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all text-left disabled:opacity-60 active:scale-[0.98]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 capitalize">{formatDayLabel(day.log_date)}</p>
                    <p className="text-xs text-surface-400 mt-0.5 font-mono">{day.entry_count} alimentos · {Math.round(day.total_calories)} kcal</p>
                  </div>
                  {copying === day.log_date ? <Spinner className="text-brand-500 w-4 h-4 flex-shrink-0" /> : <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 flex-shrink-0"><Copy className="w-4 h-4" /></div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodEntry({ entry, onDelete, onEdit }: { entry: FoodLogEntry; onDelete: (id: string) => void; onEdit: (entry: FoodLogEntry) => void; }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <button onClick={() => onEdit(entry)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {entry.image_url ? <img src={entry.image_url} alt="" className="w-11 h-11 rounded-2xl object-cover bg-surface-100" /> : <div className="w-11 h-11 rounded-2xl bg-surface-100 flex items-center justify-center flex-shrink-0"><Leaf className="w-4 h-4 text-surface-400" /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-800 truncate">{entry.food_name}</p>
          <p className="text-xs text-surface-400 mt-1">{entry.serving_size_g}g{entry.brand && ` · ${entry.brand}`}</p>
        </div>
      </button>
      <div className="text-right flex-shrink-0 min-w-[68px]">
        <p className="text-sm font-semibold font-mono tabular-nums">{Math.round(entry.calories)}</p>
        <p className="text-[10px] text-surface-400 font-mono tabular-nums mt-1">P{Math.round(entry.protein_g)} C{Math.round(entry.carbs_g)} G{Math.round(entry.fat_g)}</p>
      </div>
      {confirming ? (
        <button onClick={() => { onDelete(entry.id); setConfirming(false); }} aria-label="Confirmar eliminacion" className="w-8 h-8 flex items-center justify-center rounded-xl text-red-600 bg-red-50 transition-all flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
      ) : (
        <button onClick={() => setConfirming(true)} onBlur={() => setTimeout(() => setConfirming(false), 2000)} aria-label="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );
}

function EditEntryModal({ entry, onClose, onSaved }: { entry: FoodLogEntry; onClose: () => void; onSaved: () => void; }) {
  const originalRatio = entry.serving_size_g / 100;
  const caloriesPer100g = originalRatio > 0 ? entry.calories / originalRatio : 0;
  const proteinPer100g = originalRatio > 0 ? entry.protein_g / originalRatio : 0;
  const carbsPer100g = originalRatio > 0 ? entry.carbs_g / originalRatio : 0;
  const fatPer100g = originalRatio > 0 ? entry.fat_g / originalRatio : 0;
  const fiberPer100g = originalRatio > 0 ? entry.fiber_g / originalRatio : 0;
  const sugarPer100g = originalRatio > 0 ? entry.sugar_g / originalRatio : 0;
  const satFatPer100g = originalRatio > 0 ? entry.saturated_fat_g / originalRatio : 0;
  const sodiumPer100g = originalRatio > 0 ? entry.sodium_mg / originalRatio : 0;
  const [gramsInput, setGramsInput] = useState(String(entry.serving_size_g));
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useBackHandler(true, onClose);
  const { sheetRef: editSheetRef, backdropRef: editBackdropRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss({ onDismiss: onClose });

  const grams = Math.max(1, parseInt(gramsInput) || 0);
  const ratio = grams / 100;

  const handleSave = async () => {
    if (grams <= 0) return;
    setSaving(true);
    const { error } = await supabase.from('food_log').update({
      serving_size_g: grams,
      calories: Math.round(caloriesPer100g * ratio),
      protein_g: Math.round(proteinPer100g * ratio * 10) / 10,
      carbs_g: Math.round(carbsPer100g * ratio * 10) / 10,
      fat_g: Math.round(fatPer100g * ratio * 10) / 10,
      fiber_g: Math.round(fiberPer100g * ratio * 10) / 10,
      sugar_g: Math.round(sugarPer100g * ratio * 10) / 10,
      saturated_fat_g: Math.round(satFatPer100g * ratio * 10) / 10,
      sodium_mg: Math.round(sodiumPer100g * ratio),
    }).eq('id', entry.id);
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div ref={editBackdropRef} className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center" onClick={onClose}>
      <div ref={editSheetRef} className="card w-full mt-8 rounded-t-[2rem] overflow-y-auto pb-24" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white/90 rounded-t-[2rem] backdrop-blur-xl"><div className="w-10 h-1 bg-surface-300 rounded-full" /></div>
        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {entry.image_url ? <img src={entry.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" /> : <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Leaf className="w-4 h-4 text-brand-400" /></div>}
              <div>
                <h3 className="font-display font-bold text-surface-900">{entry.food_name}</h3>
                {entry.brand && <p className="text-xs text-surface-400">{entry.brand}</p>}
              </div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button>
          </div>
          <div>
            <label className="label">Cantidad (gramos)</label>
            <input type="number" value={gramsInput} onChange={(e) => setGramsInput(e.target.value)} onBlur={() => { if (!gramsInput || parseInt(gramsInput) <= 0) setGramsInput(String(entry.serving_size_g)); }} className="input font-mono" inputMode="numeric" />
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200].map((g) => (
                <button key={g} onClick={() => setGramsInput(String(g))} className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${grams === g ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500'}`}>{g}g</button>
              ))}
            </div>
          </div>
          <div className="page-shell rounded-[1.5rem] p-4 space-y-2">
            <div className="flex justify-between font-semibold"><span>Calorias</span><span className="font-mono">{Math.round(caloriesPer100g * ratio)} kcal</span></div>
            <div className="h-px bg-surface-200" />
            {[
              { label: 'Proteinas', val: proteinPer100g, color: 'text-blue-600' },
              { label: 'Carbohidratos', val: carbsPer100g, color: 'text-amber-600' },
              { label: 'Grasas', val: fatPer100g, color: 'text-rose-600' },
              { label: 'Fibra', val: fiberPer100g, color: 'text-green-600' },
            ].map((item) => <div key={item.label} className="flex justify-between text-sm"><span>{item.label}</span><span className={`font-mono ${item.color}`}>{(item.val * ratio).toFixed(1)}g</span></div>)}
          </div>
          <button onClick={handleSave} disabled={saving || grams <= 0} className="btn-primary w-full flex items-center justify-center gap-2">{saving ? <Spinner className="text-white" /> : <><Save className="w-4 h-4" /> Guardar cambios</>}</button>
        </div>
      </div>
    </div>
  );
}

function MacroDetailModal({ summary, profile, entries, onClose }: { summary: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }; profile: any; entries: FoodLogEntry[]; onClose: () => void; }) {
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useBackHandler(true, onClose);
  const { sheetRef: macroSheetRef, backdropRef: macroBackdropRef, onTouchStart: macroTouchStart, onTouchMove: macroTouchMove, onTouchEnd: macroTouchEnd } = useSwipeToDismiss({ onDismiss: onClose });

  const calorieTarget = profile?.calorie_target || 2000;
  const proteinTarget = profile?.protein_target_g || 120;
  const carbsTarget = profile?.carbs_target_g || 250;
  const fatTarget = profile?.fat_target_g || 65;
  const pct = (val: number, target: number) => target > 0 ? Math.round((val / target) * 100) : 0;

  const mealBreakdown = MEALS.map((meal) => {
    const mealEntries = entries.filter((e) => e.meal_type === meal.type);
    return { ...meal, calories: mealEntries.reduce((s, e) => s + (e.calories || 0), 0), protein: mealEntries.reduce((s, e) => s + (e.protein_g || 0), 0), count: mealEntries.length };
  }).filter((m) => m.count > 0);

  return (
    <div ref={macroBackdropRef} className="fixed inset-0 z-[60] bg-black/40 flex items-stretch justify-center" onClick={onClose}>
      <div ref={macroSheetRef} className="card w-full mt-8 rounded-t-[2rem] overflow-y-auto pb-24" onClick={(e) => e.stopPropagation()} onTouchStart={macroTouchStart} onTouchMove={macroTouchMove} onTouchEnd={macroTouchEnd}>
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white/90 rounded-t-[2rem] backdrop-blur-xl"><div className="w-10 h-1 bg-surface-300 rounded-full" /></div>
        <div className="px-5 pb-5 space-y-5">
          <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">Detalle nutricional</h3><button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100"><X className="w-4 h-4 text-surface-500" /></button></div>
          <div className="text-center"><ProgressRing value={summary.calories} max={calorieTarget} size={140} strokeWidth={12}><span className="font-display text-3xl font-bold">{Math.round(summary.calories)}</span><span className="text-xs text-surface-400">/ {calorieTarget} kcal</span></ProgressRing></div>
          <div className="grid grid-cols-4 gap-3">{[
            { label: 'Proteina', val: summary.protein_g, target: proteinTarget, unit: 'g', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Carbos', val: summary.carbs_g, target: carbsTarget, unit: 'g', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Grasas', val: summary.fat_g, target: fatTarget, unit: 'g', color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Fibra', val: summary.fiber_g, target: 30, unit: 'g', color: 'text-green-600', bg: 'bg-green-50' },
          ].map((m) => <div key={m.label} className={`${m.bg} rounded-2xl p-3 text-center`}><div className={`font-display text-lg font-bold ${m.color}`}>{Math.round(m.val)}{m.unit}</div><div className="text-[10px] text-surface-500 mt-0.5">{m.label}</div><div className={`text-[10px] font-mono mt-0.5 ${pct(m.val, m.target) >= 90 && pct(m.val, m.target) <= 110 ? 'text-brand-600 font-semibold' : pct(m.val, m.target) > 110 ? 'text-red-500' : 'text-surface-400'}`}>{pct(m.val, m.target)}%</div></div>)}</div>
          {mealBreakdown.length > 0 && <div><h4 className="text-sm font-semibold text-surface-600 mb-2">Distribucion por comida</h4><div className="space-y-2">{mealBreakdown.map((meal) => { const pctCal = summary.calories > 0 ? Math.round((meal.calories / summary.calories) * 100) : 0; return <div key={meal.type} className="flex items-center gap-3"><div className="flex-1"><div className="flex justify-between text-sm"><span className="text-surface-700">{meal.label}</span><span className="font-mono text-surface-600">{Math.round(meal.calories)} kcal</span></div><div className="h-1.5 bg-surface-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-brand-400 rounded-full" style={{ width: `${pctCal}%` }} /></div></div><span className="text-xs text-surface-400 w-8 text-right font-mono">{pctCal}%</span></div>; })}</div></div>}
          {summary.calories > 0 && <div><h4 className="text-sm font-semibold text-surface-600 mb-2">Ratio de macros</h4><div className="flex h-4 rounded-full overflow-hidden"><div className="bg-blue-400" style={{ width: `${Math.round((summary.protein_g * 4 / summary.calories) * 100)}%` }} /><div className="bg-amber-400" style={{ width: `${Math.round((summary.carbs_g * 4 / summary.calories) * 100)}%` }} /><div className="bg-rose-400" style={{ width: `${Math.round((summary.fat_g * 9 / summary.calories) * 100)}%` }} /></div><div className="flex justify-between mt-1.5"><span className="text-[10px] text-blue-600 font-mono">{Math.round((summary.protein_g * 4 / summary.calories) * 100)}% P</span><span className="text-[10px] text-amber-600 font-mono">{Math.round((summary.carbs_g * 4 / summary.calories) * 100)}% C</span><span className="text-[10px] text-rose-600 font-mono">{Math.round((summary.fat_g * 9 / summary.calories) * 100)}% G</span></div></div>}
        </div>
      </div>
    </div>
  );
}
