import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/off_client.dart';
import '../../../../shared/providers/supabase_provider.dart';
import '../../data/product_repository.dart';

final offClientProvider = Provider<OFFClient>((ref) => OFFClient());

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(
    ref.watch(offClientProvider),
    ref.watch(supabaseClientProvider),
  );
});

// ─── Search state ────────────────────────────────────────────────────────────

class SearchState {
  const SearchState({
    this.query = '',
    this.products = const [],
    this.isLoading = false,
    this.veganOnly = false,
    this.page = 1,
    this.totalCount = 0,
    this.error,
  });

  final String query;
  final List<OFFProduct> products;
  final bool isLoading;
  final bool veganOnly;
  final int page;
  final int totalCount;
  final String? error;

  bool get hasMore => products.length < totalCount;

  SearchState copyWith({
    String? query,
    List<OFFProduct>? products,
    bool? isLoading,
    bool? veganOnly,
    int? page,
    int? totalCount,
    String? error,
  }) =>
      SearchState(
        query: query ?? this.query,
        products: products ?? this.products,
        isLoading: isLoading ?? this.isLoading,
        veganOnly: veganOnly ?? this.veganOnly,
        page: page ?? this.page,
        totalCount: totalCount ?? this.totalCount,
        error: error,
      );
}

final searchProvider =
    StateNotifierProvider<SearchNotifier, SearchState>((ref) {
  return SearchNotifier(ref.watch(productRepositoryProvider));
});

class SearchNotifier extends StateNotifier<SearchState> {
  SearchNotifier(this._repo) : super(const SearchState());

  final ProductRepository _repo;

  Future<void> search(String query, {bool veganOnly = false}) async {
    if (query.trim().isEmpty) {
      state = const SearchState();
      return;
    }
    state = SearchState(query: query, isLoading: true, veganOnly: veganOnly);
    try {
      final result = await _repo.search(
        query,
        page: 1,
        veganOnly: veganOnly,
      );
      state = state.copyWith(
        products: result.products,
        totalCount: result.count,
        page: 1,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    state = state.copyWith(isLoading: true);
    try {
      final result = await _repo.search(
        state.query,
        page: state.page + 1,
        veganOnly: state.veganOnly,
      );
      state = state.copyWith(
        products: [...state.products, ...result.products],
        page: state.page + 1,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void toggleVeganOnly() {
    search(state.query, veganOnly: !state.veganOnly);
  }

  void clear() => state = const SearchState();
}
