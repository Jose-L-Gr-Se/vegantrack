import 'package:equatable/equatable.dart';

class UserProfile extends Equatable {
  const UserProfile({
    required this.id,
    required this.displayName,
    required this.heightCm,
    required this.weightKg,
    required this.birthDate,
    required this.sex,
    required this.activityLevel,
    required this.goal,
    required this.calorieTarget,
    required this.proteinTargetG,
    required this.carbsTargetG,
    required this.fatTargetG,
    required this.streakCount,
    required this.lastLogDate,
    required this.subscriptionTier,
    required this.subscriptionExpiresAt,
  });

  final String id;
  final String? displayName;
  final double? heightCm;
  final double? weightKg;
  final DateTime? birthDate;
  final String? sex; // 'male' | 'female'
  final String activityLevel; // sedentary|light|moderate|active|very_active
  final String goal; // cut|maintain|bulk
  final int? calorieTarget;
  final double? proteinTargetG;
  final double? carbsTargetG;
  final double? fatTargetG;
  final int streakCount;
  final DateTime? lastLogDate;
  final String subscriptionTier; // free|pro
  final DateTime? subscriptionExpiresAt;

  bool get isPro {
    if (subscriptionTier != 'pro') return false;
    if (subscriptionExpiresAt == null) return true;
    return subscriptionExpiresAt!.isAfter(DateTime.now());
  }

  bool get hasCompletedOnboarding => calorieTarget != null;

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        id: j['id'] as String,
        displayName: j['display_name'] as String?,
        heightCm: _d(j['height_cm']),
        weightKg: _d(j['weight_kg']),
        birthDate: j['birth_date'] != null
            ? DateTime.tryParse(j['birth_date'] as String)
            : null,
        sex: j['sex'] as String?,
        activityLevel: (j['activity_level'] as String?) ?? 'moderate',
        goal: (j['goal'] as String?) ?? 'maintain',
        calorieTarget: _i(j['calorie_target']),
        proteinTargetG: _d(j['protein_target_g']),
        carbsTargetG: _d(j['carbs_target_g']),
        fatTargetG: _d(j['fat_target_g']),
        streakCount: _i(j['streak_count']) ?? 0,
        lastLogDate: j['last_log_date'] != null
            ? DateTime.tryParse(j['last_log_date'] as String)
            : null,
        subscriptionTier: (j['subscription_tier'] as String?) ?? 'free',
        subscriptionExpiresAt: j['subscription_expires_at'] != null
            ? DateTime.tryParse(j['subscription_expires_at'] as String)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'display_name': displayName,
        'height_cm': heightCm,
        'weight_kg': weightKg,
        'birth_date': birthDate?.toIso8601String().split('T').first,
        'sex': sex,
        'activity_level': activityLevel,
        'goal': goal,
        'calorie_target': calorieTarget,
        'protein_target_g': proteinTargetG,
        'carbs_target_g': carbsTargetG,
        'fat_target_g': fatTargetG,
      };

  UserProfile copyWith({
    String? displayName,
    double? heightCm,
    double? weightKg,
    DateTime? birthDate,
    String? sex,
    String? activityLevel,
    String? goal,
    int? calorieTarget,
    double? proteinTargetG,
    double? carbsTargetG,
    double? fatTargetG,
    int? streakCount,
    DateTime? lastLogDate,
    String? subscriptionTier,
    DateTime? subscriptionExpiresAt,
  }) =>
      UserProfile(
        id: id,
        displayName: displayName ?? this.displayName,
        heightCm: heightCm ?? this.heightCm,
        weightKg: weightKg ?? this.weightKg,
        birthDate: birthDate ?? this.birthDate,
        sex: sex ?? this.sex,
        activityLevel: activityLevel ?? this.activityLevel,
        goal: goal ?? this.goal,
        calorieTarget: calorieTarget ?? this.calorieTarget,
        proteinTargetG: proteinTargetG ?? this.proteinTargetG,
        carbsTargetG: carbsTargetG ?? this.carbsTargetG,
        fatTargetG: fatTargetG ?? this.fatTargetG,
        streakCount: streakCount ?? this.streakCount,
        lastLogDate: lastLogDate ?? this.lastLogDate,
        subscriptionTier: subscriptionTier ?? this.subscriptionTier,
        subscriptionExpiresAt:
            subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      );

  static double? _d(dynamic v) =>
      v == null ? null : double.tryParse(v.toString());
  static int? _i(dynamic v) =>
      v == null ? null : int.tryParse(v.toString());

  @override
  List<Object?> get props => [id, calorieTarget, streakCount, subscriptionTier];
}
