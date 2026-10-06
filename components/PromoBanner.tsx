"use client";

import { useEffect, useState } from "react";
import { dismiss, isDismissed, isPromoActive } from "@/lib/promoBanner";

/**
 * Banner de promoción sobre el catálogo. Descartable; el descarte se guarda
 * en sessionStorage, así que no reaparece durante la sesión. Arranca oculto y
 * se decide en el cliente para evitar desajustes de hidratación (fecha y
 * storage solo existen en el navegador).
 */
export function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let store: Storage | null = null;
    try {
      store = window.sessionStorage;
    } catch {
      store = null;
    }
    setVisible(isPromoActive() && !isDismissed(store));
  }, []);

  if (!visible) return null;

  function handleClose() {
    let store: Storage | null = null;
    try {
      store = window.sessionStorage;
    } catch {
      store = null;
    }
    dismiss(store);
    setVisible(false);
  }

  return (
    <section
      className="promo-banner animate-fade-in"
      aria-label="Promoción por tiempo limitado"
      data-testid="promo-banner"
    >
      <p className="promo-banner-text">
        <strong>50% de descuento</strong> en todos los cursos de pago, válido
        hasta el 31 de octubre.{" "}
        <a href="#catalog-heading" className="promo-banner-link">
          Ver cursos en oferta
        </a>
      </p>
      <button
        type="button"
        className="btn btn-ghost btn-sm promo-banner-close"
        onClick={handleClose}
        aria-label="Cerrar banner de promoción"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </section>
  );
}
