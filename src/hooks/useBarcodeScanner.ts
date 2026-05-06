import { Capacitor } from '@capacitor/core';

/**
 * Abstracción de escaneo de código de barras.
 * - En nativo (Android/iOS): usa MLKit via Capacitor para mayor fiabilidad.
 * - En web: devuelve null para que el caller use html5-qrcode como fallback.
 */
export function useBarcodeScanner() {
  const isNative = Capacitor.isNativePlatform();

  const scan = async (): Promise<string | null> => {
    if (!isNative) return null;

    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');

    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera !== 'granted') {
      const result = await BarcodeScanner.requestPermissions();
      if (result.camera !== 'granted') return null;
    }

    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.QrCode,
      ],
    });

    return barcodes[0]?.rawValue ?? null;
  };

  return { scan, isNative };
}
