import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppTypography {
  static TextTheme textTheme(ColorScheme colors) {
    // Body / UI — DM Sans (matches PWA)
    final base = GoogleFonts.dmSansTextTheme().apply(
      bodyColor: colors.onSurface,
      displayColor: colors.onSurface,
    );

    // Display headings — Bricolage Grotesque (matches PWA)
    final display = GoogleFonts.bricolageGrotesque();

    return base.copyWith(
      displayLarge: display.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
        color: colors.onSurface,
      ),
      displayMedium: display.copyWith(
        fontSize: 26,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: colors.onSurface,
      ),
      displaySmall: display.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: colors.onSurface,
      ),
      headlineLarge: display.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: colors.onSurface,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
      ),
      bodyLarge: base.bodyLarge?.copyWith(fontSize: 16),
      bodyMedium: base.bodyMedium?.copyWith(fontSize: 14),
      bodySmall: base.bodySmall?.copyWith(fontSize: 12),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.1,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.5,
      ),
    );
  }
}
