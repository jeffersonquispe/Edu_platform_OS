import { describe, expect, it } from "vitest";
import {
  PROMO_STORAGE_KEY,
  dismiss,
  isDismissed,
  isPromoActive,
  type SessionStore,
} from "./promoBanner";

function fakeStore(): SessionStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("isPromoActive", () => {
  it("está activa durante octubre de 2026", () => {
    expect(isPromoActive(new Date(2026, 9, 6))).toBe(true);
    expect(isPromoActive(new Date(2026, 9, 31, 23, 0, 0))).toBe(true);
  });

  it("termina al comenzar noviembre", () => {
    expect(isPromoActive(new Date(2026, 10, 1, 0, 0, 0))).toBe(false);
  });
});

describe("isDismissed / dismiss", () => {
  it("no está descartado en una sesión nueva", () => {
    expect(isDismissed(fakeStore())).toBe(false);
  });

  it("queda descartado después de dismiss", () => {
    const store = fakeStore();
    dismiss(store);
    expect(store.data.get(PROMO_STORAGE_KEY)).toBe("1");
    expect(isDismissed(store)).toBe(true);
  });

  it("tolera storage ausente o que lanza errores", () => {
    const throwing: SessionStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(isDismissed(null)).toBe(false);
    expect(isDismissed(throwing)).toBe(false);
    expect(() => dismiss(null)).not.toThrow();
    expect(() => dismiss(throwing)).not.toThrow();
  });
});
