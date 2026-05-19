import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/user_profile.dart';

class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  Future<UserProfile?> fetchProfile(String userId) async {
    final data = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (data == null) return null;
    return UserProfile.fromJson(data);
  }

  Future<UserProfile?> updateProfile(
    String userId,
    Map<String, dynamic> updates,
  ) async {
    final data = await _client
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    return UserProfile.fromJson(data);
  }

  Future<void> signIn(String email, String password) async {
    await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signUp(String email, String password) async {
    await _client.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  User? get currentUser => _client.auth.currentUser;

  Stream<AuthState> get authStateChanges =>
      _client.auth.onAuthStateChange;
}
