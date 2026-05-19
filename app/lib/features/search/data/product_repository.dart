import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/network/off_client.dart';

class ProductRepository {
  ProductRepository(this._offClient, this._supabase);

  final OFFClient _offClient;
  final SupabaseClient _supabase;

  Future<OFFProduct?> getByBarcode(String barcode) =>
      _offClient.getProductByBarcode(barcode);

  Future<OFFSearchResult> search(
    String query, {
    int page = 1,
    bool veganOnly = false,
  }) =>
      _offClient.searchProducts(query, page: page, veganOnly: veganOnly);
}
