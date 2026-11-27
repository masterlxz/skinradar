import assert from "node:assert/strict";
import { test } from "node:test";
import { pickAnchor } from "../../src/core/anchor.ts";
import type { Listing } from "../../src/core/types.ts";
import { parseListings } from "../../src/csfloat/parse.ts";
import { fixture, unwrap } from "../helpers.ts";

const buyNow = unwrap(parseListings(fixture("listings-buy-now.json")));
const misto = unwrap(parseListings(fixture("listings-misto.json")));

function listing(id: string, float: number, price: number, extra: Partial<Listing> = {}): Listing {
  return { id, type: "buy_now", state: "listed", price, float, stickers: [], marketHashName: "x", ...extra };
}

test("alvo 0,347 escolhe o anúncio de float 0,3467 (preço 2102)", () => {
  const r = pickAnchor(buyNow, 0.347);
  assert.equal(r?.listing.price, 2102);
  assert.ok(r !== null && Math.abs(r.distance - 0.0003) < 0.0001);
});

test("alvo 0,30 escolhe o de float 0,2909 (preço 2148), o mais próximo", () => {
  assert.equal(pickAnchor(buyNow, 0.3)?.listing.price, 2148);
});

test("leilão nunca é âncora: o de float 0,3468 (preço 130) é ignorado", () => {
  const r = pickAnchor(misto, 0.3468);
  assert.equal(r?.listing.type, "buy_now");
  assert.equal(r?.listing.price, 2081);
});

test("só leilões: não há âncora", () => {
  assert.equal(pickAnchor(misto.filter((l) => l.type === "auction"), 0.3468), null);
});

test("sem anúncios: não há âncora", () => {
  assert.equal(pickAnchor([], 0.3), null);
});

test("empate de distância fica com o mais barato", () => {
  const r = pickAnchor([listing("a", 0.25, 3000), listing("b", 0.75, 2000)], 0.5);
  assert.equal(r?.listing.id, "b");
});

test("anúncio que não está mais à venda é ignorado", () => {
  const r = pickAnchor([listing("a", 0.5, 1000, { state: "sold" }), listing("b", 0.9, 2000)], 0.5);
  assert.equal(r?.listing.id, "b");
});
