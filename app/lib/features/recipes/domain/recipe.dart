import 'package:equatable/equatable.dart';

class RecipeIngredient extends Equatable {
  const RecipeIngredient({
    required this.id,
    required this.recipeId,
    required this.foodName,
    required this.brand,
    required this.barcode,
    required this.servingSizeG,
    required this.caloriesPer100g,
    required this.proteinPer100g,
    required this.carbsPer100g,
    required this.fatPer100g,
    required this.fiberPer100g,
    required this.vitaminB12McgPer100g,
    required this.ironMgPer100g,
    required this.zincMgPer100g,
    required this.calciumMgPer100g,
    required this.vitaminDMcgPer100g,
    required this.omega3GPer100g,
    required this.isVegan,
    required this.sortOrder,
  });

  final String id;
  final String recipeId;
  final String foodName;
  final String? brand;
  final String? barcode;
  final double servingSizeG;
  final double caloriesPer100g;
  final double proteinPer100g;
  final double carbsPer100g;
  final double fatPer100g;
  final double fiberPer100g;
  final double? vitaminB12McgPer100g;
  final double? ironMgPer100g;
  final double? zincMgPer100g;
  final double? calciumMgPer100g;
  final double? vitaminDMcgPer100g;
  final double? omega3GPer100g;
  final bool isVegan;
  final int sortOrder;

  double get calories => caloriesPer100g * servingSizeG / 100;
  double get proteinG => proteinPer100g * servingSizeG / 100;
  double get carbsG => carbsPer100g * servingSizeG / 100;
  double get fatG => fatPer100g * servingSizeG / 100;
  double get fiberG => fiberPer100g * servingSizeG / 100;

  factory RecipeIngredient.fromJson(Map<String, dynamic> j) =>
      RecipeIngredient(
        id: j['id'] as String,
        recipeId: j['recipe_id'] as String,
        foodName: j['food_name'] as String,
        brand: j['brand'] as String?,
        barcode: j['barcode'] as String?,
        servingSizeG: _d(j['serving_size_g']) ?? 100,
        caloriesPer100g: _d(j['calories_per_100g']) ?? 0,
        proteinPer100g: _d(j['protein_per_100g']) ?? 0,
        carbsPer100g: _d(j['carbs_per_100g']) ?? 0,
        fatPer100g: _d(j['fat_per_100g']) ?? 0,
        fiberPer100g: _d(j['fiber_per_100g']) ?? 0,
        vitaminB12McgPer100g: _d(j['vitamin_b12_mcg_per_100g']),
        ironMgPer100g: _d(j['iron_mg_per_100g']),
        zincMgPer100g: _d(j['zinc_mg_per_100g']),
        calciumMgPer100g: _d(j['calcium_mg_per_100g']),
        vitaminDMcgPer100g: _d(j['vitamin_d_mcg_per_100g']),
        omega3GPer100g: _d(j['omega3_g_per_100g']),
        isVegan: j['is_vegan'] == true,
        sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      );

  static double? _d(dynamic v) =>
      v == null ? null : double.tryParse(v.toString());

  @override
  List<Object?> get props => [id, servingSizeG];
}

class Recipe extends Equatable {
  const Recipe({
    required this.id,
    required this.userId,
    required this.name,
    required this.description,
    required this.totalServings,
    required this.imageUrl,
    required this.isVegan,
    required this.ingredients,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String name;
  final String? description;
  final int totalServings;
  final String? imageUrl;
  final bool isVegan;
  final List<RecipeIngredient> ingredients;
  final DateTime createdAt;

  double get totalCalories =>
      ingredients.fold(0, (s, i) => s + i.calories);
  double get totalProteinG =>
      ingredients.fold(0, (s, i) => s + i.proteinG);
  double get totalCarbsG =>
      ingredients.fold(0, (s, i) => s + i.carbsG);
  double get totalFatG =>
      ingredients.fold(0, (s, i) => s + i.fatG);

  double get caloriesPerServing =>
      totalServings > 0 ? totalCalories / totalServings : 0;

  factory Recipe.fromJson(Map<String, dynamic> j) => Recipe(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        totalServings: (j['total_servings'] as num?)?.toInt() ?? 1,
        imageUrl: j['image_url'] as String?,
        isVegan: j['is_vegan'] == true,
        ingredients: (j['ingredients'] as List?)
                ?.cast<Map<String, dynamic>>()
                .map(RecipeIngredient.fromJson)
                .toList() ??
            [],
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ??
            DateTime.now(),
      );

  @override
  List<Object?> get props => [id, name, ingredients.length];
}
