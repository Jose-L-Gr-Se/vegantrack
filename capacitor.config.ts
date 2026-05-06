import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vegantrack.app',
  appName: 'VeganTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#16a34a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // El clientId web se obtiene de Google Cloud Console
      // Configurar también en AndroidManifest como meta-data
      serverClientId: 'REPLACE_WITH_WEB_CLIENT_ID',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
