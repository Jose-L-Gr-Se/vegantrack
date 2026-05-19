import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/weight_log.dart';

class WeightRepository {
  WeightRepository(this._client);

  final SupabaseClient _client;

  Future<List<WeightLog>> fetchLogs(String userId) async {
    final data = await _client
        .from('weight_logs')
        .select()
        .eq('user_id', userId)
        .order('date', ascending: false)
        .limit(90);
    return (data as List)
        .cast<Map<String, dynamic>>()
        .map(WeightLog.fromJson)
        .toList();
  }

  Future<WeightLog> addLog(Map<String, dynamic> json) async {
    final data = await _client
        .from('weight_logs')
        .insert(json)
        .select()
        .single();
    return WeightLog.fromJson(data);
  }

  Future<void> deleteLog(String id) async {
    await _client.from('weight_logs').delete().eq('id', id);
  }
}
