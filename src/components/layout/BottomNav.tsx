import { Book, Search, BarChart3, TrendingUp, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'diary', label: 'Diario', Icon: Book },
  { id: 'search', label: 'Buscar', Icon: Search },
  { id: 'dashboard', label: 'Resumen', Icon: BarChart3 },
  { id: 'progress', label: 'Progreso', Icon: TrendingUp },
  { id: 'profile', label: 'Perfil', Icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-lg mx-auto rounded-[2rem] border border-white/80 bg-white/75 px-2 py-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
        <div className="flex items-center justify-around pb-safe">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2.5 rounded-[1.35rem] transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
                    : 'text-surface-400 hover:text-surface-600'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive ? 'bg-white/80' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isActive ? 'text-brand-700' : 'text-surface-500'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
