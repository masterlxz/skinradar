import assert from "node:assert/strict";
import { test } from "node:test";
import { classify } from "../../src/core/classify.ts";
import { evaluateExit } from "../../src/core/profit.ts";
import type { SalesSummary } from "../../src/core/sales.ts";

const ok: SalesSummary = { status: "ok", n: 10, median: 3208, min: 2468, max: 5500 };

/** Saída com compra 10000, sem taxa nem custo: venda 11500 dá ROI exatamente 15. */
const saida = (venda: number) => evaluateExit({ compra: 10000, venda, taxaBp: 0, custos: 0 });

function porMercado(venda: number) {
  return classify({ vendas: ok, mercado: saida(venda), menorAnuncio: null, roiMinPct: 15 });
}

test("ROI de exatamente 15% é interessante", () => {
  assert.equal(porMercado(11500), "interessante");
});

test("ROI de 14,99% é moderada", () => {
  assert.equal(porMercado(11499), "moderada");
});

test("ROI de exatamente 7,5% (metade do mínimo) é moderada", () => {
  assert.equal(porMercado(10750), "moderada");
});

test("ROI de 7,49% é margem insuficiente", () => {
  assert.equal(porMercado(10749), "margem_insuficiente");
});

test("prejuízo é margem insuficiente", () => {
  assert.equal(porMercado(9000), "margem_insuficiente");
});

test("lucro só contra o menor anúncio (ROI 31,8%), não contra as vendas (5%): referência inflacionada", () => {
  const r = classify({ vendas: ok, mercado: saida(10500), menorAnuncio: saida(13180), roiMinPct: 15 });
  assert.equal(r, "referencia_inflacionada");
});

test("lucro contra as vendas e contra o menor anúncio: continua interessante", () => {
  const r = classify({ vendas: ok, mercado: saida(14000), menorAnuncio: saida(16000), roiMinPct: 15 });
  assert.equal(r, "interessante");
});

test("menor anúncio também sem margem e vendas sem margem: margem insuficiente, não inflacionada", () => {
  const r = classify({ vendas: ok, mercado: saida(10500), menorAnuncio: saida(10600), roiMinPct: 15 });
  assert.equal(r, "margem_insuficiente");
});

test("3 vendas na janela com mínimo 5: baixa liquidez", () => {
  const r = classify({ vendas: { status: "insuficiente", n: 3 }, mercado: null, menorAnuncio: null, roiMinPct: 15 });
  assert.equal(r, "baixa_liquidez");
});

test("nenhuma venda: dados insuficientes", () => {
  const r = classify({ vendas: { status: "insuficiente", n: 0 }, mercado: null, menorAnuncio: null, roiMinPct: 15 });
  assert.equal(r, "dados_insuficientes");
});

test("fonte de vendas indisponível (null): dados insuficientes", () => {
  assert.equal(classify({ vendas: null, mercado: null, menorAnuncio: null, roiMinPct: 15 }), "dados_insuficientes");
});
