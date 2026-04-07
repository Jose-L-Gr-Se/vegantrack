import { useEffect, useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuthStore } from '@/stores/authStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { AuthPage } from '@/features/auth/AuthPage';
import { OnboardingPage } from '@/features/profile/OnboardingPage';
import { DiaryPage } from '@/features/diary/DiaryPage';
import { SearchPage } from '@/features/search/SearchPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { BottomNav } from '@/components/layout/BottomNav';
import { RecipesPage } from '@/features/recipes/RecipesPage';
import { useRecipeStore } from '@/stores/recipeStore';
import { useSupplementStore } from '@/stores/supplementStore';
import { Spinner } from '@/components/ui/Spinner';
import { AppLogo } from '@/components/ui/AppLogo';
import { ProSuccessModal } from '@/features/pro/ProSuccessModal';

export default function App() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { user, profile, initialized, initialize } = useAuthStore();
  const { fetchCustomFoods } = useCustomFoodStore();
  const [activeTab, setActiveTab] = useState('diary');
  const [showLanding, setShowLanding] = useState(true);
  const [diaryMessage, setDiaryMessage] = useState<string | null>(null);
  const [searchSubview, setSearchSubview] = useState<'main' | 'recipes'>('main');
  const [showProSuccess, setShowProSuccess] = useState(false);
  const { fetchRecipes } = useRecipeStore();
  const { fetchSupplements, fetchTodayLogs } = useSupplementStore();
  const { selectedDate } = useDiaryStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    useDiaryStore.getState().loadOverrides();
  }, []);

  // Reload page when a new service worker takes control (autoUpdate)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
  }, []);

  // Fetch custom foods when user is available
  useEffect(() => {
    if (user) fetchCustomFoods(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchRecipes(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchSupplements(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchTodayLogs(user.id, selectedDate);
  }, [user?.id, selectedDate]);

  // Listen for search navigation from diary
  useEffect(() => {
    const handler = () => setActiveTab('search');
    window.addEventListener('navigate-search', handler);
    return () => window.removeEventListener('navigate-search', handler);
  }, []);

  // Volver al Diario tras añadir un alimento desde Search
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setActiveTab('diary');
      setDiaryMessage(e.detail?.message ?? null);
    };
    window.addEventListener('navigate-diary', handler as EventListener);
    return () => window.removeEventListener('navigate-diary', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => {
      setActiveTab('search');
      setSearchSubview('recipes');
    };
    window.addEventListener('navigate-recipes', handler);
    return () => window.removeEventListener('navigate-recipes', handler);
  }, []);

  // Detectar vuelta desde Stripe y recargar perfil
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pro') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      if (user) {
        useAuthStore.getState().fetchProfile().then(() => {
          setActiveTab('profile');
          setShowProSuccess(true);
        });
      }
    }
  }, [user]);

  // Loading screen
  if (!initialized) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="page-shell px-8 py-10 text-center">
          <AppLogo className="w-16 h-16 mb-4 mx-auto animate-pulse shadow-lg shadow-brand-600/20 rounded-3xl" />
          <p className="section-label mb-2">VEGANTRACK</p>
          <h1 className="font-display text-2xl font-bold text-surface-900 mb-2">Preparando tu panel</h1>
          <p className="text-surface-500 text-sm">Cargando tus datos y dejando todo listo.</p>
        </div>
      </div>
    );
  }

  // Usuario logueado → va directo a la app, sin landing
  if (user) {
    if (profile && !profile.calorie_target) {
      return <OnboardingPage />;
    }
    return (
      <div className="min-h-dvh">
        <main className="relative z-10 max-w-lg mx-auto" role="main" aria-label="Contenido principal">
          {activeTab === 'diary' && (
          <DiaryPage
            successMessage={diaryMessage}
            onMessageShown={() => setDiaryMessage(null)}
          />
        )}
          {activeTab === 'search' && (
            searchSubview === 'recipes'
              ? <RecipesPage onBack={() => setSearchSubview('main')} />
              : <SearchPage />
          )}
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'progress' && <ProgressPage />}
          {activeTab === 'profile' && <ProfilePage isDark={isDark} onToggleDark={toggleDark} />}
        </main>
        {showProSuccess && <ProSuccessModal onClose={() => setShowProSuccess(false)} />}
        <BottomNav activeTab={activeTab} onTabChange={(tab) => {
          if (tab === 'search') setSearchSubview('main');
          setActiveTab(tab);
        }} />
      </div>
    );
  }

  // Usuario no logueado → landing o auth
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return <AuthPage />;
}
