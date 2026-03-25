import type { OpenFoodFactsProduct } from '@/types';
import { supabase } from '@/lib/supabase';

const BASE_URL = 'https://world.openfoodfacts.net';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCachedProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const { data } = await supabase
      .from('food_cache')
      .select('data, fetched_at')
      .eq('barcode', barcode)
      .single();

    if (!data) return null;

    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > CACHE_MAX_AGE_MS) return null;

    return normalizeProduct(data.data);
  } catch {
    return null;
  }
}

async function cacheProduct(barcode: string, rawData: any): Promise<void> {
  try {
    await supabase
      .from('food_cache')
      .upsert(
        { barcode, data: rawData, fetched_at: new Date().toISOString() },
        { onConflict: 'barcode' }
      );
  } catch (err) {
    console.warn('Failed to cache product:', err);
  }
}

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

export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  // 1. Check cache first
  const cached = await getCachedProduct(barcode);
  if (cached) return cached;

  // 2. Fetch from OpenFoodFacts
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
      // 3. Cache in background (fire-and-forget)
      cacheProduct(barcode, data.product);
      return normalizeProduct(data.product);
    }
    return null;
  } catch (err) {
    clear();
    console.error('OpenFoodFacts barcode error:', err);
    return null;
  }
}

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
    if (err.name === 'AbortError') console.warn('OpenFoodFacts search timed out');
    else console.error('OpenFoodFacts search error:', err);
    return { products: [], count: 0, page: 1 };
  }
}

type SubstituteType = 'protein' | 'dairy' | 'fat' | 'general';

const VEGAN_ALTERNATIVES_MAP: {
  keywords: string[];
  queries: string[];
  type: SubstituteType;
}[] = [
  { keywords: ['yogurt', 'yogur', 'yoghurt', 'yaourt', 'fromage-blanc'], queries: ['yogur vegetal soja', 'yogur vegetal avena', 'yogur vegano'], type: 'dairy' },
  { keywords: ['cheese', 'queso', 'fromage', 'käse', 'mozzarella', 'cheddar', 'gouda', 'emmental', 'brie', 'camembert', 'manchego', 'parmigiano', 'parmesan'], queries: ['queso vegano', 'queso vegetal'], type: 'dairy' },
  { keywords: ['milk', 'leche', 'lait', 'milch', 'whole-milk', 'semi-skimmed-milk', 'skimmed-milk'], queries: ['bebida soja', 'bebida avena', 'leche vegetal'], type: 'dairy' },
  { keywords: ['cream', 'nata', 'crème', 'crema-de-leche', 'heavy-cream', 'whipping-cream'], queries: ['nata vegetal cocina', 'crema vegetal'], type: 'fat' },
  { keywords: ['butter', 'mantequilla', 'beurre', 'margarina'], queries: ['margarina vegetal', 'mantequilla vegana'], type: 'fat' },
  { keywords: ['ice-cream', 'helado', 'glace', 'gelato'], queries: ['helado vegano', 'helado vegetal soja'], type: 'general' },
  { keywords: ['ham', 'jamón', 'jamon', 'jambon', 'prosciutto'], queries: ['fiambre vegetal', 'embutido vegetal lonchas'], type: 'protein' },
  { keywords: ['sausage', 'salchicha', 'chorizo', 'saucisse', 'frankfurter', 'wurst', 'hot-dog'], queries: ['salchicha vegetal', 'frankfurt vegetal'], type: 'protein' },
  { keywords: ['burger', 'hamburguesa', 'patty', 'steak-hache'], queries: ['hamburguesa vegetal proteína', 'burger vegana soja'], type: 'protein' },
  { keywords: ['chicken', 'pollo', 'poulet', 'nugget', 'escalope'], queries: ['heura', 'tiras vegetales proteína', 'nuggets vegetales soja'], type: 'protein' },
  { keywords: ['meat', 'carne', 'viande', 'beef', 'ternera', 'cerdo', 'pork', 'porc'], queries: ['seitán', 'proteína vegetal soja texturizada', 'carne vegetal'], type: 'protein' },
  { keywords: ['bacon', 'panceta', 'tocino'], queries: ['bacon vegano', 'bacon vegetal'], type: 'protein' },
  { keywords: ['tuna', 'atún', 'atun', 'thon'], queries: ['atún vegano', 'atún vegetal'], type: 'protein' },
  { keywords: ['fish', 'pescado', 'poisson', 'salmon', 'salmón', 'sardine', 'anchoa', 'anchovy'], queries: ['pescado vegano', 'tofu'], type: 'protein' },
  { keywords: ['shrimp', 'prawn', 'gamba', 'crevette', 'marisco', 'seafood'], queries: ['proteína vegetal marisco', 'alternativa vegana marisco'], type: 'protein' },
  { keywords: ['egg', 'huevo', 'oeuf', 'eier'], queries: ['tofu sedoso', 'sustituto huevo vegano'], type: 'protein' },
  { keywords: ['mayonnaise', 'mayonesa', 'mayo'], queries: ['mayonesa vegana', 'veganesa'], type: 'fat' },
  { keywords: ['chocolate-milk', 'batido', 'milkshake', 'cacao-milk'], queries: ['batido vegetal soja', 'batido avena cacao'], type: 'dairy' },
  { keywords: ['pizza'], queries: ['pizza vegana', 'pizza vegetal'], type: 'general' },
];

