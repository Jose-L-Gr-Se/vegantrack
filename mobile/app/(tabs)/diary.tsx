import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/theme';

export default function DiaryScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Diary</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Próximamente</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  title: { fontFamily: Typography.fonts.sansBold, fontSize: Typography.sizes['2xl'], marginBottom: Spacing.sm },
  subtitle: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base },
});
