import { useState, useEffect } from 'react';
import { Book, Search, BarChart3, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'diary', label: 'Diario', Icon: Book },
  { id: 'search', label: 'Buscar', Icon: Search },
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { id: 'profile', label: 'Perfil', Icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-surface-100">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pb-safe">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-4 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-600'
                  : 'text-surface-400 hover:text-surface-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-brand-50' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-brand-600' : 'text-surface-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
