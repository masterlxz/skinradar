export interface CsfloatError {
  kind: "auth" | "nao_encontrado" | "limite" | "rede" | "resposta_invalida" | "http";
  status?: number;
  /** Segundos pedidos pelo servidor no cabeçalho `retry-after` (só em "limite"). */
  retryAfterSeg?: number;
  detalhe?: string;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: CsfloatError };

export interface RateLimit {
  limit: number | null;
  remaining: number | null;
  /** Epoch em segundos em que a janela zera. */
  resetEpoch: number | null;
}

export type Result<T> =
  | { ok: true; value: T; rateLimit: RateLimit }
  | { ok: false; error: CsfloatError; rateLimit: RateLimit };
