import 'package:equatable/equatable.dart';

enum MealType { breakfast, lunch, dinner, snack }

extension MealTypeX on MealType {
  String get label => switch (this) {
        MealType.breakfast => 'Desayuno',
        MealType.lunch => 'Almuerzo',
        MealType.dinner => 'Cena',
        MealType.snack => 'Snack',
      };

  String get emoji => switch (this) {
        MealType.breakfast => '🌅',
        MealType.lunch => '☀️',
        MealType.dinner => '🌙',
        MealType.snack => '🍎',
      };

  String get value => name;

  static MealType fromString(String? s) => switch (s) {
        'lunch' => MealType.lunch,
        'dinner' => MealType.dinner,
        'snack' => MealType.snack,
        _ => MealType.breakfast,
      };
}

class FoodLogEntry extends Equatable {
  const FoodLogEntry({
    required this.id,
    required this.userId,
    required this.date,
    required this.mealType,
    required this.foodName,
    required this.barcode,
    required this.brand,
    required this.servingSizeG,
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    required this.fiberG,
    required this.sugarG,
    required this.saturatedFatG,
    required this.sodiumMg,
    required this.vitaminB12Mcg,
    required this.ironMg,
    required this.zincMg,
    required this.calciumMg,
    required this.omega3G,
    required this.vitaminDMcg,
    required this.vitaminB12Known,
    required this.ironKnown,
    required this.zincKnown,
    required this.calciumKnown,
    required this.omega3Known,
    required this.vitaminDKnown,
    required this.isVegan,
    required this.imageUrl,
    required this.source,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String date;
  final MealType mealType;
  final String foodName;
  final String? barcode;
  final String? brand;
  final double servingSizeG;
  final double calories;
  final double proteinG;
  final double carbsG;
  final double fatG;
  final double fiberG;
  final double sugarG;
  final double saturatedFatG;
  final double sodiumMg;
  final double? vitaminB12Mcg;
  final double? ironMg;
  final double? zincMg;
  final double? calciumMg;
  final double? omega3G;
  final double? vitaminDMcg;
  final bool vitaminB12Known;
  final bool ironKnown;
  final bool zincKnown;
  final bool calciumKnown;
  final bool omega3Known;
  final bool vitaminDKnown;
  final bool isVegan;
  final String? imageUrl;
  final String? source;
  final DateTime createdAt;

  factory FoodLogEntry.fromJson(Map<String, dynamic> j) => FoodLogEntry(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        date: j['date'] as String,
        mealType: MealTypeX.fromString(j['meal_type'] as String?),
        foodName: j['food_name'] as String,
        barcode: j['barcode'] as String?,
        brand: j['brand'] as String?,
        servingSizeG: _d(j['serving_size_g']) ?? 100,
        calories: _d(j['calories']) ?? 0,
        proteinG: _d(j['protein_g']) ?? 0,
        carbsG: _d(j['carbs_g']) ?? 0,
        fatG: _d(j['fat_g']) ?? 0,
        fiberG: _d(j['fiber_g']) ?? 0,
        sugarG: _d(j['sugar_g']) ?? 0,
        saturatedFatG: _d(j['saturated_fat_g']) ?? 0,
        sodiumMg: _d(j['sodium_mg']) ?? 0,
        vitaminB12Mcg: _d(j['vitamin_b12_mcg']),
        ironMg: _d(j['iron_mg']),
        zincMg: _d(j['zinc_mg']),
        calciumMg: _d(j['calcium_mg']),
        omega3G: _d(j['omega3_g']),
        vitaminDMcg: _d(j['vitamin_d_mcg']),
        vitaminB12Known: j['vitamin_b12_known'] == true,
        ironKnown: j['iron_known'] == true,
        zincKnown: j['zinc_known'] == true,
        calciumKnown: j['calcium_known'] == true,
        omega3Known: j['omega3_known'] == true,
        vitaminDKnown: j['vitamin_d_known'] == true,
        isVegan: j['is_vegan'] == true,
        imageUrl: j['image_url'] as String?,
        source: j['source'] as String?,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ??
            DateTime.now(),
      );

  Map<String, dynamic> toInsertJson() => {
        'user_id': userId,
        'date': date,
        'meal_type': mealType.value,
        'food_name': foodName,
        'barcode': barcode,
        'brand': brand,
        'serving_size_g': servingSizeG,
        'calories': calories,
        'protein_g': proteinG,
        'carbs_g': carbsG,
        'fat_g': fatG,
        'fiber_g': fiberG,
        'sugar_g': sugarG,
        'saturated_fat_g': saturatedFatG,
        'sodium_mg': sodiumMg,
        'vitamin_b12_mcg': vitaminB12Mcg,
        'iron_mg': ironMg,
        'zinc_mg': zincMg,
        'calcium_mg': calciumMg,
        'omega3_g': omega3G,
        'vitamin_d_mcg': vitaminDMcg,
        'vitamin_b12_known': vitaminB12Known,
        'iron_known': ironKnown,
        'zinc_known': zincKnown,
        'calcium_known': calciumKnown,
        'omega3_known': omega3Known,
        'vitamin_d_known': vitaminDKnown,
        'is_vegan': isVegan,
        'image_url': imageUrl,
        'source': source,
      };

  static double? _d(dynamic v) =>
      v == null ? null : double.tryParse(v.toString());

  @override
  List<Object?> get props => [id, date, mealType, foodName, calories];
}
