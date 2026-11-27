import type { Sticker } from "./types.ts";

export interface CacheKeyInput {
  marketHashName: string;
  float: number;
  stickers: Sticker[];
}

export function cacheKey(input: CacheKeyInput): string {
  throw new Error("não implementado");
}
