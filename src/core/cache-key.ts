export interface CacheKeyInput {
  marketHashName: string;
  float: number;
  /** Nomes dos stickers (o card do marketplace só traz o nome; o CSFloat também devolve `name`). */
  stickers: string[];
}

/**
 * Chave de cache: nome, float no milésimo e nomes de sticker em ordem estável (repetição conta).
 * Float ou sticker diferentes mudam o preço e as Buy Orders, então não podem dividir a chave.
 * Os nomes entram como JSON porque contêm " | " e qualquer separador simples seria ambíguo.
 */
export function cacheKey(input: CacheKeyInput): string {
  const stickers = JSON.stringify([...input.stickers].sort());
  return `${input.marketHashName}|f=${input.float.toFixed(3)}|s=${stickers}`;
}
