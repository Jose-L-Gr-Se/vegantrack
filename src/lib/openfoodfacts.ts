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

// ─── VEGAN ALTERNATIVES SYSTEM (Mapping + Text Fallback) ────────────────────

/**
 * Manual mapping: keywords found in categories_tags or product_name
 * → specific vegan search queries that actually return results on OFF.
 *
 * Each entry can have multiple keywords (matched against lowercase categories
 * and product name) and one or more search queries to try in order.
 */
const VEGAN_ALTERNATIVES_MAP: {
  keywords: string[];
  queries: string[];
}[] = [
  // ── Lácteos ──────────────────────────────────────────────────────────────
  {
    keywords: ['yogurt', 'yogur', 'yoghurt', 'yaourt', 'fromage-blanc'],
    queries: ['yogur vegetal', 'yogur soja', 'yogur avena'],
  },
  {
    keywords: ['cheese', 'queso', 'fromage', 'käse', 'mozzarella', 'cheddar', 'gouda', 'emmental', 'brie', 'camembert', 'manchego', 'parmigiano', 'parmesan'],
    queries: ['queso vegano', 'queso vegetal'],
  },
  {
    keywords: ['milk', 'leche', 'lait', 'milch', 'whole-milk', 'semi-skimmed-milk', 'skimmed-milk'],
    queries: ['bebida vegetal', 'leche avena', 'leche soja', 'leche almendra'],
  },
  {
    keywords: ['cream', 'nata', 'crème', 'crema-de-leche', 'heavy-cream', 'whipping-cream'],
    queries: ['nata vegetal', 'crema vegetal cocina'],
  },
  {
    keywords: ['butter', 'mantequilla', 'beurre', 'margarina'],
    queries: ['margarina vegetal', 'mantequilla vegana'],
  },
  {
    keywords: ['ice-cream', 'helado', 'glace', 'gelato'],
    queries: ['helado vegano', 'helado vegetal'],
  },
  // ── Carnes y embutidos ───────────────────────────────────────────────────
  {
    keywords: ['ham', 'jamón', 'jamon', 'jambon', 'prosciutto'],
    queries: ['fiambre vegetal', 'jamón vegano', 'embutido vegetal'],
  },
  {
    keywords: ['sausage', 'salchicha', 'chorizo', 'saucisse', 'frankfurter', 'wurst', 'hot-dog'],
    queries: ['salchicha vegetal', 'salchicha vegana'],
  },
  {
    keywords: ['burger', 'hamburguesa', 'patty', 'steak-hache'],
    queries: ['hamburguesa vegetal', 'burger vegana'],
  },
  {
    keywords: ['chicken', 'pollo', 'poulet', 'nugget', 'escalope'],
    queries: ['pollo vegetal', 'nuggets vegetales', 'heura'],
  },
  {
    keywords: ['meat', 'carne', 'viande', 'beef', 'ternera', 'cerdo', 'pork', 'porc'],
    queries: ['carne vegetal', 'proteína vegetal', 'seitán'],
  },
  {
    keywords: ['bacon', 'panceta', 'tocino'],
    queries: ['bacon vegano', 'bacon vegetal'],
  },
  // ── Pescado y marisco ────────────────────────────────────────────────────
  {
    keywords: ['tuna', 'atún', 'atun', 'thon'],
    queries: ['atún vegano', 'atún vegetal'],
  },
  {
    keywords: ['fish', 'pescado', 'poisson', 'salmon', 'salmón', 'sardine', 'anchoa', 'anchovy'],
    queries: ['pescado vegano', 'pescado vegetal'],
  },
  {
    keywords: ['shrimp', 'prawn', 'gamba', 'crevette', 'marisco', 'seafood'],
    queries: ['marisco vegano', 'alternativa marisco vegetal'],
  },
  // ── Huevos ───────────────────────────────────────────────────────────────
  {
    keywords: ['egg', 'huevo', 'oeuf', 'eier'],
    queries: ['huevo vegano', 'sustituto huevo vegetal'],
  },
  // ── Otros comunes ────────────────────────────────────────────────────────
  {
    keywords: ['mayonnaise', 'mayonesa', 'mayo'],
    queries: ['mayonesa vegana', 'veganesa'],
  },
  {
    keywords: ['chocolate-milk', 'batido', 'milkshake', 'cacao-milk'],
    queries: ['batido vegetal', 'batido avena cacao'],
  },
  {
    keywords: ['pizza'],
    queries: ['pizza vegana', 'pizza vegetal'],
  },
];

