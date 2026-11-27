import assert from "node:assert/strict";
import { test } from "node:test";
import { validarConfig } from "../../src/analysis/config.ts";

/** Valores de teste, não recomendações: taxa e cotação reais ainda não foram confirmadas (P9, P3). */
const COMPLETA = {
  cotacaoUsdBrl: 5,
  taxaBp: 200,
  janelaFloat: 0.07,
  pisoBuyOrderCents: 1000,
  validadeCacheSeg: 300,
};

function campos(entrada: unknown): string[] | "ok" {
  const r = validarConfig(entrada);
  return r.ok ? "ok" : r.error.campos;
}

test("config completa vale e ganha os padrões decididos: ROI 15%, mínimo 5 vendas, custos 0", () => {
  const r = validarConfig(COMPLETA);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.value, { ...COMPLETA, custosCents: 0, roiMinPct: 15, minVendas: 5 });
});

test("o que o dono informa vence o padrão", () => {
  const r = validarConfig({ ...COMPLETA, custosCents: 150, roiMinPct: 20, minVendas: 8 });
  assert.equal(r.ok && r.value.custosCents, 150);
  assert.equal(r.ok && r.value.roiMinPct, 20);
  assert.equal(r.ok && r.value.minVendas, 8);
});

test("sem cotação não há padrão: erro apontando o campo", () => {
  const { cotacaoUsdBrl: _, ...resto } = COMPLETA;
  assert.deepEqual(campos(resto), ["cotacaoUsdBrl"]);
});

test("sem taxa não há padrão: erro apontando o campo", () => {
  const { taxaBp: _, ...resto } = COMPLETA;
  assert.deepEqual(campos(resto), ["taxaBp"]);
});

test("objeto vazio, nulo ou texto: lista todos os campos obrigatórios, na ordem", () => {
  const todos = ["cotacaoUsdBrl", "taxaBp", "janelaFloat", "pisoBuyOrderCents", "validadeCacheSeg"];
  assert.deepEqual(campos({}), todos);
  assert.deepEqual(campos(null), todos);
  assert.deepEqual(campos("5.65"), todos);
});

const INVALIDOS: [string, Record<string, unknown>, string][] = [
  ["cotação zero", { cotacaoUsdBrl: 0 }, "cotacaoUsdBrl"],
  ["cotação negativa", { cotacaoUsdBrl: -5.65 }, "cotacaoUsdBrl"],
  ["cotação NaN", { cotacaoUsdBrl: Number.NaN }, "cotacaoUsdBrl"],
  ["cotação infinita", { cotacaoUsdBrl: Number.POSITIVE_INFINITY }, "cotacaoUsdBrl"],
  ["cotação em texto (vinda de um campo de formulário)", { cotacaoUsdBrl: "5.65" }, "cotacaoUsdBrl"],
  ["taxa negativa", { taxaBp: -1 }, "taxaBp"],
  ["taxa de 100% (10000 pb)", { taxaBp: 10000 }, "taxaBp"],
  ["taxa fracionária em pontos-base", { taxaBp: 250.5 }, "taxaBp"],
  ["custos negativos", { custosCents: -1 }, "custosCents"],
  ["custos fracionários", { custosCents: 10.5 }, "custosCents"],
  ["ROI mínimo negativo", { roiMinPct: -1 }, "roiMinPct"],
  ["mínimo de vendas zero", { minVendas: 0 }, "minVendas"],
  ["mínimo de vendas fracionário", { minVendas: 2.5 }, "minVendas"],
  ["janela de float zero", { janelaFloat: 0 }, "janelaFloat"],
  ["janela de float maior que 1", { janelaFloat: 1.01 }, "janelaFloat"],
  ["piso de Buy Order negativo", { pisoBuyOrderCents: -1 }, "pisoBuyOrderCents"],
  ["piso de Buy Order fracionário", { pisoBuyOrderCents: 9.5 }, "pisoBuyOrderCents"],
  ["validade do cache negativa", { validadeCacheSeg: -1 }, "validadeCacheSeg"],
];

for (const [nome, troca, campo] of INVALIDOS) {
  test(`valor inválido é recusado e nomeado: ${nome}`, () => {
    assert.deepEqual(campos({ ...COMPLETA, ...troca }), [campo]);
  });
}

test("limites válidos: taxa 0 e 9999 pb, ROI 0, janela 1, piso 0, validade 0 (sem cache)", () => {
  for (const troca of [
    { taxaBp: 0 },
    { taxaBp: 9999 },
    { roiMinPct: 0 },
    { janelaFloat: 1 },
    { pisoBuyOrderCents: 0 },
    { validadeCacheSeg: 0 },
  ]) {
    assert.equal(campos({ ...COMPLETA, ...troca }), "ok", JSON.stringify(troca));
  }
});
