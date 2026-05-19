import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../shared/providers/supabase_provider.dart';
import '../../data/auth_repository.dart';
import '../../domain/user_profile.dart';

// ─── Repository ──────────────────────────────────────────────────────────────

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

// ─── Auth state (session + profile) ─────────────────────────────────────────

class AuthState {
  const AuthState({
    this.user,
    this.profile,
    this.isLoading = false,
    this.error,
  });

  final User? user;
  final UserProfile? profile;
  final bool isLoading;
  final String? error;

  AuthState copyWith({
    User? user,
    UserProfile? profile,
    bool? isLoading,
    String? error,
    bool clearUser = false,
    bool clearProfile = false,
    bool clearError = false,
  }) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        profile: clearProfile ? null : (profile ?? this.profile),
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo) : super(const AuthState(isLoading: true)) {
    _init();
  }

  final AuthRepository _repo;

  void _init() {
    final user = _repo.currentUser;
    if (user != null) {
      state = state.copyWith(user: user);
      _loadProfile(user.id);
    } else {
      state = state.copyWith(isLoading: false);
    }

    _repo.authStateChanges.listen((event) {
      final u = event.session?.user;
      if (u == null) {
        state = AuthState();
      } else {
        state = state.copyWith(user: u);
        _loadProfile(u.id);
      }
    });
  }

  Future<void> _loadProfile(String userId) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final profile = await _repo.fetchProfile(userId);
      state = state.copyWith(profile: profile, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<String?> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.signIn(email, password);
      return null;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return e.message;
    } catch (e) {
      final msg = 'Error inesperado. Inténtalo de nuevo.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<String?> signUp(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.signUp(email, password);
      return null;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return e.message;
    } catch (e) {
      const msg = 'Error inesperado. Inténtalo de nuevo.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<void> signOut() => _repo.signOut();

  Future<void> updateProfile(Map<String, dynamic> updates) async {
    final userId = state.user?.id;
    if (userId == null) return;
    state = state.copyWith(isLoading: true);
    try {
      final updated = await _repo.updateProfile(userId, updates);
      state = state.copyWith(profile: updated, isLoading: false);
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> refreshProfile() async {
    final userId = state.user?.id;
    if (userId == null) return;
    await _loadProfile(userId);
  }
}
