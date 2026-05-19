import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/presentation/auth_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/custom_foods/presentation/custom_foods_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/diary/presentation/add_food_page.dart';
import '../../features/diary/presentation/diary_page.dart';
import '../../features/onboarding/presentation/onboarding_page.dart';
import '../../features/product/presentation/product_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/progress/presentation/progress_page.dart';
import '../../features/recipes/presentation/recipes_page.dart';
import '../../features/search/presentation/search_page.dart';
import '../../features/shell/presentation/shell_page.dart';
import '../../features/supplements/presentation/supplements_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/diary',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isAuth = session != null;
      final isOnAuth = state.matchedLocation == '/auth';
      final isOnOnboarding = state.matchedLocation == '/onboarding';

      if (!isAuth && !isOnAuth) return '/auth';
      if (isAuth && isOnAuth) return '/diary';

      // If profile loaded and calorie_target not set → onboarding
      final profile = authState.profile;
      if (isAuth &&
          !isOnOnboarding &&
          profile != null &&
          profile.calorieTarget == null) {
        return '/onboarding';
      }

      return null;
    },
    refreshListenable: GoRouterRefreshStream(
      Supabase.instance.client.auth.onAuthStateChange.map((_) => null),
    ),
    routes: [
      GoRoute(
        path: '/auth',
        builder: (_, __) => const AuthPage(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingPage(),
      ),
      // Main shell with bottom nav
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => ShellPage(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/diary',
              builder: (_, __) => const DiaryPage(),
              routes: [
                GoRoute(
                  path: 'add',
                  builder: (context, state) {
                    final extra = state.extra as Map<String, dynamic>?;
                    return AddFoodPage(
                      mealType: extra?['mealType'] ?? 'breakfast',
                      date: extra?['date'] ?? '',
                    );
                  },
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/search',
              builder: (_, __) => const SearchPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/dashboard',
              builder: (_, __) => const DashboardPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/progress',
              builder: (_, __) => const ProgressPage(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile',
              builder: (_, __) => const ProfilePage(),
            ),
          ]),
        ],
      ),
      // Pushed over the shell (no bottom nav)
      GoRoute(
        path: '/product/:barcode',
        builder: (_, state) => ProductPage(
          barcode: state.pathParameters['barcode']!,
          extra: state.extra as Map<String, dynamic>?,
        ),
      ),
      GoRoute(
        path: '/supplements',
        builder: (_, __) => const SupplementsPage(),
      ),
      GoRoute(
        path: '/recipes',
        builder: (_, __) => const RecipesPage(),
      ),
      GoRoute(
        path: '/custom-foods',
        builder: (_, __) => const CustomFoodsPage(),
      ),
    ],
  );
});

/// Bridges a Stream into a [Listenable] so GoRouter can react to auth changes.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  late final dynamic _sub;

  @override
  void dispose() {
    // ignore: avoid_dynamic_calls
    _sub.cancel();
    super.dispose();
  }
}
