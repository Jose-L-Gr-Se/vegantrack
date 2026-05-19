import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/providers/supabase_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/supplement_repository.dart';
import '../../domain/supplement.dart';

final supplementRepositoryProvider = Provider<SupplementRepository>((ref) {
  return SupplementRepository(ref.watch(supabaseClientProvider));
});

final supplementsProvider =
    StateNotifierProvider<SupplementsNotifier, AsyncValue<List<Supplement>>>(
  (ref) => SupplementsNotifier(
    ref.watch(supplementRepositoryProvider),
    ref.watch(authStateProvider).user?.id,
  ),
);

class SupplementsNotifier
    extends StateNotifier<AsyncValue<List<Supplement>>> {
  SupplementsNotifier(this._repo, this._userId)
      : super(const AsyncValue.loading()) {
    if (_userId != null) load();
  }

  final SupplementRepository _repo;
  final String? _userId;

  Future<void> load() async {
    if (_userId == null) return;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => _repo.fetchSupplements(_userId!),
    );
  }

  Future<void> create(Map<String, dynamic> json) async {
    final supp = await _repo.createSupplement(json);
    state = state.whenData((list) => [...list, supp]);
  }

  Future<void> update(String id, Map<String, dynamic> updates) async {
    final updated = await _repo.updateSupplement(id, updates);
    state = state.whenData(
      (list) => list.map((s) => s.id == id ? updated : s).toList(),
    );
  }

  Future<void> delete(String id) async {
    await _repo.deleteSupplement(id);
    state = state.whenData((list) => list.where((s) => s.id != id).toList());
  }

  Future<void> toggleTaken(String supplementId, bool taken) async {
    if (_userId == null) return;
    await _repo.toggleTaken(
      userId: _userId!,
      supplementId: supplementId,
      taken: taken,
    );
    state = state.whenData(
      (list) => list
          .map((s) => s.id == supplementId ? s.copyWith(takenToday: taken) : s)
          .toList(),
    );
  }

  Map<String, double> get todayContributions {
    final supp = state.valueOrNull ?? [];
    final result = <String, double>{};
    for (final s in supp) {
      if (!s.takenToday || !s.isActive || s.nutrientKey == null) continue;
      final key = s.nutrientKey!.dbValue;
      result[key] = (result[key] ?? 0) + s.doseAmount;
    }
    return result;
  }
}
