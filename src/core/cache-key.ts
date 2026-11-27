export interface CacheKeyInput {
  marketHashName: string;
  float: number;
  /** Nomes dos stickers (o card do marketplace só traz o nome; o CSFloat também devolve `name`). */
  stickers: string[];
}

/**
 * Chave de cache: nome, float no milésimo e nomes de sticker (em ordem estável).
 * ESBOÇO (testes primeiro): os stickers ainda não entram na chave.
 */
export function cacheKey(input: CacheKeyInput): string {
  return `${input.marketHashName}|f=${input.float.toFixed(3)}`;
}
