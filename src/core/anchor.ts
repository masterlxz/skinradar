import type { Listing } from "./types.ts";

export interface Anchor {
  listing: Listing;
  /** |float do anúncio − float alvo|. */
  distance: number;
}

/**
 * Escolhe o anúncio `buy_now` à venda com o float mais próximo do alvo (empate: o mais barato).
 * Leilão nunca serve: o preço dele é um lance, não um preço de compra.
 */
export function pickAnchor(listings: Listing[], targetFloat: number): Anchor | null {
  let best: Anchor | null = null;
  for (const listing of listings) {
    if (listing.type !== "buy_now" || listing.state !== "listed") continue;
    const distance = Math.abs(listing.float - targetFloat);
    const melhor =
      best === null ||
      distance < best.distance ||
      (distance === best.distance && listing.price < best.listing.price);
    if (melhor) best = { listing, distance };
  }
  return best;
}
