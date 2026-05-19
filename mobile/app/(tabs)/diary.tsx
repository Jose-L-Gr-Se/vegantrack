import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useTheme } from '@/hooks/useTheme';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { MacroBar } from '@/components/ui/MacroBar';
import { MealSection } from '@/components/features/MealSection';
import { Spacing, Typography, Radius } from '@/theme';
import { formatDateHeader, isToday } from '@/utils/date';
import type { MealGroup } from '@/types';

export default function DiaryScreen() {
  const theme = useTheme();
  const { user, profile } = useAuthStore();
  const {
    entries,
    selectedDate,
    loading,
    fetchEntries,
    goToPrevDay,
    goToNextDay,
    deleteEntry,
    getMealGroups,
    getDaySummary,
  } = useDiaryStore();

  const userId = user?.id;

  const load = useCallback(() => {
    if (userId) fetchEntries(userId);
  }, [userId, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = getDaySummary();
  const mealGroups = getMealGroups();
  const calorieTarget = profile?.calorie_target ?? 2000;
  const proteinTarget = profile?.protein_target_g ?? 100;
  const carbsTarget   = profile?.carbs_target_g   ?? 250;
  const fatTarget     = profile?.fat_target_g     ?? 65;

  const handleAddFood = (mealType: MealGroup['type']) => {
    // Phase 3 — navigate to search with meal context
    router.push({ pathname: '/(tabs)/search', params: { meal: mealType, date: selectedDate } });
  };

  const canGoNext = !isToday(selectedDate);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background.primary }]}>
      {/* ── date header ── */}
      <View style={[styles.dateHeader, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity
          onPress={() => userId && goToPrevDay(userId)}
          style={styles.dateArrow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.arrowText, { color: theme.text.secondary }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.dateLabelWrapper}>
          <Text style={[styles.dateLabel, { color: theme.text.primary }]}>
            {formatDateHeader(selectedDate)}
          </Text>
          {isToday(selectedDate) && (
            <View style={[styles.todayDot, { backgroundColor: theme.action.primary }]} />
          )}
        </View>

        <TouchableOpacity
          onPress={() => userId && goToNextDay(userId)}
          style={[styles.dateArrow, !canGoNext && styles.arrowDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!canGoNext}
        >
          <Text style={[styles.arrowText, { color: canGoNext ? theme.text.secondary : theme.border.strong }]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={theme.action.primary}
          />
        }
      >
        {/* ── summary card ── */}
        <View style={[styles.summaryCard, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}>
          <View style={styles.ringWrapper}>
            <ProgressRing
              consumed={summary.calories}
              target={calorieTarget}
              size={156}
              strokeWidth={11}
            />
          </View>

          <View style={[styles.macroDivider, { backgroundColor: theme.border.subtle }]} />

          <View style={styles.macroWrapper}>
            <MacroBar
              protein={{ consumed: summary.protein_g, target: proteinTarget }}
              carbs={{ consumed: summary.carbs_g,   target: carbsTarget }}
              fat={{ consumed: summary.fat_g,        target: fatTarget }}
            />
          </View>
        </View>

        {/* ── loading state ── */}
        {loading && entries.length === 0 && (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator color={theme.action.primary} />
          </View>
        )}

        {/* ── meal sections ── */}
        <View style={styles.mealsWrapper}>
          {mealGroups.map((group) => (
            <MealSection
              key={group.type}
              group={group}
              onAddFood={handleAddFood}
              onDeleteEntry={deleteEntry}
            />
          ))}
        </View>

        {/* ── fiber row ── */}
        {summary.fiber_g > 0 && (
          <View style={[styles.fiberRow, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}>
            <Text style={[styles.fiberLabel, { color: theme.text.secondary }]}>🌿 Fibra</Text>
            <Text style={[styles.fiberValue, { color: theme.text.primary }]}>
              {summary.fiber_g}g
              <Text style={[styles.fiberTarget, { color: theme.text.tertiary }]}> / 30g</Text>
            </Text>
          </View>
        )}

        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  dateArrow: {
    padding: Spacing.xs,
    minWidth: 32,
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Typography.fonts.sans,
  },
  dateLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateLabel: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.md,
    textTransform: 'capitalize',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scroll: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  summaryCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  ringWrapper: {
    alignItems: 'center',
  },
  macroDivider: {
    height: 1,
  },
  macroWrapper: {
    paddingHorizontal: Spacing.xs,
  },
  loadingWrapper: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  mealsWrapper: {
    gap: Spacing.sm,
  },
  fiberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  fiberLabel: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
  },
  fiberValue: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  fiberTarget: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
});
