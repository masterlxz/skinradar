import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateExit, evaluateExits } from "../../src/core/profit.ts";

// ATENÇÃO: 500 pontos-base (5%) é valor DE TESTE, não a taxa real do CSFloat (ver P9).

test("compra 1500, venda 2712, taxa 5%: taxa 136, lucro 1076, ROI 71,73%", () => {
  const r = evaluateExit({ compra: 1500, venda: 2712, taxaBp: 500, custos: 0 });
  assert.equal(r.taxa, 136);
  assert.equal(r.lucro, 1076);
  assert.equal(r.roiPct.toFixed(2), "71.73");
});

test("taxa com meio centavo arredonda para cima (0,25% de 1000 dá 3)", () => {
  assert.equal(evaluateExit({ compra: 500, venda: 1000, taxaBp: 25, custos: 0 }).taxa, 3);
});

test("custos adicionais reduzem o lucro centavo a centavo", () => {
  const r = evaluateExit({ compra: 1500, venda: 2712, taxaBp: 500, custos: 50 });
  assert.equal(r.lucro, 1026);
  assert.equal(r.custos, 50);
});

test("venda abaixo da compra dá lucro e ROI negativos (-550 e -36,67%)", () => {
  const r = evaluateExit({ compra: 1500, venda: 1000, taxaBp: 500, custos: 0 });
  assert.equal(r.lucro, -550);
  assert.equal(r.roiPct.toFixed(2), "-36.67");
});

test("compra zero é erro (ROI indefinido)", () => {
  assert.throws(() => evaluateExit({ compra: 0, venda: 1000, taxaBp: 500, custos: 0 }), RangeError);
});

test("as três modalidades saem separadas: mercado 71,73%, menor anúncio 31,80%, Buy Order 96,93%", () => {
  const r = evaluateExits(1500, { mercado: 2712, menorAnuncio: 2081, buyOrder: 3110 }, 500, 0);
  assert.equal(r.mercado?.lucro, 1076);
  assert.equal(r.menorAnuncio?.lucro, 477);
  assert.equal(r.menorAnuncio?.roiPct.toFixed(2), "31.80");
  assert.equal(r.buyOrder?.taxa, 156);
  assert.equal(r.buyOrder?.lucro, 1454);
  assert.equal(r.buyOrder?.roiPct.toFixed(2), "96.93");
});

test("referência ausente vira null e não contamina as outras", () => {
  const r = evaluateExits(1500, { mercado: 2712, menorAnuncio: null, buyOrder: null }, 500, 0);
  assert.equal(r.mercado?.lucro, 1076);
  assert.equal(r.menorAnuncio, null);
  assert.equal(r.buyOrder, null);
});
