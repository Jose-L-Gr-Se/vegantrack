import { Capacitor } from '@capacitor/core';

const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? '';

/**
 * Inicializa el SDK de RevenueCat en plataformas nativas.
 * En la web no hace nada — las suscripciones se gestionan con Stripe.
 */
export async function initRevenueCat(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !ANDROID_KEY) return;
  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({
      apiKey: ANDROID_KEY,
      appUserID: userId,
    });
  } catch (err) {
    console.error('RevenueCat init error:', err);
  }
}

/**
 * Devuelve las ofertas activas de RevenueCat (solo en nativo).
 */
export async function getOfferings() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { current } = await Purchases.getOfferings();
    return current;
  } catch {
    return null;
  }
}

/**
 * Compra un paquete de RevenueCat.
 * Devuelve true si la compra fue exitosa.
 */
export async function purchasePackage(pkg: unknown): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg as any });
    return !!customerInfo.entitlements.active['pro'];
  } catch (err: unknown) {
    // El usuario canceló — no es un error real
    if ((err as any)?.code === 'PURCHASE_CANCELLED') return false;
    throw err;
  }
}

/**
 * Comprueba si el usuario tiene el entitlement 'pro' activo (solo en nativo).
 */
export async function checkNativeProStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active['pro'];
  } catch {
    return false;
  }
}
