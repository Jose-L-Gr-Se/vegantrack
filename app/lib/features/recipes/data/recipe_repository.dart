import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/recipe.dart';

class RecipeRepository {
  RecipeRepository(this._client);

  final SupabaseClient _client;

  Future<List<Recipe>> fetchRecipes(String userId) async {
    final data = await _client
        .from('recipes')
        .select('*, ingredients:recipe_ingredients(*)')
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return (data as List)
        .cast<Map<String, dynamic>>()
        .map(Recipe.fromJson)
        .toList();
  }

  Future<Recipe> createRecipe(Map<String, dynamic> json) async {
    final data = await _client
        .from('recipes')
        .insert(json)
        .select('*, ingredients:recipe_ingredients(*)')
        .single();
    return Recipe.fromJson(data);
  }

  Future<Recipe> updateRecipe(
    String id,
    Map<String, dynamic> updates,
  ) async {
    final data = await _client
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select('*, ingredients:recipe_ingredients(*)')
        .single();
    return Recipe.fromJson(data);
  }

  Future<void> deleteRecipe(String id) async {
    await _client.from('recipes').delete().eq('id', id);
  }

  Future<Recipe> addIngredient(
    String recipeId,
    Map<String, dynamic> ingredientJson,
  ) async {
    await _client.from('recipe_ingredients').insert({
      ...ingredientJson,
      'recipe_id': recipeId,
    });
    final data = await _client
        .from('recipes')
        .select('*, ingredients:recipe_ingredients(*)')
        .eq('id', recipeId)
        .single();
    return Recipe.fromJson(data);
  }

  Future<void> removeIngredient(String ingredientId) async {
    await _client
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);
  }
}