/**
 * Try to find a mapped search query for the product.
 * Checks against categories_tags and product_name (both lowercased).
 */
function findMappedQueries(product: OpenFoodFactsProduct): string[] | null {
  const haystack = [
    ...product.categories_tags.map((t) => t.toLowerCase()),
    product.product_name.toLowerCase(),
  ].join(' ');

  for (const mapping of VEGAN_ALTERNATIVES_MAP) {
    for (const kw of mapping.keywords) {
      if (haystack.includes(kw)) {
        return mapping.queries;
      }
    }
  }
  return null;
}

/**
 * Extract a generic product term from the name for text fallback.
 * e.g. "Danone Yogur Natural" → "yogur"
 *      "Queso Tierno García Baquero" → "queso"
 */
function extractGenericTerm(productName: string): string | null {
  const name = productName.toLowerCase();

  // Common generic food terms in Spanish and English
  const genericTerms = [
    'yogur', 'yogurt', 'queso', 'leche', 'nata', 'crema', 'mantequilla',
    'helado', 'jamón', 'jamon', 'salchicha', 'chorizo', 'hamburguesa',
    'burger', 'nugget', 'pollo', 'carne', 'atún', 'atun', 'pescado',
    'salmón', 'salmon', 'huevo', 'mayonesa', 'pizza', 'bacon',
    'embutido', 'fiambre', 'salami', 'mortadela', 'paté', 'pate',
    'mozzarella', 'cheddar', 'batido',
    // English
    'cheese', 'milk', 'cream', 'butter', 'chicken', 'meat', 'fish',
    'tuna', 'egg', 'sausage', 'ham', 'ice cream',
  ];

  for (const term of genericTerms) {
    if (name.includes(term)) {
      return term;
    }
  }
  return null;
}

/**
 * Search for vegan alternatives to a non-vegan product.
 *
 * Strategy:
 *   1. Check the mapping table for a known category → specific vegan search queries
 *   2. If no mapping found, extract a generic term from the product name and search "[term] vegano/vegetal"
 *   3. Search using text (search_terms) instead of category+label filter for much better results
 *   4. Filter results to prioritize products with vegan labels but don't require it
 */
export async function findVeganAlternatives(product: OpenFoodFactsProduct): Promise<OpenFoodFactsProduct[]> {
  // Layer 1: Mapping table
  const mappedQueries = findMappedQueries(product);

  // Layer 2: Text fallback
  const fallbackQueries: string[] = [];
  if (!mappedQueries) {
    const generic = extractGenericTerm(product.product_name);
    if (generic) {
      fallbackQueries.push(`${generic} vegano`, `${generic} vegetal`);
    }
  }

  const queries = mappedQueries || fallbackQueries;
  if (queries.length === 0) return [];

  // Try queries in order, stop as soon as we get decent results
  const allResults: OpenFoodFactsProduct[] = [];
  const seenCodes = new Set<string>();

  for (const q of queries) {
    if (allResults.length >= 5) break; // We have enough

    const { signal, clear } = createTimeout(8000);
    try {
      const res = await fetch(
        `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=10&fields=code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags,serving_size,serving_quantity`,
        { signal }
      );
      clear();
      if (!res.ok) continue;
      const data = await res.json();

      const products: OpenFoodFactsProduct[] = (data.products || [])
        .map(normalizeProduct)
        .filter((p: OpenFoodFactsProduct) => {
          if (!p.product_name) return false;
          if (p.code === product.code) return false; // Exclude the original product
          if (seenCodes.has(p.code)) return false;   // Deduplicate
          return true;
        });

      for (const p of products) {
        seenCodes.add(p.code);
        allResults.push(p);
      }
    } catch {
      clear();
      continue;
    }
  }

  // Sort: products with vegan label first, then by kcal similarity to original
  const originalKcal = product.nutriments['energy-kcal_100g'] || 0;
  allResults.sort((a, b) => {
    const aVegan = isProductVegan(a) ? 0 : 1;
    const bVegan = isProductVegan(b) ? 0 : 1;
    if (aVegan !== bVegan) return aVegan - bVegan;
    // Secondary: closer kcal profile
    const aDiff = Math.abs(a.nutriments['energy-kcal_100g'] - originalKcal);
    const bDiff = Math.abs(b.nutriments['energy-kcal_100g'] - originalKcal);
    return aDiff - bDiff;
  });

  return allResults.slice(0, 5);
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