import type { Cents, Sale } from "./types.ts";

export type SalesSummary =
  | { status: "ok"; n: number; median: Cents; min: Cents; max: Cents }
  | { status: "insuficiente"; n: number };

/** Resume as vendas com float dentro de `window` (inclusive) do float alvo. */
export function summarizeSales(
  sales: Sale[],
  targetFloat: number,
  window: number,
  minSamples: number,
): SalesSummary {
  throw new Error("não implementado");
}
