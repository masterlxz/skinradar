import type { Cents, Sale } from "./types.ts";

export type SalesSummary =
  | { status: "ok"; n: number; median: Cents; min: Cents; max: Cents }
  | { status: "insuficiente"; n: number };

/**
 * Resume as vendas com float dentro de `window` (inclusive) do float alvo.
 * Mediana de n par: média dos dois do meio, meio centavo para cima.
 */
export function summarizeSales(
  sales: Sale[],
  targetFloat: number,
  window: number,
  minSamples: number,
): SalesSummary {
  const prices = sales
    .filter((s) => Math.abs(s.float - targetFloat) <= window)
    .map((s) => s.price)
    .sort((a, b) => a - b);
  const n = prices.length;
  if (n === 0 || n < minSamples) return { status: "insuficiente", n };

  const meio = Math.floor(n / 2);
  const median =
    n % 2 === 1 ? prices[meio]! : Math.round((prices[meio - 1]! + prices[meio]!) / 2);
  return { status: "ok", n, median, min: prices[0]!, max: prices[n - 1]! };
}
