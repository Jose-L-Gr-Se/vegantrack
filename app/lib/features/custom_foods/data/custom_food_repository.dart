import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/custom_food.dart';

class CustomFoodRepository {
  CustomFoodRepository(this._client);

  final SupabaseClient _client;

  Future<List<CustomFood>> fetchAll(String userId) async {
    final data = await _client
        .from('custom_foods')
        .select()
        .eq('user_id', userId)
        .order('name');
    return (data as List)
        .cast<Map<String, dynamic>>()
        .map(CustomFood.fromJson)
        .toList();
  }

  Future<CustomFood> create(Map<String, dynamic> json) async {
    final data = await _client
        .from('custom_foods')
        .insert(json)
        .select()
        .single();
    return CustomFood.fromJson(data);
  }

  Future<CustomFood> update(String id, Map<String, dynamic> updates) async {
    final data = await _client
        .from('custom_foods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return CustomFood.fromJson(data);
  }

  Future<void> delete(String id) async {
    await _client.from('custom_foods').delete().eq('id', id);
  }
}
