import type { BuyOrder, Listing, Sale } from "../core/types.ts";
import { parseBuyOrders, parseListings, parseSales } from "./parse.ts";
import type { Parsed, RateLimit, Result } from "./types.ts";

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

const BASE_PADRAO = "https://csfloat.com/api/v1";
const SEM_LIMITE: RateLimit = { limit: null, remaining: null, resetEpoch: null };

function numeroDoCabecalho(h: Headers, nome: string): number | null {
  const v = h.get(nome);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function lerLimite(h: Headers): RateLimit {
  return {
    limit: numeroDoCabecalho(h, "x-ratelimit-limit"),
    remaining: numeroDoCabecalho(h, "x-ratelimit-remaining"),
    resetEpoch: numeroDoCabecalho(h, "x-ratelimit-reset"),
  };
}

export function createClient(options: { apiKey: string; fetch: FetchLike; baseUrl?: string }): Client {
  const base = options.baseUrl ?? BASE_PADRAO;

  async function pedir<T>(url: string, parse: (raw: unknown) => Parsed<T>): Promise<Result<T>> {
    let res: Response;
    try {
      // A chave vai pura em `Authorization` (sem "Bearer"), como a API aceitou nas medições.
      res = await options.fetch(url, {
        headers: { Authorization: options.apiKey, Accept: "application/json" },
      });
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      return { ok: false, error: { kind: "rede", detalhe }, rateLimit: SEM_LIMITE };
    }

    const rateLimit = lerLimite(res.headers);
    const status = res.status;
    if (status === 401 || status === 403) {
      return { ok: false, error: { kind: "auth", status }, rateLimit };
    }
    if (status === 404) {
      return { ok: false, error: { kind: "nao_encontrado", status }, rateLimit };
    }
    if (status === 429) {
      const espera = numeroDoCabecalho(res.headers, "retry-after");
      const error = espera === null
        ? { kind: "limite" as const, status }
        : { kind: "limite" as const, status, retryAfterSeg: espera };
      return { ok: false, error, rateLimit };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: "http", status }, rateLimit };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await res.text());
    } catch {
      return { ok: false, error: { kind: "resposta_invalida", status, detalhe: "corpo não é JSON" }, rateLimit };
    }
    const r = parse(raw);
    return r.ok ? { ok: true, value: r.value, rateLimit } : { ok: false, error: r.error, rateLimit };
  }

  return {
    listings(q) {
      const params = new URLSearchParams({ market_hash_name: q.marketHashName });
      if (q.type !== undefined) params.set("type", q.type);
      if (q.minFloat !== undefined) params.set("min_float", String(q.minFloat));
      if (q.maxFloat !== undefined) params.set("max_float", String(q.maxFloat));
      if (q.limit !== undefined) params.set("limit", String(q.limit));
      if (q.sortBy !== undefined) params.set("sort_by", q.sortBy);
      return pedir(`${base}/listings?${params.toString()}`, parseListings);
    },
    sales(marketHashName) {
      return pedir(`${base}/history/${encodeURIComponent(marketHashName)}/sales`, parseSales);
    },
    buyOrders(listingId, limit = 30) {
      return pedir(`${base}/listings/${encodeURIComponent(listingId)}/buy-orders?limit=${limit}`, parseBuyOrders);
    },
  };
}
