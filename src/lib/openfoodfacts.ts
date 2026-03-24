import type { OpenFoodFactsProduct } from '@/types';

// .net domain has proper CORS headers (unlike .org which blocks localhost)
const BASE_URL = 'https://world.openfoodfacts.net';

export interface SearchResult {
  products: OpenFoodFactsProduct[];
  count: number;
  page: number;
}

function createTimeout(ms = 10000): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

/**
 * Fetch a product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const { signal, clear } = createTimeout();
  try {
    const res = await fetch(
      `${BASE_URL}/api/v2/product/${barcode}?fields=code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags,serving_size,serving_quantity`,
      { signal }
    );
    clear();
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.status === 1 && data.product) {
      return normalizeProduct(data.product);
    }
    return null;
  } catch (err) {
    clear();
    console.error('OpenFoodFacts barcode error:', err);
    return null;
  }
}

/**
 * Search products by text query
 */
export async function searchProducts(query: string, page = 1, veganOnly = false): Promise<SearchResult> {
  const { signal, clear } = createTimeout();
  try {
    let url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page=${page}&page_size=20&fields=code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags,serving_size,serving_quantity`;

    if (veganOnly) {
      url += '&tagtype_0=labels&tag_contains_0=contains&tag_0=en:vegan';
    }

    const res = await fetch(url, { signal });
    clear();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      products: (data.products || []).map(normalizeProduct).filter((p: OpenFoodFactsProduct) => p.product_name),
      count: data.count || 0,
      page: data.page || 1,
    };
  } catch (err: any) {
    clear();
    if (err.name === 'AbortError') {
      console.warn('OpenFoodFacts search timed out');
    } else {
      console.error('OpenFoodFacts search error:', err);
    }
    return { products: [], count: 0, page: 1 };
  }
}

/**
 * Search for vegan alternatives in the same category
 */
export async function findVeganAlternatives(categoryTag: string): Promise<OpenFoodFactsProduct[]> {
  const { signal, clear } = createTimeout();
  try {
    const res = await fetch(
      `${BASE_URL}/cgi/search.pl?tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(categoryTag)}&tagtype_1=labels&tag_contains_1=contains&tag_1=en:vegan&json=1&page_size=5&fields=code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags`,
      { signal }
    );
    clear();
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || []).map(normalizeProduct).filter((p: OpenFoodFactsProduct) => p.product_name);
  } catch {
    clear();
    return [];
  }
}

/**
 * Check if product is vegan based on labels
 */
export function isProductVegan(product: OpenFoodFactsProduct): boolean {
  return (product.labels_tags || []).some(
    (tag) => tag === 'en:vegan' || tag === 'en:vegan-society'
  );
}

/**
 * Normalize product data from API to ensure all fields exist
 */
function normalizeProduct(raw: any): OpenFoodFactsProduct {
  const n = raw.nutriments || {};
  return {
    code: raw.code || '',
    product_name: raw.product_name || '',
    brands: raw.brands || '',
    image_front_url: raw.image_front_url || '',
    categories_tags: raw.categories_tags || [],
    labels_tags: raw.labels_tags || [],
    nutriments: {
      'energy-kcal_100g': n['energy-kcal_100g'] || 0,
      proteins_100g: n.proteins_100g || 0,
      carbohydrates_100g: n.carbohydrates_100g || 0,
      fat_100g: n.fat_100g || 0,
      fiber_100g: n.fiber_100g || 0,
      sugars_100g: n.sugars_100g || 0,
      'saturated-fat_100g': n['saturated-fat_100g'] || 0,
      sodium_100g: n.sodium_100g || 0,
      // Micros — OFF stores everything in grams
      'vitamin-b12_100g': n['vitamin-b12_100g'] || 0,
      'iron_100g': n['iron_100g'] || 0,
      'zinc_100g': n['zinc_100g'] || 0,
      'calcium_100g': n['calcium_100g'] || 0,
      'vitamin-d_100g': n['vitamin-d_100g'] || 0,
    },
    serving_size: raw.serving_size || '',
    serving_quantity: raw.serving_quantity || 0,
  };
}
