import assert from "node:assert/strict";
import { test } from "node:test";
import { splitOrders } from "../../src/core/orders.ts";
import type { BuyOrder } from "../../src/core/types.ts";
import { parseBuyOrders } from "../../src/csfloat/parse.ts";
import { fixture, unwrap } from "../helpers.ts";

const baixo = unwrap(parseBuyOrders(fixture("buy-orders-baixo.json")));
const alto = unwrap(parseBuyOrders(fixture("buy-orders-alto.json")));
const comSticker = unwrap(parseBuyOrders(fixture("buy-orders-sticker-77-66.json")));

const precos = (l: BuyOrder[]) => l.map((o) => o.price);

test("float 0,1942: todas as 10 ordens servem e a melhor é a de faixa estreita (3170)", () => {
  const r = splitOrders(baixo, 0.1942, 0);
  assert.equal(r.eligible.length, 10);
  assert.equal(r.best?.price, 3170);
  assert.equal(r.bestGeneric, null);
});

test("float 0,199: a faixa estreita 0,1924 a 0,1972 sai e a melhor passa a ser 3110", () => {
  const r = splitOrders(baixo, 0.199, 0);
  assert.deepEqual(precos(r.outOfRange), [3170]);
  assert.equal(r.best?.price, 3110);
});

test("ordem com float no limite da faixa entra (0,21 é o máximo de 3100 e 3040)", () => {
  const r = splitOrders(baixo, 0.21, 0);
  assert.equal(r.best?.price, 3100);
  assert.deepEqual(precos(r.outOfRange), [3170, 3110]);
});

test("float 0,22: ficam de fora as de faixa até 0,21 e a de 0,219; a melhor é 2410", () => {
  const r = splitOrders(baixo, 0.22, 0);
  assert.deepEqual(precos(r.outOfRange), [3170, 3110, 3100, 3040, 2310]);
  assert.equal(r.best?.price, 2410);
});

test("limites da faixa são inclusivos nos dois lados (0,25 e 0,5)", () => {
  const ordem: BuyOrder = { price: 1000, qty: 1, minFloat: 0.25, maxFloat: 0.5, stickers: [] };
  assert.equal(splitOrders([ordem], 0.25, 0).eligible.length, 1);
  assert.equal(splitOrders([ordem], 0.5, 0).eligible.length, 1);
  assert.equal(splitOrders([ordem], 0.51, 0).outOfRange.length, 1);
  assert.equal(splitOrders([ordem], 0.24, 0).outOfRange.length, 1);
});

test("piso 1000 descarta as ordens-lixo (400 e 176); a melhor é a genérica 2040", () => {
  const r = splitOrders(alto, 0.36, 1000);
  assert.deepEqual(precos(r.belowFloor), [400, 176]);
  assert.equal(r.eligible.length, 9);
  assert.equal(r.best?.price, 2040);
  assert.equal(r.bestGeneric?.price, 2040);
});

test("ordem de faixa 0,15 a 0,38 entra para o item de float 0,36 junto com as genéricas", () => {
  const r = splitOrders(alto, 0.36, 0);
  assert.equal(r.eligible.length, 11);
  assert.ok(r.eligible.some((o) => o.minFloat === 0.15 && o.maxFloat === 0.38));
});

test("ordem de sticker não conta como saída (9000, 6300 e 6250 ficam à parte)", () => {
  const r = splitOrders(comSticker, 0.3468, 1000);
  assert.deepEqual(precos(r.stickerOnly), [9000, 6300, 6250]);
  assert.equal(r.best?.price, 2040);
  assert.ok(r.eligible.every((o) => o.price <= 2040));
});

test("sem ordens: nada elegível", () => {
  const r = splitOrders([], 0.3, 0);
  assert.equal(r.best, null);
  assert.equal(r.eligible.length, 0);
});
