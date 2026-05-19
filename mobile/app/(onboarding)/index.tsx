import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/theme';

// Placeholder — will be expanded in Phase 2
export default function OnboardingScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <Text style={[styles.text, { color: theme.text.primary }]}>Onboarding — Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  text: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.md,
  },
});
