/// Dart port of nutrition.ts + veganScore.ts
library;

// ─── TDEE / Targets ──────────────────────────────────────────────────────────

const _activityMultipliers = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very_active': 1.9,
};

const _goalAdjustments = {
  'cut': -500,
  'maintain': 0,
  'bulk': 300,
};

double _calculateBMR({
  required double weightKg,
  required double heightCm,
  required int ageYears,
  required String sex,
}) {
  final base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex == 'male' ? base + 5 : base - 161;
}

int? calculateTDEE({
  required double? weightKg,
  required double? heightCm,
  required DateTime? birthDate,
  required String? sex,
  required String? activityLevel,
}) {
  if (weightKg == null ||
      heightCm == null ||
      birthDate == null ||
      sex == null ||
      activityLevel == null) return null;

  final now = DateTime.now();
  var age = now.year - birthDate.year;
  if (now.month < birthDate.month ||
      (now.month == birthDate.month && now.day < birthDate.day)) {
    age--;
  }

  final bmr = _calculateBMR(
    weightKg: weightKg,
    heightCm: heightCm,
    ageYears: age,
    sex: sex,
  );
  return (bmr * (_activityMultipliers[activityLevel] ?? 1.55)).round();
}

({int calories, int proteinG, int carbsG, int fatG})? calculateTargets({
  required double? weightKg,
  required double? heightCm,
  required DateTime? birthDate,
  required String? sex,
  required String? activityLevel,
  required String? goal,
}) {
  final tdee = calculateTDEE(
    weightKg: weightKg,
    heightCm: heightCm,
    birthDate: birthDate,
    sex: sex,
    activityLevel: activityLevel,
  );
  if (tdee == null || goal == null || weightKg == null) return null;

  final calories = tdee + (_goalAdjustments[goal] ?? 0);
  final proteinG = (weightKg * 1.8).round();
  final fatG = ((calories * 0.25) / 9).round();
  final carbsG = ((calories - proteinG * 4 - fatG * 9) / 4).round();

  return (
    calories: calories,
    proteinG: proteinG,
    carbsG: carbsG,
    fatG: fatG,
  );
}

// ─── Vegan Score ─────────────────────────────────────────────────────────────

class MicroAggregate {
  const MicroAggregate({
    required this.value,
    required this.knownEntries,
    required this.totalEntries,
    required this.coverage,
  });

  final double value;
  final int knownEntries;
  final int totalEntries;
  final double coverage;

  MicroAggregate operator +(MicroAggregate other) => MicroAggregate(
        value: value + other.value,
        knownEntries: knownEntries + other.knownEntries,
        totalEntries: totalEntries + other.totalEntries,
        coverage: totalEntries + other.totalEntries > 0
            ? (knownEntries + other.knownEntries) /
                (totalEntries + other.totalEntries)
            : 0,
      );

  static const zero = MicroAggregate(
    value: 0,
    knownEntries: 0,
    totalEntries: 0,
    coverage: 0,
  );
}

class NutrientSummary {
  const NutrientSummary({
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    required this.fiberG,
    required this.vitaminB12Mcg,
    required this.ironMg,
    required this.zincMg,
    required this.calciumMg,
    required this.omega3G,
    required this.vitaminDMcg,
  });

  final double calories;
  final double proteinG;
  final double carbsG;
  final double fatG;
  final double fiberG;
  final MicroAggregate vitaminB12Mcg;
  final MicroAggregate ironMg;
  final MicroAggregate zincMg;
  final MicroAggregate calciumMg;
  final MicroAggregate omega3G;
  final MicroAggregate vitaminDMcg;

  static const zero = NutrientSummary(
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    vitaminB12Mcg: MicroAggregate.zero,
    ironMg: MicroAggregate.zero,
    zincMg: MicroAggregate.zero,
    calciumMg: MicroAggregate.zero,
    omega3G: MicroAggregate.zero,
    vitaminDMcg: MicroAggregate.zero,
  );
}

class VeganScoreBreakdown {
  const VeganScoreBreakdown({
    required this.total,
    required this.caloriesScore,
    required this.caloriesMax,
    required this.caloriesLabel,
    required this.proteinScore,
    required this.proteinMax,
    required this.proteinLabel,
    required this.microsScore,
    required this.microsMax,
    required this.microsLabel,
    required this.fiberScore,
    required this.fiberMax,
    required this.fiberLabel,
    required this.streakScore,
    required this.streakMax,
    required this.streakLabel,
    required this.hasData,
  });

  final int total;
  final int caloriesScore;
  final int caloriesMax;
  final String caloriesLabel;
  final int proteinScore;
  final int proteinMax;
  final String proteinLabel;
  final int microsScore;
  final int microsMax;
  final String microsLabel;
  final int fiberScore;
  final int fiberMax;
  final String fiberLabel;
  final int streakScore;
  final int streakMax;
  final String streakLabel;
  final bool hasData;
}

