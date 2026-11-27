import type { BuyOrder, Listing, Sale } from "../core/types.ts";
import type { Parsed } from "./types.ts";

/** Aceita `{ data: [...] }` (listings) ou a lista direta. */
export function parseListings(raw: unknown): Parsed<Listing[]> {
  throw new Error("não implementado");
}

export function parseSales(raw: unknown): Parsed<Sale[]> {
  throw new Error("não implementado");
}

export function parseBuyOrders(raw: unknown): Parsed<BuyOrder[]> {
  throw new Error("não implementado");
}
