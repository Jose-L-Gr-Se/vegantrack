/// Dart port of the vegan detection logic from openfoodfacts.ts
library;

import '../network/off_client.dart';

// ─── Keywords ────────────────────────────────────────────────────────────────

const _animalKeywords = [
  'pollo', 'pavo', 'ternera', 'cerdo', 'cordero', 'buey', 'vaca',
  'jamón', 'jamon', 'atún', 'atun', 'salmón', 'salmon', 'anchoas', 'bacalao',
  'merluza', 'gambas', 'langostino', 'pulpo', 'calamar', 'mejillón',
  'huevo campero', 'leche entera', 'leche semidesnatada',
  'queso manchego', 'mozzarella di bufala', 'yogur griego',
  'mantequilla de vaca', 'nata para montar',
  'chicken', 'turkey', 'beef', 'pork', 'lamb', 'duck',
  'cow milk', 'goat milk', 'whey', 'casein', 'lactose',
  'egg white', 'egg yolk', 'gelatin', 'gelatina', 'collagen',
  'tuna fish', 'salmon fillet', 'shrimp', 'prawn',
  'milk', 'cheese', 'butter', 'cream', 'yogurt', 'lard', 'tallow',
  'carmine', 'cochineal', 'e120', 'e441', 'lanolin',
];

const _veganPositiveKeywords = [
  'vegano', 'vegana', 'vegan', 'vegetal', 'vegetariano', 'vegetariana',
  'plant-based', 'plant based', 'a base de plantas',
  'soja', 'soy', 'tofu', 'seitán', 'seitan', 'tempeh',
  'avena', 'oat', 'almendra', 'almond', 'coco', 'coconut',
  'arroz', 'rice', 'guisante', 'pea protein',
  'heura', 'beyond', 'impossible', 'garden gourmet',
];

const _veganLabels = ['en:vegan', 'en:vegan-society', 'en:vegan-ok'];

// ─── Public API ──────────────────────────────────────────────────────────────

enum VeganStatus { vegan, nonVegan, unknown }

enum VeganConfidence { high, medium, low, unknown }

class VeganResult {
  const VeganResult({required this.status, required this.confidence});
  final VeganStatus status;
  final VeganConfidence confidence;

  bool get isVegan => status == VeganStatus.vegan;
}

VeganResult detectVeganStatus(OFFProduct product) {
  final labels = product.labelsTags;

  if (labels.any((t) => _veganLabels.contains(t))) {
    return const VeganResult(
      status: VeganStatus.vegan,
      confidence: VeganConfidence.high,
    );
  }

  final combined =
      '${product.productName} ${product.brands}'.toLowerCase();

  final hasAnimal = _animalKeywords.any((k) => combined.contains(k));
  if (hasAnimal) {
    return const VeganResult(
      status: VeganStatus.nonVegan,
      confidence: VeganConfidence.low,
    );
  }

  final hasVeganSignal = _veganPositiveKeywords.any((k) => combined.contains(k));
  if (hasVeganSignal) {
    return const VeganResult(
      status: VeganStatus.vegan,
      confidence: VeganConfidence.medium,
    );
  }

  return const VeganResult(
    status: VeganStatus.unknown,
    confidence: VeganConfidence.unknown,
  );
}
