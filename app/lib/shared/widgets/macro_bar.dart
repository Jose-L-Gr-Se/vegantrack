import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class MacroBar extends StatelessWidget {
  const MacroBar({
    super.key,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    this.height = 6,
    this.borderRadius = 4,
  });

  final double proteinG;
  final double carbsG;
  final double fatG;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final total = proteinG * 4 + carbsG * 4 + fatG * 9;
    if (total <= 0) {
      return Container(
        height: height,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      );
    }

    final proteinFrac = (proteinG * 4) / total;
    final carbsFrac = (carbsG * 4) / total;
    final fatFrac = (fatG * 9) / total;

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Row(
        children: [
          Expanded(
            flex: (proteinFrac * 1000).round(),
            child: Container(height: height, color: AppColors.protein),
          ),
          Expanded(
            flex: (carbsFrac * 1000).round(),
            child: Container(height: height, color: AppColors.carbs),
          ),
          Expanded(
            flex: (fatFrac * 1000).round(),
            child: Container(height: height, color: AppColors.fat),
          ),
        ],
      ),
    );
  }
}

class MacroRow extends StatelessWidget {
  const MacroRow({
    super.key,
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    this.targetCalories,
    this.targetProtein,
    this.targetCarbs,
    this.targetFat,
    this.compact = false,
  });

  final double calories;
  final double proteinG;
  final double carbsG;
  final double fatG;
  final int? targetCalories;
  final double? targetProtein;
  final double? targetCarbs;
  final double? targetFat;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Row(
      children: [
        _MacroChip(
          label: 'Cal',
          value: calories.round().toString(),
          target: targetCalories?.toString(),
          color: colors.primary,
          compact: compact,
        ),
        const SizedBox(width: 8),
        _MacroChip(
          label: 'Prot',
          value: '${proteinG.round()}g',
          target: targetProtein != null ? '${targetProtein!.round()}g' : null,
          color: AppColors.protein,
          compact: compact,
        ),
        const SizedBox(width: 8),
        _MacroChip(
          label: 'HC',
          value: '${carbsG.round()}g',
          target: targetCarbs != null ? '${targetCarbs!.round()}g' : null,
          color: AppColors.carbs,
          compact: compact,
        ),
        const SizedBox(width: 8),
        _MacroChip(
          label: 'Gras',
          value: '${fatG.round()}g',
          target: targetFat != null ? '${targetFat!.round()}g' : null,
          color: AppColors.fat,
          compact: compact,
        ),
      ],
    );
  }
}

class _MacroChip extends StatelessWidget {
  const _MacroChip({
    required this.label,
    required this.value,
    required this.color,
    this.target,
    this.compact = false,
  });

  final String label;
  final String value;
  final String? target;
  final Color color;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 8 : 10,
          vertical: compact ? 6 : 8,
        ),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: text.labelSmall?.copyWith(
                color: colors.onSurfaceVariant,
                fontSize: compact ? 10 : 11,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: text.titleMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: compact ? 13 : 15,
              ),
            ),
            if (target != null)
              Text(
                '/ $target',
                style: text.labelSmall?.copyWith(
                  color: colors.onSurfaceVariant,
                  fontSize: 10,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
