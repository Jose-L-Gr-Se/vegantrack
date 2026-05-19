import 'package:equatable/equatable.dart';

enum SupplementNutrientKey {
  vitaminB12Mcg,
  vitaminDMcg,
  omega3G,
  ironMg,
  zincMg,
  calciumMg,
  iodineMcg;

  String get dbValue => switch (this) {
        SupplementNutrientKey.vitaminB12Mcg => 'vitamin_b12_mcg',
        SupplementNutrientKey.vitaminDMcg => 'vitamin_d_mcg',
        SupplementNutrientKey.omega3G => 'omega3_g',
        SupplementNutrientKey.ironMg => 'iron_mg',
        SupplementNutrientKey.zincMg => 'zinc_mg',
        SupplementNutrientKey.calciumMg => 'calcium_mg',
        SupplementNutrientKey.iodineMcg => 'iodine_mcg',
      };

  static SupplementNutrientKey? fromString(String? s) => switch (s) {
        'vitamin_b12_mcg' => SupplementNutrientKey.vitaminB12Mcg,
        'vitamin_d_mcg' => SupplementNutrientKey.vitaminDMcg,
        'omega3_g' => SupplementNutrientKey.omega3G,
        'iron_mg' => SupplementNutrientKey.ironMg,
        'zinc_mg' => SupplementNutrientKey.zincMg,
        'calcium_mg' => SupplementNutrientKey.calciumMg,
        'iodine_mcg' => SupplementNutrientKey.iodineMcg,
        _ => null,
      };
}

class Supplement extends Equatable {
  const Supplement({
    required this.id,
    required this.userId,
    required this.name,
    required this.nutrientKey,
    required this.emoji,
    required this.doseAmount,
    required this.doseUnit,
    required this.isActive,
    required this.sortOrder,
    required this.takenToday,
  });

  final String id;
  final String userId;
  final String name;
  final SupplementNutrientKey? nutrientKey;
  final String emoji;
  final double doseAmount;
  final String doseUnit;
  final bool isActive;
  final int sortOrder;
  final bool takenToday;

  factory Supplement.fromJson(Map<String, dynamic> j,
      {bool takenToday = false}) =>
      Supplement(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        name: j['name'] as String,
        nutrientKey:
            SupplementNutrientKey.fromString(j['nutrient_key'] as String?),
        emoji: (j['emoji'] as String?) ?? '💊',
        doseAmount:
            double.tryParse(j['dose_amount']?.toString() ?? '') ?? 0,
        doseUnit: (j['dose_unit'] as String?) ?? 'mg',
        isActive: j['is_active'] == true,
        sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
        takenToday: takenToday,
      );

  Map<String, dynamic> toInsertJson() => {
        'user_id': userId,
        'name': name,
        'nutrient_key': nutrientKey?.dbValue,
        'emoji': emoji,
        'dose_amount': doseAmount,
        'dose_unit': doseUnit,
        'is_active': isActive,
        'sort_order': sortOrder,
      };

  Supplement copyWith({bool? takenToday, bool? isActive, String? name}) =>
      Supplement(
        id: id,
        userId: userId,
        name: name ?? this.name,
        nutrientKey: nutrientKey,
        emoji: emoji,
        doseAmount: doseAmount,
        doseUnit: doseUnit,
        isActive: isActive ?? this.isActive,
        sortOrder: sortOrder,
        takenToday: takenToday ?? this.takenToday,
      );

  @override
  List<Object?> get props => [id, isActive, takenToday];
}
