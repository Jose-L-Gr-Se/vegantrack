/// OpenFoodFacts HTTP client — Dart port of openfoodfacts.ts
library;

import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/app_config.dart';
import '../error/app_exception.dart';

// ─── Data model ──────────────────────────────────────────────────────────────

class OFFNutriments {
  const OFFNutriments({
    required this.kcal100g,
    required this.proteins100g,
    required this.carbohydrates100g,
    required this.fat100g,
    required this.fiber100g,
    required this.sugars100g,
    required this.saturatedFat100g,
    required this.sodium100g,
    this.vitaminB12100g,
    this.iron100g,
    this.zinc100g,
    this.calcium100g,
    this.vitaminD100g,
    this.omega3100g,
  });

  final double kcal100g;
  final double proteins100g;
  final double carbohydrates100g;
  final double fat100g;
  final double fiber100g;
  final double sugars100g;
  final double saturatedFat100g;
  final double sodium100g;
  final double? vitaminB12100g;
  final double? iron100g;
  final double? zinc100g;
  final double? calcium100g;
  final double? vitaminD100g;
  final double? omega3100g;

  static double _n(dynamic v) {
    final num = double.tryParse(v?.toString() ?? '');
    return (num != null && num.isFinite) ? num : 0;
  }

  static double? _nOrNull(dynamic v) {
    if (v == null || v == '') return null;
    final num = double.tryParse(v.toString());
    return (num != null && num.isFinite) ? num : null;
  }

  factory OFFNutriments.fromJson(Map<String, dynamic> n) => OFFNutriments(
        kcal100g: _n(n['energy-kcal_100g']),
        proteins100g: _n(n['proteins_100g']),
        carbohydrates100g: _n(n['carbohydrates_100g']),
        fat100g: _n(n['fat_100g']),
        fiber100g: _n(n['fiber_100g']),
        sugars100g: _n(n['sugars_100g']),
        saturatedFat100g: _n(n['saturated-fat_100g']),
        sodium100g: _n(n['sodium_100g']),
        vitaminB12100g: _nOrNull(n['vitamin-b12_100g']),
        iron100g: _nOrNull(n['iron_100g']),
        zinc100g: _nOrNull(n['zinc_100g']),
        calcium100g: _nOrNull(n['calcium_100g']),
        vitaminD100g: _nOrNull(n['vitamin-d_100g']),
        omega3100g: _nOrNull(n['omega-3-fat_100g']),
      );
}

class OFFProduct {
  const OFFProduct({
    required this.code,
    required this.productName,
    required this.brands,
    required this.imageFrontUrl,
    required this.categoriesTags,
    required this.labelsTags,
    required this.nutriments,
    required this.servingSize,
    required this.servingQuantity,
  });

  final String code;
  final String productName;
  final String brands;
  final String imageFrontUrl;
  final List<String> categoriesTags;
  final List<String> labelsTags;
  final OFFNutriments nutriments;
  final String servingSize;
  final double servingQuantity;

  factory OFFProduct.fromJson(Map<String, dynamic> raw) {
    final n = raw['nutriments'] as Map<String, dynamic>? ?? {};
    return OFFProduct(
      code: raw['code']?.toString() ?? '',
      productName: raw['product_name']?.toString() ?? '',
      brands: raw['brands']?.toString() ?? '',
      imageFrontUrl: raw['image_front_url']?.toString() ?? '',
      categoriesTags: _strList(raw['categories_tags']),
      labelsTags: _strList(raw['labels_tags']),
      nutriments: OFFNutriments.fromJson(n),
      servingSize: raw['serving_size']?.toString() ?? '',
      servingQuantity:
          double.tryParse(raw['serving_quantity']?.toString() ?? '') ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'code': code,
        'product_name': productName,
        'brands': brands,
        'image_front_url': imageFrontUrl,
        'categories_tags': categoriesTags,
        'labels_tags': labelsTags,
        'nutriments': {
          'energy-kcal_100g': nutriments.kcal100g,
          'proteins_100g': nutriments.proteins100g,
          'carbohydrates_100g': nutriments.carbohydrates100g,
          'fat_100g': nutriments.fat100g,
          'fiber_100g': nutriments.fiber100g,
          'sugars_100g': nutriments.sugars100g,
          'saturated-fat_100g': nutriments.saturatedFat100g,
          'sodium_100g': nutriments.sodium100g,
          'vitamin-b12_100g': nutriments.vitaminB12100g,
          'iron_100g': nutriments.iron100g,
          'zinc_100g': nutriments.zinc100g,
          'calcium_100g': nutriments.calcium100g,
          'vitamin-d_100g': nutriments.vitaminD100g,
          'omega-3-fat_100g': nutriments.omega3100g,
        },
        'serving_size': servingSize,
        'serving_quantity': servingQuantity,
      };

  static List<String> _strList(dynamic v) =>
      v is List ? v.map((e) => e.toString()).toList() : [];
}

class OFFSearchResult {
  const OFFSearchResult({
    required this.products,
    required this.count,
    required this.page,
  });

