import type { Listing } from "./types.ts";

export interface Anchor {
  listing: Listing;
  /** |float do anúncio − float alvo|. */
  distance: number;
}

export function pickAnchor(listings: Listing[], targetFloat: number): Anchor | null {
  throw new Error("não implementado");
}
