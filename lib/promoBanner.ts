/**
 * Lógica pura del banner de promoción del catálogo: vigencia y descarte por
 * sesión. El storage se inyecta para poder probarlo sin navegador.
 */

export const PROMO_STORAGE_KEY = "promoBannerDismissed";

/** Fin de la oferta: último instante de octubre de 2026 (hora local). */
export const PROMO_ENDS_AT = new Date(2026, 9, 31, 23, 59, 59, 999);

export type SessionStore = Pick<Storage, "getItem" | "setItem">;

export function isPromoActive(now: Date = new Date()): boolean {
  return now.getTime() <= PROMO_ENDS_AT.getTime();
}

export function isDismissed(store: SessionStore | null): boolean {
  try {
    return store?.getItem(PROMO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismiss(store: SessionStore | null): void {
  try {
    store?.setItem(PROMO_STORAGE_KEY, "1");
  } catch {
    // Storage bloqueado: el banner se oculta solo en esta carga.
  }
}
