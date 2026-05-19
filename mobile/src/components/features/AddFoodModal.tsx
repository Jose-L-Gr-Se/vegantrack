import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, Radius, Colors } from '@/theme';
import type { OpenFoodFactsProduct, MealType } from '@/types';

interface Props {
  product: OpenFoodFactsProduct | null;
  visible: boolean;
  initialMeal: MealType;
  loading: boolean;
  onConfirm: (grams: number, meal: MealType) => void;
  onClose: () => void;
}

const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { type: 'lunch',     label: 'Comida',   icon: '☀️' },
  { type: 'dinner',    label: 'Cena',     icon: '🌙' },
  { type: 'snack',     label: 'Snack',    icon: '🍎' },
];

export function AddFoodModal({ product, visible, initialMeal, loading, onConfirm, onClose }: Props) {
  const theme = useTheme();
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<MealType>(initialMeal);

  if (!product) return null;

  const gramsNum = parseFloat(grams) || 0;
  const n = product.nutriments;
  const factor = gramsNum / 100;

  const kcal    = Math.round(n['energy-kcal_100g'] * factor);
  const protein = Math.round(n.proteins_100g * factor * 10) / 10;
  const carbs   = Math.round(n.carbohydrates_100g * factor * 10) / 10;
  const fat     = Math.round(n.fat_100g * factor * 10) / 10;

  const handleConfirm = () => {
    if (gramsNum <= 0) return;
    onConfirm(gramsNum, meal);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background.primary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* handle */}
        <View style={styles.handleWrapper}>
          <View style={[styles.handle, { backgroundColor: theme.border.strong }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* product name */}
          <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>
            {product.product_name}
          </Text>
          {product.brands ? (
            <Text style={[styles.brand, { color: theme.text.secondary }]}>{product.brands}</Text>
          ) : null}

          {/* grams input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Cantidad (gramos)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.card, borderColor: theme.border.default, color: theme.text.primary }]}
              value={grams}
              onChangeText={setGrams}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={theme.text.tertiary}
              selectTextOnFocus
            />
          </View>

          {/* live nutrition preview */}
          <View style={[styles.preview, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}>
            <NutrientRow label="Calorías" value={`${kcal} kcal`} primary theme={theme} />
            <NutrientRow label="Proteína" value={`${protein}g`} theme={theme} />
            <NutrientRow label="Carbohidratos" value={`${carbs}g`} theme={theme} />
            <NutrientRow label="Grasa" value={`${fat}g`} theme={theme} />
          </View>

          {/* meal selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Comida</Text>
            <View style={styles.mealGrid}>
              {MEALS.map((m) => (
                <TouchableOpacity
                  key={m.type}
                  style={[
                    styles.mealChip,
                    { borderColor: theme.border.default, backgroundColor: theme.background.card },
                    meal === m.type && { borderColor: theme.action.primary, backgroundColor: theme.action.secondary },
                  ]}
                  onPress={() => setMeal(m.type)}
                >
                  <Text style={styles.mealIcon}>{m.icon}</Text>
                  <Text style={[styles.mealLabel, { color: meal === m.type ? theme.action.primary : theme.text.secondary }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* quick gram buttons */}
          <View style={styles.quickGrams}>
            {[50, 100, 150, 200].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.gramChip, { borderColor: theme.border.default, backgroundColor: theme.background.card }]}
                onPress={() => setGrams(String(g))}
              >
                <Text style={[styles.gramChipText, { color: theme.text.secondary }]}>{g}g</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* action buttons */}
        <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border.default }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.text.secondary }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.action.primary }, (loading || gramsNum <= 0) && styles.disabledBtn]}
            onPress={handleConfirm}
            disabled={loading || gramsNum <= 0}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmText}>Añadir al diario</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NutrientRow({ label, value, primary, theme }: {
  label: string; value: string; primary?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.nutrientRow}>
      <Text style={[styles.nutrientLabel, { color: theme.text.secondary, fontFamily: primary ? Typography.fonts.sansMedium : Typography.fonts.sans }]}>
        {label}
      </Text>
      <Text style={[styles.nutrientValue, { color: primary ? theme.text.primary : theme.text.secondary, fontFamily: primary ? Typography.fonts.sansBold : Typography.fonts.sansMedium }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  handleWrapper: { alignItems: 'center', paddingTop: Spacing.md },
  handle: { width: 36, height: 4, borderRadius: 2 },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  productName: { fontFamily: Typography.fonts.sansBold, fontSize: Typography.sizes.xl, lineHeight: 28 },
  brand: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, marginTop: -Spacing.sm },
  section: { gap: Spacing.sm },
  label: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.lg,
    textAlign: 'center',
  },
  preview: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base, gap: Spacing.xs },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutrientLabel: { fontSize: Typography.sizes.sm },
  nutrientValue: { fontSize: Typography.sizes.sm },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  mealIcon: { fontSize: 14 },
  mealLabel: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm },
  quickGrams: { flexDirection: 'row', gap: Spacing.sm },
  gramChip: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1,
  },
  gramChipText: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm },
  footer: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.base, paddingBottom: Spacing.xl, borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1,
  },
  cancelText: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base },
  confirmBtn: {
    flex: 2, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md,
  },
  disabledBtn: { opacity: 0.5 },
  confirmText: { fontFamily: Typography.fonts.sansSemiBold, fontSize: Typography.sizes.base, color: '#fff' },
});
