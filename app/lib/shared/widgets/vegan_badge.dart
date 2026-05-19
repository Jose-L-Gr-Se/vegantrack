import 'package:flutter/material.dart';

import '../../core/utils/vegan_detector.dart';

class VeganBadge extends StatelessWidget {
  const VeganBadge({
    super.key,
    required this.status,
    required this.confidence,
    this.compact = false,
  });

  final VeganStatus status;
  final VeganConfidence confidence;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (label, icon, bg, fg) = switch (status) {
      VeganStatus.vegan when confidence == VeganConfidence.high =>
        ('Vegano ✓', Icons.verified_rounded, const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      VeganStatus.vegan =>
        ('Vegano', Icons.eco_rounded, const Color(0xFFDCFCE7), const Color(0xFF16A34A)),
      VeganStatus.nonVegan =>
        ('No vegano', Icons.block_rounded, const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
      VeganStatus.unknown =>
        ('Sin info', Icons.help_outline_rounded, const Color(0xFFF3F4F6), const Color(0xFF6B7280)),
    };

    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: fg,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: fg),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
