import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/nutrition_utils.dart';
import '../../../../shared/providers/supabase_provider.dart';
import '../../data/diary_repository.dart';
import '../../domain/food_log_entry.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

// ─── Repository ──────────────────────────────────────────────────────────────

final diaryRepositoryProvider = Provider<DiaryRepository>((ref) {
  return DiaryRepository(ref.watch(supabaseClientProvider));
});

// ─── Selected date ────────────────────────────────────────────────────────────

final selectedDateProvider = StateProvider<DateTime>(
  (ref) => DateTime.now(),
);

// ─── Entries for selected date ───────────────────────────────────────────────

class DiaryState {
  const DiaryState({
    this.entries = const [],
    this.isLoading = false,
    this.error,
  });

  final List<FoodLogEntry> entries;
  final bool isLoading;
  final String? error;

  DiaryState copyWith({
    List<FoodLogEntry>? entries,
    bool? isLoading,
    String? error,
  }) =>
      DiaryState(
        entries: entries ?? this.entries,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

final diaryProvider =
    StateNotifierProvider<DiaryNotifier, DiaryState>((ref) {
  return DiaryNotifier(
    ref.watch(diaryRepositoryProvider),
    ref,
  );
});

class DiaryNotifier extends StateNotifier<DiaryState> {
  DiaryNotifier(this._repo, this._ref) : super(const DiaryState()) {
    _ref.listen(selectedDateProvider, (_, date) {
      final userId = _ref.read(authStateProvider).user?.id;
      if (userId != null) fetchEntries(userId, date);
    }, fireImmediately: true);
  }

  final DiaryRepository _repo;
  final Ref _ref;

  Future<void> fetchEntries(String userId, DateTime date) async {
    state = state.copyWith(isLoading: true);
    try {
      final entries = await _repo.fetchEntries(
        userId,
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}',
      );
      state = state.copyWith(entries: entries, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<String?> addEntry(Map<String, dynamic> entryJson) async {
    try {
      final entry = await _repo.addEntry(entryJson);
      state = state.copyWith(entries: [...state.entries, entry]);
      // Refresh profile to update streak
      await _ref.read(authStateProvider.notifier).refreshProfile();
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  Future<void> deleteEntry(String id) async {
    await _repo.deleteEntry(id);
    state = state.copyWith(
      entries: state.entries.where((e) => e.id != id).toList(),
    );
  }

  Future<int> copyDayEntries(String fromDate, String toDate) async {
    final count = await _repo.copyDayEntries(fromDate, toDate);
    final selectedDate = _ref.read(selectedDateProvider);
    final userId = _ref.read(authStateProvider).user?.id;
    if (count > 0 && userId != null) {
      await fetchEntries(userId, selectedDate);
    }
    return count;
  }

  NutrientSummary get daySummary => _computeSummary(state.entries);

  static NutrientSummary _computeSummary(List<FoodLogEntry> entries) {
    if (entries.isEmpty) return NutrientSummary.zero;

    double calories = 0;
    double protein = 0;
    double carbs = 0;
    double fat = 0;
    double fiber = 0;

    MicroAggregate b12 = MicroAggregate.zero;
    MicroAggregate iron = MicroAggregate.zero;
    MicroAggregate zinc = MicroAggregate.zero;
    MicroAggregate calcium = MicroAggregate.zero;
    MicroAggregate omega3 = MicroAggregate.zero;
    MicroAggregate vitD = MicroAggregate.zero;

    for (final e in entries) {
      calories += e.calories;
      protein += e.proteinG;
      carbs += e.carbsG;
      fat += e.fatG;
      fiber += e.fiberG;

      b12 = _addMicro(b12, e.vitaminB12Mcg, e.vitaminB12Known);
      iron = _addMicro(iron, e.ironMg, e.ironKnown);
      zinc = _addMicro(zinc, e.zincMg, e.zincKnown);
      calcium = _addMicro(calcium, e.calciumMg, e.calciumKnown);
      omega3 = _addMicro(omega3, e.omega3G, e.omega3Known);
      vitD = _addMicro(vitD, e.vitaminDMcg, e.vitaminDKnown);
    }

    return NutrientSummary(
      calories: calories,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fiberG: fiber,
      vitaminB12Mcg: b12,
      ironMg: iron,
      zincMg: zinc,
      calciumMg: calcium,
      omega3G: omega3,
      vitaminDMcg: vitD,
    );
  }

  static MicroAggregate _addMicro(
    MicroAggregate current,
    double? value,
    bool known,
  ) {
    final isKnown = known && value != null;
    return MicroAggregate(
      value: current.value + (isKnown ? value : 0),
      knownEntries: current.knownEntries + (isKnown ? 1 : 0),
      totalEntries: current.totalEntries + 1,
      coverage: 0, // recalculated below
    );
  }
}

// ─── Derived: day summary ─────────────────────────────────────────────────────

final daySummaryProvider = Provider<NutrientSummary>((ref) {
  final notifier = ref.watch(diaryProvider.notifier);
  ref.watch(diaryProvider); // rebuild when entries change
  return notifier.daySummary;
});

// ─── Derived: recent foods ────────────────────────────────────────────────────

final recentFoodsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final userId = ref.watch(authStateProvider).user?.id;
  if (userId == null) return [];
  final repo = ref.watch(diaryRepositoryProvider);
  return repo.fetchRecentFoods(userId);
});

// ─── Derived: week data ───────────────────────────────────────────────────────

final weekDataProvider = FutureProvider<
    List<({String label, double calories, double protein, double carbs, double fat})>>(
  (ref) async {
    final userId = ref.watch(authStateProvider).user?.id;
    if (userId == null) return [];
    final repo = ref.watch(diaryRepositoryProvider);
    final today = DateTime.now();
    final from = today.subtract(const Duration(days: 6));
    final fromStr =
        '${from.year}-${from.month.toString().padLeft(2, '0')}-${from.day.toString().padLeft(2, '0')}';
    final toStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final raw = await repo.fetchWeekData(userId, fromStr, toStr);

    final dayMap = <String, ({double cal, double pro, double carb, double fat})>{};
    for (var i = 6; i >= 0; i--) {
      final d = today.subtract(Duration(days: i));
      final key =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      dayMap[key] = (cal: 0, pro: 0, carb: 0, fat: 0);
    }

    for (final row in raw) {
      final date = row['date'] as String;
      if (!dayMap.containsKey(date)) continue;
      final existing = dayMap[date]!;
      dayMap[date] = (
        cal: existing.cal + ((row['calories'] as num?)?.toDouble() ?? 0),
        pro: existing.pro + ((row['protein_g'] as num?)?.toDouble() ?? 0),
        carb: existing.carb + ((row['carbs_g'] as num?)?.toDouble() ?? 0),
        fat: existing.fat + ((row['fat_g'] as num?)?.toDouble() ?? 0),
      );
    }

    return dayMap.entries.map((e) {
      final date = DateTime.parse('${e.key}T12:00:00');
      final weekday = _weekdayShort(date.weekday);
      return (
        label: weekday,
        calories: e.value.cal,
        protein: e.value.pro,
        carbs: e.value.carb,
        fat: e.value.fat,
      );
    }).toList();
  },
);

String _weekdayShort(int weekday) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return days[(weekday - 1) % 7];
}
