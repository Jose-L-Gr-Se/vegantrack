import 'package:equatable/equatable.dart';

class WeightLog extends Equatable {
  const WeightLog({
    required this.id,
    required this.userId,
    required this.date,
    required this.weightKg,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String date;
  final double weightKg;
  final String? note;
  final DateTime createdAt;

  factory WeightLog.fromJson(Map<String, dynamic> j) => WeightLog(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        date: j['date'] as String,
        weightKg: double.tryParse(j['weight_kg']?.toString() ?? '') ?? 0,
        note: j['note'] as String?,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ??
            DateTime.now(),
      );

  Map<String, dynamic> toInsertJson() => {
        'user_id': userId,
        'date': date,
        'weight_kg': weightKg,
        'note': note,
      };

  @override
  List<Object?> get props => [id, date, weightKg];
}
