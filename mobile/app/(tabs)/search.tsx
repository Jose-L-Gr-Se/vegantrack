import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useTheme } from '@/hooks/useTheme';
import { FoodCard } from '@/components/features/FoodCard';
import { AddFoodModal } from '@/components/features/AddFoodModal';
import { Spacing, Typography, Radius, Colors } from '@/theme';
import { todayString } from '@/utils/date';
import type { OpenFoodFactsProduct, MealType } from '@/types';

export default function SearchScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal?: MealType; date?: string }>();

  const { user } = useAuthStore();
  const { fetchEntries } = useDiaryStore();
  const {
    query, results, loading, barcodeLoading, addingEntry,
    setQuery, search, scanBarcode, addToLog, clear,
  } = useSearchStore();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [scanned, setScanned] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMeal: MealType = params.meal ?? 'breakfast';
  const targetDate = params.date ?? todayString();

  // debounced search
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      search(text);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      clear();
    };
  }, []);

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permiso denegado', 'Consciente necesita acceso a la cámara para escanear códigos de barras.');
        return;
      }
    }
    setScanned(false);
    setCameraOpen(true);
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned || barcodeLoading) return;
    setScanned(true);
    setCameraOpen(false);
    const product = await scanBarcode(data);
    if (product) {
      setSelectedProduct(product);
    } else {
      Alert.alert('No encontrado', 'No se encontró este producto en la base de datos.');
      setScanned(false);
    }
  };

  const handleConfirmAdd = async (grams: number, meal: MealType) => {
    if (!selectedProduct || !user?.id) return;
    const { error } = await addToLog({
      product: selectedProduct,
      userId: user.id,
      date: targetDate,
      mealType: meal,
      servingGrams: grams,
    });
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setSelectedProduct(null);
    // refresh diary if we're adding to today
    if (targetDate === todayString()) fetchEntries(user.id);
    router.back();
  };

  const isEmpty = !loading && results.length === 0 && query.length > 2;

  // ── camera view ──
  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
          onBarcodeScanned={handleBarcodeScan}
        />
        {/* overlay */}
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Apunta al código de barras del producto</Text>
        </View>
        <SafeAreaView style={styles.cameraClose}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.background.card }]}
            onPress={() => setCameraOpen(false)}
          >
            <Text style={[styles.closeBtnText, { color: theme.text.primary }]}>✕ Cerrar</Text>
          </TouchableOpacity>
        </SafeAreaView>
        {barcodeLoading && (
          <View style={styles.barcodeLoading}>
            <ActivityIndicator color={Colors.brand[500]} size="large" />
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background.primary }]}>
      {/* ── search bar ── */}
      <View style={[styles.searchRow, { borderBottomColor: theme.border.subtle }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.background.card, borderColor: theme.border.default }]}>
          <Text style={[styles.searchIcon, { color: theme.text.tertiary }]}>⌕</Text>
          <TextInput
            style={[styles.input, { color: theme.text.primary, fontFamily: Typography.fonts.sans }]}
            placeholder="Buscar alimento..."
            placeholderTextColor={theme.text.tertiary}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => search(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); clear(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearIcon, { color: theme.text.tertiary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* barcode button */}
        <TouchableOpacity
          style={[styles.barcodeBtn, { backgroundColor: theme.action.secondary, borderColor: theme.action.primary }]}
          onPress={handleOpenCamera}
        >
          <Text style={styles.barcodeBtnText}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* ── content ── */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.action.primary} />
        </View>
      )}

      {!loading && query.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Busca cualquier alimento</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
            O escanea el código de barras del producto
          </Text>
        </View>
      )}

      {isEmpty && (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>😶</Text>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Sin resultados</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
            Prueba con otro término o escanea el código de barras
          </Text>
        </View>
      )}

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.code || item.product_name}
          renderItem={({ item }) => (
            <FoodCard product={item} onPress={setSelectedProduct} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}

      {/* ── add food modal ── */}
      <AddFoodModal
        product={selectedProduct}
        visible={!!selectedProduct}
        initialMeal={initialMeal}
        loading={addingEntry}
        onConfirm={handleConfirmAdd}
        onClose={() => setSelectedProduct(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: Typography.sizes.base, height: '100%' },
  clearIcon: { fontSize: 14, padding: 2 },
  barcodeBtn: {
    width: 44, height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeBtnText: { fontSize: 20 },
  list: { padding: Spacing.base },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing['2xl'],
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { fontFamily: Typography.fonts.sansSemiBold, fontSize: Typography.sizes.lg, textAlign: 'center' },
  emptySubtitle: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  // camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.brand[500],
  },
  scanHint: {
    color: '#fff',
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  cameraClose: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing['2xl'],
  },
  closeBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  closeBtnText: { fontFamily: Typography.fonts.sansSemiBold, fontSize: Typography.sizes.base },
  barcodeLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
