import type { Sticker } from "./types.ts";

export interface CacheKeyInput {
  marketHashName: string;
  float: number;
  stickers: Sticker[];
}

/**
 * Chave de cache: nome, float no milésimo e stickers (id e posição, em ordem estável).
 * Float ou sticker diferentes mudam o preço e as Buy Orders, então não podem dividir a chave.
 */
export function cacheKey(input: CacheKeyInput): string {
  const stickers = input.stickers
    .map((s) => `${s.id}@${s.slot ?? "*"}`)
    .sort()
    .join(",");
  return `${input.marketHashName}|f=${input.float.toFixed(3)}|s=${stickers}`;
}
