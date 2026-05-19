import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerBox extends StatelessWidget {
  const ShimmerBox({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = 8,
  });

  final double width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2D2D2D) : const Color(0xFFE5E7EB),
      highlightColor: isDark ? const Color(0xFF3D3D3D) : const Color(0xFFF9FAFB),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          const ShimmerBox(width: 56, height: 56, borderRadius: 12),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBox(height: 14),
                const SizedBox(height: 6),
                ShimmerBox(width: 120, height: 12),
                const SizedBox(height: 6),
                ShimmerBox(width: 80, height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class DiaryEntrySkeleton extends StatelessWidget {
  const DiaryEntrySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (_) => const Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: ProductCardSkeleton(),
        ),
      ),
    );
  }
}
