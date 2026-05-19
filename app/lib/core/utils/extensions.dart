import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

extension DateTimeX on DateTime {
  String get isoDate => DateFormat('yyyy-MM-dd').format(this);

  String get weekdayShort =>
      DateFormat('EEE', 'es_ES').format(this).capitalize();

  String get fullDate =>
      DateFormat('d MMM yyyy', 'es_ES').format(this).capitalize();

  String get dayMonthShort =>
      DateFormat('d MMM', 'es_ES').format(this).capitalize();

  bool isSameDay(DateTime other) =>
      year == other.year && month == other.month && day == other.day;
}

extension StringX on String {
  String capitalize() =>
      isEmpty ? this : this[0].toUpperCase() + substring(1);

  String get titleCase => split(' ').map((w) => w.capitalize()).join(' ');
}

extension DoubleX on double {
  /// Round to [decimals] decimal places
  double roundTo(int decimals) {
    final factor = _pow10(decimals);
    return (this * factor).round() / factor;
  }

  String toNutrient({int decimals = 1}) {
    if (this == roundTo(0)) return toInt().toString();
    return roundTo(decimals).toString();
  }

  double _pow10(int n) {
    double r = 1;
    for (var i = 0; i < n; i++) {
      r *= 10;
    }
    return r;
  }
}

extension NumX on num {
  bool get isZeroOrNeg => this <= 0;
}

extension ContextX on BuildContext {
  ColorScheme get colors => Theme.of(this).colorScheme;
  TextTheme get text => Theme.of(this).textTheme;

  void showSnack(String message, {bool isError = false}) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? colors.error : null,
      ),
    );
  }
}
