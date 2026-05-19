import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, Typography, Radius } from '@/theme';

interface MacroItem {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color: string;
}

interface Props {
  protein: { consumed: number; target: number };
  carbs:   { consumed: number; target: number };
  fat:     { consumed: number; target: number };
}

export function MacroBar({ protein, carbs, fat }: Props) {
  const theme = useTheme();

  const macros: MacroItem[] = [
    { label: 'Proteína', unit: 'g', color: '#818cf8', ...protein },
    { label: 'Carbos',   unit: 'g', color: '#fb923c', ...carbs },
    { label: 'Grasa',    unit: 'g', color: Colors.brand[500], ...fat },
  ];

  return (
    <View style={styles.container}>
      {macros.map((macro) => {
        const ratio = macro.target > 0
          ? Math.min(macro.consumed / macro.target, 1)
          : 0;

        return (
          <View key={macro.label} style={styles.macroItem}>
            {/* numbers */}
            <View style={styles.row}>
              <Text style={[styles.value, { color: theme.text.primary }]}>
                {Math.round(macro.consumed)}
                <Text style={[styles.unit, { color: theme.text.secondary }]}>
                  {macro.unit}
                </Text>
              </Text>
              <Text style={[styles.target, { color: theme.text.tertiary }]}>
                /{macro.target}{macro.unit}
              </Text>
            </View>

            {/* track */}
            <View style={[styles.track, { backgroundColor: theme.border.default }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: macro.color,
                    width: `${ratio * 100}%`,
                    opacity: ratio > 1 ? 0.6 : 1,
                  },
                ]}
              />
            </View>

            {/* label */}
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              {macro.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  macroItem: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.base,
  },
  unit: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  target: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  track: {
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  label: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
});
