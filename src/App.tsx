import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { AuthPage } from '@/features/auth/AuthPage';
import { OnboardingPage } from '@/features/profile/OnboardingPage';
import { DiaryPage } from '@/features/diary/DiaryPage';
import { SearchPage } from '@/features/search/SearchPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { BottomNav } from '@/components/layout/BottomNav';
import { Spinner } from '@/components/ui/Spinner';
import { Leaf } from 'lucide-react';

export default function App() {
  const { user, profile, initialized, initialize } = useAuthStore();
  const { fetchCustomFoods } = useCustomFoodStore();
  const [activeTab, setActiveTab] = useState('diary');

  useEffect(() => {
    initialize();
  }, []);

  // Reload page when a new service worker takes control (autoUpdate)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  // Fetch custom foods when user is available
  useEffect(() => {
    if (user) fetchCustomFoods(user.id);
  }, [user?.id]);

  // Listen for search navigation from diary
  useEffect(() => {
    const handler = () => setActiveTab('search');
    window.addEventListener('navigate-search', handler);
    return () => window.removeEventListener('navigate-search', handler);
  }, []);

  // Loading screen
  if (!initialized) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-3xl mb-4 shadow-lg shadow-brand-600/20 animate-pulse">
          <Leaf className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-surface-500 text-sm">Cargando...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthPage />;
  }

  // No profile data yet (needs onboarding)
  if (profile && !profile.calorie_target) {
    return <OnboardingPage />;
  }

  // Main app
  return (
    <div className="min-h-dvh bg-surface-50">
      <div className="max-w-lg mx-auto">
        {activeTab === 'diary' && <DiaryPage />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'profile' && <ProfilePage />}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
