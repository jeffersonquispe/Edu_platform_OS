import { describe, expect, it } from "vitest";
import { decideEnrollAction } from "./enrollDecision";

describe("decideEnrollAction", () => {
  // AC: "Dado un curso con precio = 0, entonces la decisión es 'inscribir directo'."
  it("returns 'enroll' when price is 0", () => {
    expect(decideEnrollAction(0)).toBe("enroll");
  });

  // AC: "Dado un curso con precio > 0, entonces la decisión es 'devolver
  // checkout simulado', no inscribir."
  it.each([1, 0.01, 29, 100, 999.99])(
    "returns 'checkout' when price is %s (> 0)",
    (price) => {
      expect(decideEnrollAction(price)).toBe("checkout");
    },
  );
});
