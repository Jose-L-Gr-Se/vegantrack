import 'package:flutter/material.dart';

abstract final class AppColors {
  // Brand green — matches PWA's #22c55e / tailwind green-500
  static const green50  = Color(0xFFF0FDF4);
  static const green100 = Color(0xFFDCFCE7);
  static const green200 = Color(0xFFBBF7D0);
  static const green300 = Color(0xFF86EFAC);
  static const green400 = Color(0xFF4ADE80);
  static const green500 = Color(0xFF22C55E); // primary brand
  static const green600 = Color(0xFF16A34A);
  static const green700 = Color(0xFF15803D);
  static const green800 = Color(0xFF166534);
  static const green900 = Color(0xFF14532D);

  // Semantic
  static const success = green500;
  static const warning = Color(0xFFF59E0B);
  static const error   = Color(0xFFEF4444);
  static const info    = Color(0xFF3B82F6);

  // Score colors (matches veganScore.ts)
  static const scoreExcellent = Color(0xFF16A34A);
  static const scoreGood      = Color(0xFFF59E0B);
  static const scoreProgress  = Color(0xFFF97316);
  static const scorePoor      = Color(0xFFEF4444);

  // Meal type colors
  static const breakfast = Color(0xFFF59E0B);
  static const lunch     = Color(0xFF22C55E);
  static const dinner    = Color(0xFF8B5CF6);
  static const snack     = Color(0xFF3B82F6);

  // Macro colors
  static const protein = Color(0xFF3B82F6);
  static const carbs   = Color(0xFFF59E0B);
  static const fat     = Color(0xFFEC4899);
  static const fiber   = Color(0xFF22C55E);

  // Micro colors
  static const b12    = Color(0xFF8B5CF6);
  static const vitD   = Color(0xFFF59E0B);
  static const iron   = Color(0xFFEF4444);
  static const zinc   = Color(0xFF06B6D4);
  static const calcium= Color(0xFF3B82F6);
  static const omega3 = Color(0xFF10B981);
}
