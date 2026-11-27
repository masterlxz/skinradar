import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeSales } from "../../src/core/sales.ts";
import type { Sale } from "../../src/core/types.ts";
import { parseSales } from "../../src/csfloat/parse.ts";
import { fixture, unwrap } from "../helpers.ts";

const vendas = unwrap(parseSales(fixture("vendas.json")));

function venda(price: number, float: number, stickerCount = 0): Sale {
  return { price, float, soldAt: "2026-11-27T00:00:00Z", type: "buy_now", stickerCount };
}

// Valores abaixo calculados das 15 vendas de tests/fixtures/csfloat/vendas.json (2026-11-27).

test("item sem sticker, alvo 0,20 e janela 0,03: 3 vendas (2550 a 3265) e mediana 3150", () => {
  const r = summarizeSales(vendas, 0.2, 0.03, 3, false);
  assert.deepEqual(r, { status: "ok", n: 3, median: 3150, min: 2550, max: 3265 });
});

test("item sem sticker só compara com vendas sem sticker (2645 e 2712 ficam de fora)", () => {
  const r = summarizeSales(vendas, 0.2, 0.03, 3, false);
  assert.equal(r.status === "ok" && r.min, 2550);
  assert.equal(r.status === "ok" && r.n, 3);
});

test("item com sticker só compara com vendas com sticker (2645 e 2712, mediana 2679)", () => {
  const r = summarizeSales(vendas, 0.2, 0.03, 2, true);
  assert.deepEqual(r, { status: "ok", n: 2, median: 2679, min: 2645, max: 2712 });
});

test("mediana não é a média (item com sticker, janela 0,05: n=6, 3384 e não 3801)", () => {
  const r = summarizeSales(vendas, 0.2, 0.05, 5, true);
  assert.deepEqual(r, { status: "ok", n: 6, median: 3384, min: 2468, max: 5500 });
});

test("item sem sticker em janela 0,05: 4 vendas, abaixo do mínimo 5, vira 'insuficiente'", () => {
  assert.deepEqual(summarizeSales(vendas, 0.2, 0.05, 5, false), { status: "insuficiente", n: 4 });
});

test("janela estreita (0,01) deixa só 2 vendas sem sticker e vira 'insuficiente' com mínimo 5", () => {
  assert.deepEqual(summarizeSales(vendas, 0.2, 0.01, 5, false), { status: "insuficiente", n: 2 });
});

test("item com sticker e janela 0,01: nenhuma venda com sticker, insuficiente com n=0", () => {
  assert.deepEqual(summarizeSales(vendas, 0.2, 0.01, 5, true), { status: "insuficiente", n: 0 });
});

test("sem vendas: insuficiente com n=0", () => {
  assert.deepEqual(summarizeSales([], 0.2, 0.03, 5, false), { status: "insuficiente", n: 0 });
});

test("a janela é inclusiva nos dois lados (0,25 e 0,75 em volta de 0,5)", () => {
  const lista = [venda(1000, 0.25), venda(2000, 0.75), venda(9000, 0.76), venda(9000, 0.24)];
  const r = summarizeSales(lista, 0.5, 0.25, 2, false);
  assert.deepEqual(r, { status: "ok", n: 2, median: 1500, min: 1000, max: 2000 });
});

test("mediana de n par arredonda meio centavo para cima (1001 e 2002 dá 1502)", () => {
  const r = summarizeSales([venda(1001, 0.5), venda(2002, 0.5)], 0.5, 0, 2, false);
  assert.deepEqual(r, { status: "ok", n: 2, median: 1502, min: 1001, max: 2002 });
});
