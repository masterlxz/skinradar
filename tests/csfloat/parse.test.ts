import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBuyOrders, parseListings, parseSales } from "../../src/csfloat/parse.ts";
import { fixture, unwrap } from "../helpers.ts";

test("listings: 4 leilões e 1 buy_now, com preço, float e estado", () => {
  const l = unwrap(parseListings(fixture("listings-misto.json")));
  assert.equal(l.length, 5);
  assert.deepEqual(l.map((x) => x.type), ["auction", "auction", "auction", "auction", "buy_now"]);
  assert.equal(l[0]?.price, 130);
  assert.equal(l[4]?.price, 2081);
  assert.equal(l[4]?.state, "listed");
  assert.ok(Math.abs((l[4]?.float ?? 0) - 0.361) < 0.0005);
});

test("listings: aceita o corpo no formato real { data: [...] } e a lista direta", () => {
  const lista = fixture("listings-buy-now.json");
  const a = unwrap(parseListings({ data: lista }));
  const b = unwrap(parseListings(lista));
  assert.equal(a.length, 8);
  assert.deepEqual(a, b);
});

test("listings: stickers com id e posição", () => {
  const l = unwrap(parseListings(fixture("listings-buy-now.json")));
  assert.equal(l[0]?.stickers.length, 5);
  assert.ok(l[0]?.stickers.every((s) => typeof s.id === "number"));
});

test("vendas: 15 vendas com preço, float e data", () => {
  const v = unwrap(parseSales(fixture("vendas.json")));
  assert.equal(v.length, 15);
  assert.equal(v[0]?.price, 3150);
  assert.ok(v[0]?.soldAt.startsWith("2026-11-27T00:46"));
  assert.ok(Math.abs((v[0]?.float ?? 0) - 0.209) < 0.0005);
});

test("buy orders: ordem de sticker traz id e posição; a de 77 não traz posição", () => {
  const o = unwrap(parseBuyOrders(fixture("buy-orders-sticker-77-66.json")));
  assert.equal(o.length, 11);
  assert.deepEqual(o[0]?.stickers, [{ id: 66, slot: 3 }]);
  assert.equal(o[0]?.price, 9000);
  assert.deepEqual(o[1]?.stickers, [{ id: 77 }]);
});

test("buy orders: faixa de float vem em minFloat e maxFloat, e a genérica não tem faixa", () => {
  const o = unwrap(parseBuyOrders(fixture("buy-orders-alto.json")));
  const faixa = o.find((x) => x.price === 1950);
  assert.equal(faixa?.minFloat, 0.15);
  assert.equal(faixa?.maxFloat, 0.38);
  const generica = o.find((x) => x.price === 2040);
  assert.equal(generica?.minFloat, undefined);
  assert.equal(generica?.qty, 10);
});

test("forma inesperada vira erro 'resposta_invalida', sem lançar exceção", () => {
  for (const ruim of [{ foo: 1 }, "texto", null, 42]) {
    for (const parse of [parseListings, parseSales, parseBuyOrders]) {
      const r = parse(ruim);
      assert.equal(r.ok, false);
      assert.equal(!r.ok && r.error.kind, "resposta_invalida");
    }
  }
});

test("item sem float é erro, não vira float zero", () => {
  const r = parseSales([{ price: 100, sold_at: "2026-11-27T00:00:00Z", type: "buy_now", item: {} }]);
  assert.equal(r.ok, false);
});
