import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeSales } from "../../src/core/sales.ts";
import type { Sale } from "../../src/core/types.ts";
import { parseSales } from "../../src/csfloat/parse.ts";
import { fixture, unwrap } from "../helpers.ts";

const vendas = unwrap(parseSales(fixture("vendas.json")));

function venda(price: number, float: number): Sale {
  return { price, float, soldAt: "2026-11-27T00:00:00Z", type: "buy_now" };
}

test("alvo 0,20 e janela 0,03: 5 vendas (2550 a 3265) e mediana 2712", () => {
  const r = summarizeSales(vendas, 0.2, 0.03, 5);
  assert.deepEqual(r, { status: "ok", n: 5, median: 2712, min: 2550, max: 3265 });
});

test("mediana não é a média (n=10: 3208 e não 3627)", () => {
  const r = summarizeSales(vendas, 0.2, 0.05, 5);
  assert.deepEqual(r, { status: "ok", n: 10, median: 3208, min: 2468, max: 5500 });
});

test("janela estreita (0,01) deixa só 2 vendas e vira 'insuficiente' com mínimo 5", () => {
  assert.deepEqual(summarizeSales(vendas, 0.2, 0.01, 5), { status: "insuficiente", n: 2 });
});

test("sem vendas: insuficiente com n=0", () => {
  assert.deepEqual(summarizeSales([], 0.2, 0.03, 5), { status: "insuficiente", n: 0 });
});

test("a janela é inclusiva nos dois lados (0,25 e 0,75 em volta de 0,5)", () => {
  const lista = [venda(1000, 0.25), venda(2000, 0.75), venda(9000, 0.76), venda(9000, 0.24)];
  const r = summarizeSales(lista, 0.5, 0.25, 2);
  assert.deepEqual(r, { status: "ok", n: 2, median: 1500, min: 1000, max: 2000 });
});

test("mediana de n par arredonda meio centavo para cima (1001 e 2002 dá 1502)", () => {
  const r = summarizeSales([venda(1001, 0.5), venda(2002, 0.5)], 0.5, 0, 2);
  assert.deepEqual(r, { status: "ok", n: 2, median: 1502, min: 1001, max: 2002 });
});
