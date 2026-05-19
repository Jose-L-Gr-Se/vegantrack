import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, Radius, Colors } from '@/theme';
import type { MealGroup } from '@/types';

interface Props {
  group: MealGroup;
  onAddFood: (mealType: MealGroup['type']) => void;
  onDeleteEntry: (entryId: string) => void;
}

export function MealSection({ group, onAddFood, onDeleteEntry }: Props) {
  const theme = useTheme();
  const hasEntries = group.entries.length > 0;
  const mealCalories = Math.round(group.totals.calories);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{group.icon}</Text>
          <Text style={[styles.mealLabel, { color: theme.text.primary }]}>
            {group.label}
          </Text>
        </View>
        {hasEntries && (
          <Text style={[styles.mealCalories, { color: theme.text.secondary }]}>
            {mealCalories} kcal
          </Text>
        )}
      </View>

      {/* entries */}
      {hasEntries ? (
        <View style={styles.entriesList}>
          {group.entries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.entryRow, { borderTopColor: theme.border.subtle }]}
            >
              <View style={styles.entryInfo}>
                <Text
                  style={[styles.entryName, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {entry.food_name}
                </Text>
                <Text style={[styles.entryMeta, { color: theme.text.secondary }]}>
                  {entry.serving_size_g}g
                  {entry.brand ? ` · ${entry.brand}` : ''}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={[styles.entryCalories, { color: theme.text.primary }]}>
                  {Math.round(entry.calories)}
                </Text>
                <Text style={[styles.entryUnit, { color: theme.text.tertiary }]}>kcal</Text>
                <TouchableOpacity
                  onPress={() => onDeleteEntry(entry.id)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
          Sin registros
        </Text>
      )}

      {/* add button */}
      <TouchableOpacity
        style={[styles.addButton, { borderColor: theme.border.default }]}
        onPress={() => onAddFood(group.type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.addButtonText, { color: theme.action.primary }]}>
          + Añadir alimento
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  mealLabel: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.base,
  },
  mealCalories: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
  },
  entriesList: {
    paddingHorizontal: Spacing.base,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  entryInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  entryName: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
  },
  entryMeta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryCalories: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  entryUnit: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
    padding: 2,
  },
  emptyText: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  addButton: {
    margin: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
  },
});
