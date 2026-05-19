import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/macro_bar.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../domain/food_log_entry.dart';
import 'providers/diary_provider.dart';
import 'widgets/food_entry_tile.dart';
import 'widgets/macros_summary.dart';

class DiaryPage extends ConsumerWidget {
  const DiaryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedDate = ref.watch(selectedDateProvider);
    final diaryState = ref.watch(diaryProvider);
    final profile = ref.watch(authStateProvider).profile;
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colors.surface,
      body: CustomScrollView(
        slivers: [
          // App bar with date
          SliverAppBar(
            floating: true,
            snap: true,
            backgroundColor: colors.surface,
            title: _DateSelector(
              date: selectedDate,
              onPrev: () => ref
                  .read(selectedDateProvider.notifier)
                  .state = selectedDate.subtract(const Duration(days: 1)),
              onNext: () => ref
                  .read(selectedDateProvider.notifier)
                  .state = selectedDate.add(const Duration(days: 1)),
              onPickDate: () => _pickDate(context, ref, selectedDate),
            ),
          ),

          // Day summary
          SliverToBoxAdapter(
            child: MacrosSummary(
              profile: profile,
              onTapScanner: () => context.go('/search'),
            ),
          ),

          // Streak banner
          if ((profile?.streakCount ?? 0) > 0)
            SliverToBoxAdapter(
              child: _StreakBanner(streak: profile!.streakCount),
            ),

          // Meal sections
          if (diaryState.isLoading)
            const SliverToBoxAdapter(child: DiaryEntrySkeleton())
          else ...[
            for (final mealType in MealType.values)
              _MealSection(mealType: mealType),
          ],

          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(
          '/diary/add',
          extra: {
            'mealType': 'breakfast',
            'date':
                '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
          },
        ),
        icon: const Icon(Icons.add),
        label: const Text('Añadir'),
      ),
    );
  }

  Future<void> _pickDate(
    BuildContext context,
    WidgetRef ref,
    DateTime current,
  ) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      ref.read(selectedDateProvider.notifier).state = picked;
    }
  }
}

// ─── Date selector ────────────────────────────────────────────────────────────

class _DateSelector extends StatelessWidget {
  const _DateSelector({
    required this.date,
    required this.onPrev,
    required this.onNext,
    required this.onPickDate,
  });

  final DateTime date;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback onPickDate;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isToday =
        date.year == now.year && date.month == now.month && date.day == now.day;

    String label;
    if (isToday) {
      label = 'Hoy';
    } else if (date.year == now.year - 1 ||
        (date.month == now.month - 1 && date.day == now.day)) {
      label = 'Ayer';
    } else {
      label = DateFormat('d MMM', 'es_ES').format(date);
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left),
          onPressed: onPrev,
          visualDensity: VisualDensity.compact,
        ),
        GestureDetector(
          onTap: onPickDate,
          child: Text(
            label,
            style: Theme.of(context).textTheme.headlineLarge,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          onPressed: isToday ? null : onNext,
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}

// ─── Streak banner ────────────────────────────────────────────────────────────

class _StreakBanner extends StatelessWidget {
  const _StreakBanner({required this.streak});
  final int streak;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFF6B35), Color(0xFFFFAD00)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Text('🔥', style: TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(
              '$streak día${streak > 1 ? 's' : ''} de racha',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Colors.white,
                fontSize: 14,
              ),
            ),
            const Spacer(),
            const Text('¡Sigue así!',
                style: TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

// ─── Meal section ─────────────────────────────────────────────────────────────

class _MealSection extends ConsumerWidget {
  const _MealSection({required this.mealType});
  final MealType mealType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = ref
        .watch(diaryProvider)
        .entries
        .where((e) => e.mealType == mealType)
        .toList();
    final selectedDate = ref.watch(selectedDateProvider);
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    final mealColor = switch (mealType) {
      MealType.breakfast => AppColors.breakfast,
      MealType.lunch => AppColors.lunch,
      MealType.dinner => AppColors.dinner,
      MealType.snack => AppColors.snack,
    };

    final mealCal =
        entries.fold<double>(0, (s, e) => s + e.calories);

    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${mealType.emoji}  ${mealType.label}',
                  style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                if (entries.isNotEmpty)
                  Text(
                    '${mealCal.round()} kcal',
                    style: text.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(Icons.add_circle_outline,
                      color: mealColor, size: 22),
                  visualDensity: VisualDensity.compact,
                  onPressed: () => context.push(
                    '/diary/add',
                    extra: {
                      'mealType': mealType.value,
                      'date':
                          '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
                    },
                  ),
                ),
              ],
            ),
            if (entries.isEmpty)
              GestureDetector(
                onTap: () => context.push(
                  '/diary/add',
                  extra: {
                    'mealType': mealType.value,
                    'date':
                        '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
                  },
                ),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: colors.outlineVariant.withOpacity(0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.add,
                          color: colors.onSurfaceVariant, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Añadir alimento',
                        style: text.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...entries.map(
                (entry) => FoodEntryTile(
                  entry: entry,
                  onDelete: () => ref
                      .read(diaryProvider.notifier)
                      .deleteEntry(entry.id),
                ),
              ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}
