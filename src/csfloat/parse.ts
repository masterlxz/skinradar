import type { BuyOrder, Listing, Sale, Sticker } from "../core/types.ts";
import type { Parsed } from "./types.ts";

type Obj = Record<string, unknown>;

function invalido(detalhe: string): Parsed<never> {
  return { ok: false, error: { kind: "resposta_invalida", detalhe } };
}

function isObj(x: unknown): x is Obj {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function num(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Aceita `{ data: [...] }` (como os anúncios chegam) ou a lista direta. */
function lista(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (isObj(raw) && Array.isArray(raw["data"])) return raw["data"];
  return null;
}

function mapear<T>(raw: unknown, um: (x: unknown, i: number) => Parsed<T>): Parsed<T[]> {
  const itens = lista(raw);
  if (itens === null) return invalido("esperava uma lista (ou { data: [...] })");
  const out: T[] = [];
  for (const [i, x] of itens.entries()) {
    const r = um(x, i);
    if (!r.ok) return r;
    out.push(r.value);
  }
  return { ok: true, value: out };
}

function floatDoItem(item: unknown, i: number): Parsed<number> {
  if (!isObj(item) || !num(item["float_value"])) return invalido(`item ${i}: sem float_value`);
  return { ok: true, value: item["float_value"] };
}

function stickersDoItem(item: Obj, i: number): Parsed<Sticker[]> {
  const bruto = item["stickers"];
  if (bruto === undefined || bruto === null) return { ok: true, value: [] };
  if (!Array.isArray(bruto)) return invalido(`item ${i}: stickers não é lista`);
  const out: Sticker[] = [];
  for (const s of bruto) {
    if (!isObj(s) || !num(s["stickerId"])) return invalido(`item ${i}: sticker sem stickerId`);
    out.push(num(s["slot"]) ? { id: s["stickerId"], slot: s["slot"] } : { id: s["stickerId"] });
  }
  return { ok: true, value: out };
}

export function parseListings(raw: unknown): Parsed<Listing[]> {
  return mapear(raw, (x, i): Parsed<Listing> => {
    if (!isObj(x)) return invalido(`anúncio ${i}: não é objeto`);
    const { id, type, state, price, item } = x;
    if (typeof id !== "string" || typeof type !== "string" || typeof state !== "string" || !num(price)) {
      return invalido(`anúncio ${i}: faltam id, type, state ou price`);
    }
    const float = floatDoItem(item, i);
    if (!float.ok) return float;
    const obj = item as Obj;
    const stickers = stickersDoItem(obj, i);
    if (!stickers.ok) return stickers;
    const nome = obj["market_hash_name"];
    if (typeof nome !== "string") return invalido(`anúncio ${i}: sem market_hash_name`);
    return {
      ok: true,
      value: { id, type, state, price, float: float.value, stickers: stickers.value, marketHashName: nome },
    };
  });
}

export function parseSales(raw: unknown): Parsed<Sale[]> {
  return mapear(raw, (x, i): Parsed<Sale> => {
    if (!isObj(x)) return invalido(`venda ${i}: não é objeto`);
    const { price, sold_at: soldAt, type, item } = x;
    if (!num(price) || typeof soldAt !== "string" || typeof type !== "string") {
      return invalido(`venda ${i}: faltam price, sold_at ou type`);
    }
    const float = floatDoItem(item, i);
    if (!float.ok) return float;
    // ESBOÇO (testes primeiro): stickerCount ainda não é lido do item.
    return { ok: true, value: { price, float: float.value, soldAt, type, stickerCount: 0 } };
  });
}

export function parseBuyOrders(raw: unknown): Parsed<BuyOrder[]> {
  return mapear(raw, (x, i): Parsed<BuyOrder> => {
    if (!isObj(x)) return invalido(`ordem ${i}: não é objeto`);
    const { price, qty } = x;
    if (!num(price) || !num(qty)) return invalido(`ordem ${i}: faltam price ou qty`);
    const props = x["hybrid_properties"] ?? {};
    if (!isObj(props)) return invalido(`ordem ${i}: hybrid_properties inválido`);

    const stickers: Sticker[] = [];
    const aplicados = props["applied_stickers"];
    if (aplicados !== undefined) {
      if (!Array.isArray(aplicados)) return invalido(`ordem ${i}: applied_stickers não é lista`);
      for (const s of aplicados) {
        if (!isObj(s) || !num(s["sId"])) return invalido(`ordem ${i}: sticker sem sId`);
        stickers.push(num(s["s"]) ? { id: s["sId"], slot: s["s"] } : { id: s["sId"] });
      }
    }

    const ordem: BuyOrder = { price, qty, stickers };
    if (num(props["min_float"])) ordem.minFloat = props["min_float"];
    if (num(props["max_float"])) ordem.maxFloat = props["max_float"];
    return { ok: true, value: ordem };
  });
}
