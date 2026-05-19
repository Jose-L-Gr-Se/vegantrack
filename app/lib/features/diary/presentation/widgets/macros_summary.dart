import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/macro_bar.dart';
import '../../domain/food_log_entry.dart';
import '../providers/diary_provider.dart';
import '../../../auth/domain/user_profile.dart';

class MacrosSummary extends ConsumerWidget {
  const MacrosSummary({
    super.key,
    required this.profile,
    required this.onTapScanner,
  });

  final UserProfile? profile;
  final VoidCallback onTapScanner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(daySummaryProvider);
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    final calories = summary.calories;
    final target = profile?.calorieTarget ?? 2000;
    final remaining = target - calories;
    final pct = (calories / target).clamp(0, 1);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: colors.outlineVariant.withOpacity(0.5),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      calories.round().toString(),
                      style: text.displayMedium?.copyWith(
                        color: const Color(0xFF22C55E),
                        height: 1,
                      ),
                    ),
                    Text(
                      'de $target kcal',
                      style: text.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                if (remaining > 0)
                  Text(
                    '${remaining.round()} restantes',
                    style: text.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  )
                else
                  Text(
                    '${(-remaining).round()} de más',
                    style: text.bodySmall?.copyWith(
                      color: AppColors.error,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Calorie progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct.toDouble(),
                minHeight: 6,
                backgroundColor: colors.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(
                  pct >= 1 ? AppColors.error : const Color(0xFF22C55E),
                ),
              ),
            ),

            const SizedBox(height: 12),

            MacroRow(
              calories: summary.calories,
              proteinG: summary.proteinG,
              carbsG: summary.carbsG,
              fatG: summary.fatG,
              targetCalories: profile?.calorieTarget,
              targetProtein: profile?.proteinTargetG,
              targetCarbs: profile?.carbsTargetG,
              targetFat: profile?.fatTargetG,
              compact: true,
            ),
          ],
        ),
      ),
    );
  }
}
