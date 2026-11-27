import type { Cents } from "../../core/types.ts";
import type { Lido } from "../types.ts";
import { parseBrlPrice } from "./price.ts";

export interface CardData {
  /** Id do item no DashSkins (24 hex), do `href` do item ou do `id` do botão. */
  siteItemId: string;
  /** Nome exato do Steam, com ★, StatTrak™ e exterior, do link do mercado do Steam. */
  marketHashName: string;
  /** Preço de compra em centavos de real. */
  priceCents: Cents;
  /** Float do item; `null` quando o card não mostra float (agentes, adesivos, caixas). */
  float: number | null;
  /** De onde veio o float: o marcador da barra (preciso) ou o texto (truncado em 3 casas). */
  floatSource: "marcador" | "texto" | null;
  /** Nomes dos stickers, na ordem em que aparecem (repetidos contam). */
  stickers: string[];
  /** "livre" (Withdrawable), `{ dias }` (Unlocks in N days) ou `null` se o texto não foi reconhecido. */
  tradeLock: "livre" | { dias: number } | null;
}

// As classes do site têm sufixo gerado e mudam a cada deploy: só id, href, alt, style e texto servem de âncora.
const ITEM_LINK = 'a[href*="/item/"]';
const CART_BUTTON = 'button[id^="item-card-"][id$="-toggle-add-to-cart"]';
const STEAM_PREFIX = "https://steamcommunity.com/market/listings/730/";

/** Acha os cards pelo botão do carrinho: o card é o primeiro ancestral dele que contém o link do item. */
export function findCards(root: ParentNode): Element[] {
  const cards: Element[] = [];
  for (const button of Array.from(root.querySelectorAll(CART_BUTTON))) {
    let e: Element | null = button.parentElement;
    while (e !== null && e.querySelector(ITEM_LINK) === null) e = e.parentElement;
    if (e !== null && !cards.includes(e)) cards.push(e);
  }
  return cards;
}

function lerId(card: Element): string | null {
  const href = card.querySelector(ITEM_LINK)?.getAttribute("href") ?? "";
  const doLink = /\/item\/[^/]+\/([0-9a-f]{24})(?:[/?#]|$)/.exec(href);
  if (doLink !== null) return doLink[1]!;
  const doBotao = /^item-card-([0-9a-f]{24})-/.exec(card.querySelector(CART_BUTTON)?.id ?? "");
  return doBotao === null ? null : doBotao[1]!;
}

function lerNome(card: Element): string | null {
  const href = card.querySelector(`a[href^="${STEAM_PREFIX}"]`)?.getAttribute("href");
  if (href === null || href === undefined) return null;
  const bruto = href.slice(STEAM_PREFIX.length);
  let nome = bruto;
  try {
    nome = decodeURIComponent(bruto);
  } catch {
    // `%` solto no nome: fica como veio
  }
  nome = nome.trim();
  return nome === "" ? null : nome;
}

/** "32.8844" (% da barra) vira 0.328844 movendo a vírgula no texto, sem aritmética de ponto flutuante. */
function percentualParaFracao(percentual: string): number | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(percentual);
  if (m === null) return null;
  const inteiro = m[1]!.padStart(3, "0");
  const digitos = inteiro + (m[2] ?? "");
  const ponto = inteiro.length - 2;
  const valor = Number(`${digitos.slice(0, ponto)}.${digitos.slice(ponto)}`);
  return valor >= 0 && valor <= 1 ? valor : null;
}

function marcadorDaBarra(barra: Element): number | null {
  for (const filho of Array.from(barra.children)) {
    const m = /left:\s*([\d.]+)%/.exec(filho.getAttribute("style") ?? "");
    if (m !== null) return percentualParaFracao(m[1]!);
  }
  return null;
}

function lerFloat(card: Element): { float: number | null; floatSource: "marcador" | "texto" | null } {
  const barra = card.querySelector('[style*="grid-template-columns"]');
  if (barra === null) return { float: null, floatSource: null };
  const doMarcador = marcadorDaBarra(barra);
  if (doMarcador !== null) return { float: doMarcador, floatSource: "marcador" };
  for (const span of Array.from(barra.parentElement?.querySelectorAll("span") ?? [])) {
    const texto = (span.textContent ?? "").trim();
    if (/^\d+(?:\.\d+)?$/.test(texto)) return { float: Number(texto), floatSource: "texto" };
  }
  return { float: null, floatSource: null };
}

/** Lê o texto de cada `<span>` isolado: `textContent` do card cola os textos sem separador ("RifleWithdrawable"). */
function lerBloqueio(card: Element): CardData["tradeLock"] {
  for (const span of Array.from(card.querySelectorAll("span"))) {
    const texto = (span.textContent ?? "").trim();
    const dias = /^Unlocks in (\d+) days?$/i.exec(texto);
    if (dias !== null) return { dias: Number(dias[1]) };
    if (/^Withdrawable$/i.test(texto)) return "livre";
  }
  return null;
}

export function readCard(card: Element): Lido<CardData> {
  const siteItemId = lerId(card);
  if (siteItemId === null) return { ok: false, error: { kind: "sem_id" } };
  const marketHashName = lerNome(card);
  if (marketHashName === null) return { ok: false, error: { kind: "sem_nome" } };

  const forte = Array.from(card.querySelectorAll("strong")).find((s) => /^\s*R\$/.test(s.textContent ?? ""));
  if (forte === undefined) return { ok: false, error: { kind: "sem_preco" } };
  const preco = parseBrlPrice(forte.textContent ?? "");
  if (!preco.ok) return preco;

  const stickers = Array.from(card.querySelectorAll('img[alt^="Sticker |"]')).map(
    (img) => img.getAttribute("alt") ?? "",
  );
  return {
    ok: true,
    value: { siteItemId, marketHashName, priceCents: preco.value, ...lerFloat(card), stickers, tradeLock: lerBloqueio(card) },
  };
}
