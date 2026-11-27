import type { Analise, ItemParaAnalise } from "../analysis/analisar.ts";

export interface Pedido {
  tipo: "analisar";
  item: ItemParaAnalise;
  forcar: boolean;
}

export type ErroResposta =
  | { kind: "config_invalida"; campos: string[] }
  | { kind: "sem_chave" }
  | { kind: "interno" };

export type Resposta = { ok: true; analise: Analise } | { ok: false; erro: ErroResposta };

const MAX_TEXTO = 200;
const MAX_STICKERS = 10;
const MAX_PRECO_CENTS = 1_000_000_000;
const MAX_DIAS_BLOQUEIO = 3650;

function texto(x: unknown): x is string {
  return typeof x === "string" && x.length >= 1 && x.length <= MAX_TEXTO;
}

function lerTradeLock(x: unknown): ItemParaAnalise["tradeLock"] | undefined {
  if (x === null || x === "livre") return x;
  if (typeof x !== "object" || x === null) return undefined;
  const dias = (x as Record<string, unknown>)["dias"];
  if (typeof dias !== "number" || !Number.isInteger(dias) || dias < 0 || dias > MAX_DIAS_BLOQUEIO) return undefined;
  return { dias };
}

/**
 * Fronteira de confiança do service worker: a mensagem vem do content script, que roda dentro da página
 * do marketplace. Valida tipo, tamanho e faixa, e devolve uma cópia só com os campos conhecidos.
 */
export function validarPedido(raw: unknown): Pedido | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (m["tipo"] !== "analisar") return null;
  const forcar = m["forcar"] === undefined ? false : m["forcar"];
  if (typeof forcar !== "boolean") return null;

  const bruto = m["item"];
  if (typeof bruto !== "object" || bruto === null) return null;
  const i = bruto as Record<string, unknown>;

  const { marketHashName, priceCents, float, stickers } = i;
  if (!texto(marketHashName)) return null;
  if (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents < 1 || priceCents > MAX_PRECO_CENTS) {
    return null;
  }
  if (float !== null && (typeof float !== "number" || !(float >= 0 && float <= 1))) return null;
  if (!Array.isArray(stickers) || stickers.length > MAX_STICKERS || !stickers.every(texto)) return null;
  const tradeLock = lerTradeLock(i["tradeLock"]);
  if (tradeLock === undefined) return null;

  return {
    tipo: "analisar",
    item: { marketHashName, priceCents, float, stickers: [...stickers], tradeLock },
    forcar,
  };
}