const ANIMAL_KEYWORDS = [
  'pollo', 'pavo', 'ternera', 'cerdo', 'cordero', 'buey', 'vaca',
  'jamón serrano', 'jamón ibérico', 'jamón cocido',
  'atún claro', 'salmón ahumado', 'anchoas', 'bacalao', 'merluza',
  'gambas', 'langostino', 'pulpo', 'calamar', 'mejillón',
  'huevo campero', 'huevos de gallina',
  'leche entera', 'leche semidesnatada', 'leche desnatada',
  'queso manchego', 'queso curado', 'mozzarella di bufala',
  'yogur griego', 'yogur natural',
  'mantequilla de vaca', 'nata para montar',
  'chicken', 'turkey', 'beef', 'pork', 'lamb', 'duck',
  'cow milk', 'goat milk', 'whey', 'casein', 'lactose',
  'egg white', 'egg yolk',
  'tuna fish', 'salmon fillet', 'shrimp', 'prawn',
  'gelatin', 'gelatina', 'colágeno', 'collagen',
];

const VEGAN_POSITIVE_KEYWORDS = [
  'vegano', 'vegana', 'vegan', 'vegetal', 'vegetariano', 'vegetariana',
  'plant-based', 'plant based', 'a base de plantas',
  'soja', 'soy', 'tofu', 'seitán', 'seitan', 'tempeh',
  'avena', 'oat', 'almendra', 'almond', 'coco', 'coconut',
  'arroz', 'rice', 'guisante', 'pea protein', 'proteína de guisante',
  'heura', 'beyond', 'impossible', 'garden gourmet',
  'sin lactosa vegetal', 'alternativa vegetal',
];

const IRRELEVANT_KEYWORDS = [
  'sazonador', 'seasoning', 'especias', 'spice', 'condimento',
  'salsa', 'sauce', 'ketchup', 'mostaza', 'vinagre',
  'caldo', 'bouillon', 'broth',
  'suplemento', 'supplement', 'vitamina', 'cápsula', 'capsule',
  'bebida energética', 'energy drink',
  'patatas fritas', 'chips',
  'mermelada', 'jam', 'miel', 'honey',
];

function looksVegan(product: OpenFoodFactsProduct): boolean {
  if (isProductVegan(product)) return true;
  const nameLower = product.product_name.toLowerCase();
  const brandsLower = (product.brands || '').toLowerCase();
  const combined = `${nameLower} ${brandsLower}`;
  for (const kw of ANIMAL_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return false;
  }
  for (const kw of VEGAN_POSITIVE_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return true;
  }
  return false;
}

function isRelevantSubstitute(product: OpenFoodFactsProduct): boolean {
  const nameLower = product.product_name.toLowerCase();
  const catsLower = product.categories_tags.map((t) => t.toLowerCase()).join(' ');
  const combined = `${nameLower} ${catsLower}`;
  for (const kw of IRRELEVANT_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return false;
  }
  if (product.nutriments['energy-kcal_100g'] <= 5) return false;
  return true;
}

