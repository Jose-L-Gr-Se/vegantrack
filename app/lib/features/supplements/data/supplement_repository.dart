import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/supplement.dart';

class SupplementRepository {
  SupplementRepository(this._client);

  final SupabaseClient _client;

  Future<List<Supplement>> fetchSupplements(String userId) async {
    final supp = await _client
        .from('supplements')
        .select()
        .eq('user_id', userId)
        .order('sort_order');

    final today = DateTime.now();
    final dateStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final logs = await _client
        .from('supplement_logs')
        .select('supplement_id')
        .eq('user_id', userId)
        .eq('date', dateStr);

    final takenIds = {
      for (final l in (logs as List)) l['supplement_id'] as String
    };

    return (supp as List)
        .cast<Map<String, dynamic>>()
        .map((j) => Supplement.fromJson(j, takenToday: takenIds.contains(j['id'])))
        .toList();
  }

  Future<Supplement> createSupplement(Map<String, dynamic> json) async {
    final data = await _client
        .from('supplements')
        .insert(json)
        .select()
        .single();
    return Supplement.fromJson(data);
  }

  Future<Supplement> updateSupplement(
    String id,
    Map<String, dynamic> updates,
  ) async {
    final data = await _client
        .from('supplements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return Supplement.fromJson(data);
  }

  Future<void> deleteSupplement(String id) async {
    await _client.from('supplements').delete().eq('id', id);
  }

  Future<void> toggleTaken({
    required String userId,
    required String supplementId,
    required bool taken,
  }) async {
    final today = DateTime.now();
    final dateStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    if (taken) {
      await _client.from('supplement_logs').upsert({
        'user_id': userId,
        'supplement_id': supplementId,
        'date': dateStr,
        'taken_at': DateTime.now().toIso8601String(),
      });
    } else {
      await _client
          .from('supplement_logs')
          .delete()
          .eq('user_id', userId)
          .eq('supplement_id', supplementId)
          .eq('date', dateStr);
    }
  }
}
