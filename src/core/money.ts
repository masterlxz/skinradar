import type { Cents } from "./types.ts";

/** Converte centavos de dólar em centavos de real; meio centavo arredonda para cima. */
export function usdCentsToBrlCents(usdCents: Cents, rate: number): Cents {
  if (!Number.isInteger(usdCents)) {
    throw new RangeError("centavos devem ser um número inteiro");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError("a cotação deve ser finita e positiva");
  }
  return Math.round(usdCents * rate);
}