VeganScoreBreakdown computeVeganScore({
  required NutrientSummary summary,
  required int calorieTarget,
  required int proteinTarget,
  required int streakCount,
  required Map<String, double> suppContributions,
  required String? sex,
}) {
  if (summary.calories == 0) {
    return const VeganScoreBreakdown(
      total: 0,
      caloriesScore: 0, caloriesMax: 30, caloriesLabel: 'Sin datos',
      proteinScore: 0, proteinMax: 25, proteinLabel: 'Sin datos',
      microsScore: 0, microsMax: 20, microsLabel: 'Sin datos',
      fiberScore: 0, fiberMax: 15, fiberLabel: 'Sin datos',
      streakScore: 0, streakMax: 10, streakLabel: 'Sin datos',
      hasData: false,
    );
  }

  // 1. Calories (30 pts)
  int calScore = 0;
  String calLabel = '';
  if (calorieTarget > 0) {
    final r = summary.calories / calorieTarget;
    if (r >= 0.85 && r <= 1.15) { calScore = 30; calLabel = 'En rango ✓'; }
    else if (r >= 0.70 && r <= 1.30) { calScore = 18; calLabel = 'Cerca'; }
    else if (r >= 0.50) { calScore = 8; calLabel = 'Lejos'; }
    else { calLabel = 'Muy lejos'; }
  }

  // 2. Protein (25 pts)
  int proScore = 0;
  String proLabel = '';
  if (proteinTarget > 0) {
    final r = summary.proteinG / proteinTarget;
    if (r >= 1.0) { proScore = 25; proLabel = 'Objetivo ✓'; }
    else if (r >= 0.80) { proScore = 18; proLabel = 'Casi'; }
    else if (r >= 0.60) { proScore = 10; proLabel = 'En progreso'; }
    else if (r >= 0.40) { proScore = 4; proLabel = 'Bajo'; }
    else { proLabel = 'Muy bajo'; }
  }

  // 3. Key micros (20 pts) — B12, Vit D, Iron
  final ironRda = sex == 'male' ? 8.0 : 18.0;
  final micros = [
    (agg: summary.vitaminB12Mcg, rda: 2.4, suppKey: 'vitamin_b12_mcg'),
    (agg: summary.vitaminDMcg, rda: 15.0, suppKey: 'vitamin_d_mcg'),
    (agg: summary.ironMg, rda: ironRda, suppKey: 'iron_mg'),
  ];
  const ptsEach = 20.0 / 3;
  double microScore = 0;
  int covered = 0;

  for (final m in micros) {
    final fromSupp = suppContributions[m.suppKey] ?? 0;
    final foodVal = m.agg.coverage >= 0.5 ? m.agg.value : 0;
    final ratio = m.rda > 0 ? (foodVal + fromSupp) / m.rda : 0;
    if (ratio >= 0.9) { microScore += ptsEach; covered++; }
    else if (ratio >= 0.5) { microScore += ptsEach * 0.5; }
  }

  // 4. Fiber (15 pts)
  int fiberScore = 0;
  String fiberLabel = '';
  final f = summary.fiberG;
  if (f >= 30) { fiberScore = 15; fiberLabel = 'Excelente ✓'; }
  else if (f >= 25) { fiberScore = 11; fiberLabel = 'Bien'; }
  else if (f >= 20) { fiberScore = 7; fiberLabel = 'En progreso'; }
  else if (f >= 10) { fiberScore = 3; fiberLabel = 'Bajo'; }
  else { fiberLabel = 'Muy bajo'; }

  // 5. Streak (10 pts)
  int streakScore = 0;
  String streakLabel = '';
  if (streakCount >= 7) { streakScore = 10; streakLabel = '$streakCount días 🔥'; }
  else if (streakCount >= 3) { streakScore = 7; streakLabel = '$streakCount días'; }
  else if (streakCount >= 1) {
    streakScore = 3;
    streakLabel = '$streakCount día${streakCount > 1 ? 's' : ''}';
  } else { streakLabel = 'Sin racha'; }

  final total = (calScore + proScore + microScore + fiberScore + streakScore)
      .round()
      .clamp(0, 100);

  return VeganScoreBreakdown(
    total: total,
    caloriesScore: calScore, caloriesMax: 30, caloriesLabel: calLabel,
    proteinScore: proScore, proteinMax: 25, proteinLabel: proLabel,
    microsScore: microScore.round(), microsMax: 20,
    microsLabel: '$covered/3 cubiertos',
    fiberScore: fiberScore, fiberMax: 15, fiberLabel: fiberLabel,
    streakScore: streakScore, streakMax: 10, streakLabel: streakLabel,
    hasData: true,
  );
}

import 'package:flutter/material.dart' show Color;

Color scoreColor(int score) {
  if (score >= 81) return const Color(0xFF16A34A);
  if (score >= 61) return const Color(0xFFF59E0B);
  if (score >= 41) return const Color(0xFFF97316);
  return const Color(0xFFEF4444);
}

String scoreLabel(int score) {
  if (score >= 81) return 'Excelente';
  if (score >= 61) return 'Bien';
  if (score >= 41) return 'En progreso';
  return 'Mejorable';
}
