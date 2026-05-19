import 'package:equatable/equatable.dart';

class CustomFood extends Equatable {
  const CustomFood({
    required this.id,
    required this.userId,
    required this.name,
    required this.brand,
    required this.caloriesPer100g,
    required this.proteinPer100g,
    required this.carbsPer100g,
    required this.fatPer100g,
    required this.fiberPer100g,
    required this.sugarPer100g,
    required this.saturatedFatPer100g,
    required this.sodiumMgPer100g,
    required this.vitaminB12McgPer100g,
    required this.ironMgPer100g,
    required this.zincMgPer100g,
    required this.calciumMgPer100g,
    required this.vitaminDMcgPer100g,
    required this.omega3GPer100g,
    required this.isVegan,
    required this.imageUrl,
  });

  final String id;
  final String userId;
  final String name;
  final String? brand;
  final double caloriesPer100g;
  final double proteinPer100g;
  final double carbsPer100g;
  final double fatPer100g;
  final double fiberPer100g;
  final double sugarPer100g;
  final double saturatedFatPer100g;
  final double sodiumMgPer100g;
  final double? vitaminB12McgPer100g;
  final double? ironMgPer100g;
  final double? zincMgPer100g;
  final double? calciumMgPer100g;
  final double? vitaminDMcgPer100g;
  final double? omega3GPer100g;
  final bool isVegan;
  final String? imageUrl;

  factory CustomFood.fromJson(Map<String, dynamic> j) => CustomFood(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        name: j['name'] as String,
        brand: j['brand'] as String?,
        caloriesPer100g: _d(j['calories_per_100g']) ?? 0,
        proteinPer100g: _d(j['protein_per_100g']) ?? 0,
        carbsPer100g: _d(j['carbs_per_100g']) ?? 0,
        fatPer100g: _d(j['fat_per_100g']) ?? 0,
        fiberPer100g: _d(j['fiber_per_100g']) ?? 0,
        sugarPer100g: _d(j['sugar_per_100g']) ?? 0,
        saturatedFatPer100g: _d(j['saturated_fat_per_100g']) ?? 0,
        sodiumMgPer100g: _d(j['sodium_mg_per_100g']) ?? 0,
        vitaminB12McgPer100g: _d(j['vitamin_b12_mcg_per_100g']),
        ironMgPer100g: _d(j['iron_mg_per_100g']),
        zincMgPer100g: _d(j['zinc_mg_per_100g']),
        calciumMgPer100g: _d(j['calcium_mg_per_100g']),
        vitaminDMcgPer100g: _d(j['vitamin_d_mcg_per_100g']),
        omega3GPer100g: _d(j['omega3_g_per_100g']),
        isVegan: j['is_vegan'] == true,
        imageUrl: j['image_url'] as String?,
      );

  Map<String, dynamic> toInsertJson() => {
        'user_id': userId,
        'name': name,
        'brand': brand,
        'calories_per_100g': caloriesPer100g,
        'protein_per_100g': proteinPer100g,
        'carbs_per_100g': carbsPer100g,
        'fat_per_100g': fatPer100g,
        'fiber_per_100g': fiberPer100g,
        'sugar_per_100g': sugarPer100g,
        'saturated_fat_per_100g': saturatedFatPer100g,
        'sodium_mg_per_100g': sodiumMgPer100g,
        'vitamin_b12_mcg_per_100g': vitaminB12McgPer100g,
        'iron_mg_per_100g': ironMgPer100g,
        'zinc_mg_per_100g': zincMgPer100g,
        'calcium_mg_per_100g': calciumMgPer100g,
        'vitamin_d_mcg_per_100g': vitaminDMcgPer100g,
        'omega3_g_per_100g': omega3GPer100g,
        'is_vegan': isVegan,
        'image_url': imageUrl,
      };

  static double? _d(dynamic v) =>
      v == null ? null : double.tryParse(v.toString());

  @override
  List<Object?> get props => [id, name];
}