function nutritionSimilarityScore(
  original: OpenFoodFactsProduct,
  candidate: OpenFoodFactsProduct,
  type: SubstituteType
): number {
  const oN = original.nutriments;
  const cN = candidate.nutriments;
  const protDiff = Math.abs(oN.proteins_100g - cN.proteins_100g);
  const carbDiff = Math.abs(oN.carbohydrates_100g - cN.carbohydrates_100g);
  const fatDiff = Math.abs(oN.fat_100g - cN.fat_100g);
  const kcalDiff = Math.abs(oN['energy-kcal_100g'] - cN['energy-kcal_100g']);

  switch (type) {
    case 'protein': {
      const proteinPenalty = cN.proteins_100g < oN.proteins_100g * 0.5 ? 100 : 0;
      return protDiff * 4 + fatDiff * 1 + carbDiff * 0.5 + kcalDiff * 0.1 + proteinPenalty;
    }
    case 'dairy':
      return protDiff * 2 + fatDiff * 2 + carbDiff * 1 + kcalDiff * 0.2;
    case 'fat':
      return fatDiff * 4 + kcalDiff * 0.5 + protDiff * 0.5 + carbDiff * 0.5;
    case 'general':
    default:
      return protDiff * 1.5 + fatDiff * 1.5 + carbDiff * 1 + kcalDiff * 0.3;
  }
}

function findMappedEntry(product: OpenFoodFactsProduct): typeof VEGAN_ALTERNATIVES_MAP[number] | null {
  const haystack = [
    ...product.categories_tags.map((t) => t.toLowerCase()),
    product.product_name.toLowerCase(),
  ].join(' ');
  for (const mapping of VEGAN_ALTERNATIVES_MAP) {
    for (const kw of mapping.keywords) {
      if (haystack.includes(kw)) return mapping;
    }
  }
  return null;
}

function extractGenericTerm(productName: string): string | null {
  const name = productName.toLowerCase();
  const genericTerms = [
    'yogur', 'yogurt', 'queso', 'leche', 'nata', 'crema', 'mantequilla',
    'helado', 'jamón', 'jamon', 'salchicha', 'chorizo', 'hamburguesa',
    'burger', 'nugget', 'pollo', 'carne', 'atún', 'atun', 'pescado',
    'salmón', 'salmon', 'huevo', 'mayonesa', 'pizza', 'bacon',
    'embutido', 'fiambre', 'salami', 'mortadela', 'paté', 'pate',
    'mozzarella', 'cheddar', 'batido',
    'cheese', 'milk', 'cream', 'butter', 'chicken', 'meat', 'fish',
    'tuna', 'egg', 'sausage', 'ham', 'ice cream',
  ];
  for (const term of genericTerms) {
    if (name.includes(term)) return term;
  }
  return null;
}

export async function findVeganAlternatives(product: OpenFoodFactsProduct): Promise<OpenFoodFactsProduct[]> {
  const mappedEntry = findMappedEntry(product);
  const queries: string[] = mappedEntry ? [...mappedEntry.queries] : [];
  const type: SubstituteType = mappedEntry?.type || 'general';

  if (queries.length === 0) {
    const generic = extractGenericTerm(product.product_name);
    if (generic) queries.push(`${generic} vegano`, `${generic} vegetal`);
  }
  if (queries.length === 0) return [];

  const allCandidates: OpenFoodFactsProduct[] = [];
  const seenCodes = new Set<string>();

  for (const q of queries) {
    const { signal, clear } = createTimeout(8000);
    try {
      const res = await fetch(
        `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=15&fields=code,product_name,brands,image_front_url,nutriments,labels_tags,categories_tags,serving_size,serving_quantity`,
        { signal }
      );
      clear();
      if (!res.ok) continue;
      const data = await res.json();
      const products: OpenFoodFactsProduct[] = (data.products || [])
        .map(normalizeProduct)
        .filter((p: OpenFoodFactsProduct) => {
          if (!p.product_name) return false;
          if (p.code === product.code) return false;
          if (seenCodes.has(p.code)) return false;
          return true;
        });
      for (const p of products) { seenCodes.add(p.code); allCandidates.push(p); }
    } catch { clear(); continue; }
  }

  const validAlternatives = allCandidates
    .filter(looksVegan)
    .filter(isRelevantSubstitute);

  const scored = validAlternatives.map((candidate) => ({
    product: candidate,
    score: nutritionSimilarityScore(product, candidate, type),
  }));

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 5).map((s) => s.product);
}

export function isProductVegan(product: OpenFoodFactsProduct): boolean {
  return (product.labels_tags || []).some(
    (tag) => tag === 'en:vegan' || tag === 'en:vegan-society'
  );
}

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