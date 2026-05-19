import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, Radius, Colors } from '@/theme';
import { getVeganConfidence } from '@/services/openfoodfacts';
import type { OpenFoodFactsProduct } from '@/types';

interface Props {
  product: OpenFoodFactsProduct;
  onPress: (product: OpenFoodFactsProduct) => void;
}

const CONFIDENCE_BADGE: Record<string, { label: string; color: string }> = {
  high:    { label: '✓ Vegano',    color: Colors.brand[500] },
  medium:  { label: '~ Vegetal',   color: Colors.warning },
  low:     { label: '✗ Animal',    color: Colors.error },
  unknown: { label: '? Sin datos', color: Colors.neutral[500] },
};

export function FoodCard({ product, onPress }: Props) {
  const theme = useTheme();
  const n = product.nutriments;
  const confidence = getVeganConfidence(product);
  const badge = CONFIDENCE_BADGE[confidence];
  const kcal = Math.round(n['energy-kcal_100g']);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}
      onPress={() => onPress(product)}
      activeOpacity={0.75}
    >
      {/* image */}
      {product.image_front_url ? (
        <Image
          source={{ uri: product.image_front_url }}
          style={[styles.image, { backgroundColor: theme.background.secondary }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.background.secondary }]}>
          <Text style={styles.imagePlaceholderText}>🥦</Text>
        </View>
      )}

      {/* info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={2}>
          {product.product_name}
        </Text>
        {product.brands ? (
          <Text style={[styles.brand, { color: theme.text.secondary }]} numberOfLines={1}>
            {product.brands}
          </Text>
        ) : null}

        {/* macros row */}
        <View style={styles.macros}>
          <Text style={[styles.kcal, { color: theme.text.primary }]}>{kcal} kcal</Text>
          <Text style={[styles.macroDot, { color: theme.text.tertiary }]}>·</Text>
          <Text style={[styles.macro, { color: theme.text.secondary }]}>P {Math.round(n.proteins_100g)}g</Text>
          <Text style={[styles.macroDot, { color: theme.text.tertiary }]}>·</Text>
          <Text style={[styles.macro, { color: theme.text.secondary }]}>C {Math.round(n.carbohydrates_100g)}g</Text>
          <Text style={[styles.macroDot, { color: theme.text.tertiary }]}>·</Text>
          <Text style={[styles.macro, { color: theme.text.secondary }]}>G {Math.round(n.fat_100g)}g</Text>
        </View>

        {/* vegan badge */}
        <Text style={[styles.badge, { color: badge.color }]}>{badge.label}</Text>
      </View>

      {/* chevron */}
      <Text style={[styles.chevron, { color: theme.text.tertiary }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  brand: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  macros: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 2,
  },
  kcal: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  macroDot: {
    fontSize: Typography.sizes.xs,
  },
  macro: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  badge: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: Typography.fonts.sans,
  },
});
