import type { Cents } from "../../core/types.ts";
import type { Lido } from "../types.ts";

export interface CardData {
  /** Id do item no DashSkins (24 hex), do `href` do item e do `id` do botão. */
  siteItemId: string;
  /** Nome exato do Steam, com ★, StatTrak™ e exterior, do link do mercado do Steam. */
  marketHashName: string;
  /** Preço de compra em centavos de real. */
  priceCents: Cents;
  /** Float do item; `null` quando o card não mostra float (agentes, adesivos, caixas). */
  float: number | null;
  /** De onde veio o float: o marcador da barra (preciso) ou o texto (truncado em 3 casas). */
  floatSource: "marcador" | "texto" | null;
  /** Nomes dos stickers, na ordem em que aparecem. */
  stickers: string[];
  /** "livre" (Withdrawable), `{ dias }` (Unlocks in N days) ou `null` se o texto não foi reconhecido. */
  tradeLock: "livre" | { dias: number } | null;
}

/** Acha os cards pelo botão `item-card-<id>-toggle-add-to-cart` (as classes mudam a cada deploy). */
export function findCards(root: ParentNode): Element[] {
  // ESBOÇO (testes primeiro)
  return [];
}

export function readCard(card: Element): Lido<CardData> {
  // ESBOÇO (testes primeiro)
  return { ok: false, error: { kind: "sem_nome" } };
}
