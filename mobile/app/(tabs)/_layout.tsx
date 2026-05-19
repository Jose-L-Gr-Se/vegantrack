import { Tabs } from 'expo-router';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { DarkTheme, LightTheme, Spacing } from '@/theme';

// Tab icons — minimal, custom SVG-style using unicode for now
// Will be replaced with a proper icon set in Phase 2
function TabIcon({ focused, children }: { focused: boolean; children: string }) {
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? LightTheme : DarkTheme;

  return (
    <View style={[styles.iconWrapper, focused && styles.iconActive]}>
      <View style={{ opacity: focused ? 1 : 0.5 }}>
        {/* placeholder — will be replaced with Lucide/custom icons */}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? LightTheme : DarkTheme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tab.background,
          borderTopColor: theme.border.default,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tab.active,
        tabBarInactiveTintColor: theme.tab.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'DMSans_500Medium',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="diary"
        options={{ title: 'Diario' }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Buscar' }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Resumen' }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progreso' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    padding: Spacing.xs,
    borderRadius: 8,
  },
  iconActive: {
    // subtle active state — will be styled properly in Phase 2
  },
});
