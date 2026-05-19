/// Central place for all compile-time configuration.
/// Replace the placeholder values with your actual Supabase credentials
/// (same project used by the PWA).
///
/// For production, inject via --dart-define:
///   flutter run \
///     --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///     --dart-define=SUPABASE_ANON_KEY=eyJ...
abstract final class AppConfig {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://YOUR_PROJECT.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'YOUR_ANON_KEY',
  );

  static const offApiBase = 'https://world.openfoodfacts.net';

  /// Free tier: 14-day diary history. Pro: unlimited.
  static const freeTierHistoryDays = 14;

  /// Maximum number of supplements for free tier
  static const freeTierMaxSupplements = 3;
}
