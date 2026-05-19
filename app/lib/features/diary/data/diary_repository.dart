import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/food_log_entry.dart';

class DiaryRepository {
  DiaryRepository(this._client);

  final SupabaseClient _client;

  Future<List<FoodLogEntry>> fetchEntries(
    String userId,
    String date,
  ) async {
    final data = await _client
        .from('food_log')
        .select()
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at');
    return (data as List)
        .cast<Map<String, dynamic>>()
        .map(FoodLogEntry.fromJson)
        .toList();
  }

  Future<FoodLogEntry> addEntry(Map<String, dynamic> entryJson) async {
    final data = await _client
        .from('food_log')
        .insert(entryJson)
        .select()
        .single();
    // Fire-and-forget streak update
    _client.rpc('update_streak', params: {
      'p_user_id': entryJson['user_id'],
      'p_date': entryJson['date'],
    }).then((_) {}).catchError((_) {});
    return FoodLogEntry.fromJson(data);
  }

  Future<void> deleteEntry(String id) async {
    await _client.from('food_log').delete().eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchRecentFoods(
    String userId, {
    int limit = 100,
  }) async {
    final data = await _client
        .from('food_log')
        .select(
          'food_name, barcode, brand, image_url, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, sodium_mg, vitamin_b12_mcg, iron_mg, zinc_mg, calcium_mg, omega3_g, vitamin_d_mcg, vitamin_b12_known, iron_known, zinc_known, calcium_known, omega3_known, vitamin_d_known, is_vegan, serving_size_g',
        )
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(limit);
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> fetchWeekData(
    String userId,
    String fromDate,
    String toDate,
  ) async {
    final data = await _client
        .from('food_log')
        .select('date, calories, protein_g, carbs_g, fat_g')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate);
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<int> copyDayEntries(String fromDate, String toDate) async {
    final result = await _client.rpc('copy_day_entries', params: {
      'p_from_date': fromDate,
      'p_to_date': toDate,
    });
    return (result as num?)?.toInt() ?? 0;
  }

  Future<int> copyMealEntries(
    String userId,
    String fromDate,
    String toDate,
    String mealType,
  ) async {
    final data = await _client
        .from('food_log')
        .select()
        .eq('user_id', userId)
        .eq('date', fromDate)
        .eq('meal_type', mealType);

    final entries = (data as List).cast<Map<String, dynamic>>();
    if (entries.isEmpty) return 0;

    final toInsert = entries.map((e) {
      final copy = Map<String, dynamic>.from(e)
        ..remove('id')
        ..remove('created_at')
        ..remove('updated_at');
      copy['date'] = toDate;
      return copy;
    }).toList();

    await _client.from('food_log').insert(toInsert);
    return toInsert.length;
  }
}
