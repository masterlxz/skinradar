import type { BuyOrder, Listing, Sale } from "../core/types.ts";
import type { Result } from "./types.ts";

/** Subconjunto do `fetch`: a única fronteira de I/O, injetada para teste. */
export type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<Response>;

export interface ListingsQuery {
  marketHashName: string;
  type?: "buy_now" | "auction";
  minFloat?: number;
  maxFloat?: number;
  limit?: number;
  sortBy?: string;
}

export interface Client {
  listings(query: ListingsQuery): Promise<Result<Listing[]>>;
  sales(marketHashName: string): Promise<Result<Sale[]>>;
  buyOrders(listingId: string, limit?: number): Promise<Result<BuyOrder[]>>;
}

export function createClient(options: { apiKey: string; fetch: FetchLike; baseUrl?: string }): Client {
  throw new Error("não implementado");
}
