# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Supabase / Ktor
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# mobile_scanner / ML Kit
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.vision.** { *; }

# Keep R8 from stripping Kotlin metadata
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Hive
-keep class com.hivedb.** { *; }