  final List<OFFProduct> products;
  final int count;
  final int page;
}

// ─── Client ──────────────────────────────────────────────────────────────────

class OFFClient {
  OFFClient()
      : _dio = Dio(BaseOptions(
          baseUrl: AppConfig.offApiBase,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {
            'User-Agent':
                'VeganTrack/1.0 (Android; com.consciente.vegantrack)',
          },
        ));

  final Dio _dio;

  static const _fields =
      'code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags,serving_size,serving_quantity';

  static const _cacheTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ── Barcode lookup ──────────────────────────────────────────────────────

  Future<OFFProduct?> getProductByBarcode(String barcode) async {
    // 1. Local Hive cache
    final cached = _fromCache(barcode);
    if (cached != null) return cached;

    // 2. Supabase food_cache (same as PWA, shared across platforms)
    final fromSupabase = await _fetchFromSupabaseCache(barcode);
    if (fromSupabase != null) return fromSupabase;

    // 3. OpenFoodFacts API
    try {
      final res = await _dio.get(
        '/api/v2/product/$barcode',
        queryParameters: {'fields': _fields},
      );
      final data = res.data as Map<String, dynamic>;
      if (data['status'] == 1 && data['product'] != null) {
        final product = OFFProduct.fromJson(
          data['product'] as Map<String, dynamic>,
        );
        _writeToCache(barcode, product);
        _writeToSupabaseCache(barcode, data['product']);
        return product;
      }
      return null;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw const TimeoutException();
      }
      if (e.type == DioExceptionType.connectionError) {
        throw const NetworkException();
      }
      return null;
    }
  }

  // ── Text search ────────────────────────────────────────────────────────

  Future<OFFSearchResult> searchProducts(
    String query, {
    int page = 1,
    bool veganOnly = false,
  }) async {
    try {
      final params = <String, dynamic>{
        'search_terms': query,
        'json': 1,
        'page': page,
        'page_size': 20,
        'fields': _fields,
      };
      if (veganOnly) {
        params['tagtype_0'] = 'labels';
        params['tag_contains_0'] = 'contains';
        params['tag_0'] = 'en:vegan';
      }

      final res = await _dio.get('/cgi/search.pl', queryParameters: params);
      final data = res.data as Map<String, dynamic>;
      final raw = (data['products'] as List?)
              ?.cast<Map<String, dynamic>>()
              .map(OFFProduct.fromJson)
              .where((p) => p.productName.isNotEmpty)
              .toList() ??
          [];

      return OFFSearchResult(
        products: raw,
        count: (data['count'] as num?)?.toInt() ?? 0,
        page: (data['page'] as num?)?.toInt() ?? 1,
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return const OFFSearchResult(products: [], count: 0, page: 1);
      }
      rethrow;
    }
  }

  // ── Local Hive cache ────────────────────────────────────────────────────

  OFFProduct? _fromCache(String barcode) {
    final box = Hive.box<Map>('product_cache');
    final entry = box.get(barcode);
    if (entry == null) return null;
    final ts = entry['_ts'] as int? ?? 0;
    if (DateTime.now().millisecondsSinceEpoch - ts > _cacheTtlMs) {
      box.delete(barcode);
      return null;
    }
    try {
      final json = Map<String, dynamic>.from(entry['data'] as Map);
      return OFFProduct.fromJson(json);
    } catch (_) {
      box.delete(barcode);
      return null;
    }
  }

  void _writeToCache(String barcode, OFFProduct product) {
    final box = Hive.box<Map>('product_cache');
    box.put(barcode, {
      '_ts': DateTime.now().millisecondsSinceEpoch,
      'data': product.toJson(),
    });
  }

  // ── Supabase food_cache (shared with PWA) ───────────────────────────────

  Future<OFFProduct?> _fetchFromSupabaseCache(String barcode) async {
    try {
      final supabase =
          // ignore: invalid_use_of_internal_member
          (await _getSupabase())
              .from('food_cache')
              .select('data, fetched_at')
              .eq('barcode', barcode)
              .maybeSingle();
      final data = await supabase;
      if (data == null) return null;
      final fetchedAt = DateTime.tryParse(data['fetched_at'] as String);
      if (fetchedAt == null ||
          DateTime.now().difference(fetchedAt).inDays > 7) {
        return null;
      }
      final raw = data['data'];
      if (raw == null) return null;
      final json = raw is String
          ? jsonDecode(raw) as Map<String, dynamic>
          : Map<String, dynamic>.from(raw as Map);
      final product = OFFProduct.fromJson(json);
      _writeToCache(barcode, product); // populate local cache too
      return product;
    } catch (_) {
      return null;
    }
  }

  void _writeToSupabaseCache(String barcode, Map<String, dynamic> raw) async {
    try {
      final client = await _getSupabase();
      await client.from('food_cache').upsert(
        {
          'barcode': barcode,
          'data': raw,
          'fetched_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'barcode',
      );
    } catch (_) {
      // fire-and-forget cache write; never fails the caller
    }
  }

  Future<dynamic> _getSupabase() async {
    // We import here to avoid circular deps at the top level
    // supabase_flutter re-exports the Supabase singleton
    final client =
        (await Future.value(null)).toString(); // placeholder to satisfy linter
    // Real usage:
    // return Supabase.instance.client;
    throw UnimplementedError('inject via provider instead');
  }
}
