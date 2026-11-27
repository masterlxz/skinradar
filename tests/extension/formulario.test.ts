import assert from "node:assert/strict";
import { test } from "node:test";
import { validarConfig } from "../../src/analysis/config.ts";
import { lerFormulario, paraFormulario, type CamposFormulario } from "../../src/extension/formulario.ts";

/** O que o dono digita, nas unidades dele (valores de teste, não recomendações: P3 e P9 seguem abertas). */
const CAMPOS: CamposFormulario = {
  chave: "abc123",
  cotacaoUsdBrl: "5,65",
  taxaPct: "2,5",
  custosReais: "1,50",
  roiMinPct: "15",
  janelaFloat: "0,05",
  minVendas: "5",
  pisoBuyOrderUsd: "10,00",
  validadeMin: "5",
};

const CONFIG = {
  cotacaoUsdBrl: 5.65,
  taxaBp: 250,
  custosCents: 150,
  roiMinPct: 15,
  janelaFloat: 0.05,
  minVendas: 5,
  pisoBuyOrderCents: 1000,
  validadeCacheSeg: 300,
};

function campos(troca: Record<string, string>, jaTemChave = false) {
  const r = lerFormulario({ ...CAMPOS, ...troca }, jaTemChave);
  return r.ok ? "ok" : r.campos;
}

test("formulário completo: converte para as unidades da configuração (% → pontos-base, R$ → centavos, min → s)", () => {
  const r = lerFormulario(CAMPOS, false);
  assert.deepEqual(r, { ok: true, chave: "abc123", config: CONFIG });
});

test("ponto como separador decimal vale igual à vírgula", () => {
  const r = lerFormulario({ ...CAMPOS, cotacaoUsdBrl: "5.65", taxaPct: "2.5", custosReais: "1.50" }, false);
  assert.deepEqual(r, { ok: true, chave: "abc123", config: CONFIG });
});

test("espaços ao redor dos números e da chave são ignorados", () => {
  const r = lerFormulario({ ...CAMPOS, chave: "  abc123 ", cotacaoUsdBrl: " 5,65 " }, false);
  assert.deepEqual(r, { ok: true, chave: "abc123", config: CONFIG });
});

test("sem erro de ponto flutuante: taxa 2,55% vira 255 pb; validade 1,5 min vira 90 s; janela 0,07 fica 0,07", () => {
  const r = lerFormulario({ ...CAMPOS, taxaPct: "2,55", validadeMin: "1,5", janelaFloat: "0,07" }, false);
  assert.equal(r.ok && r.config.taxaBp, 255);
  assert.equal(r.ok && r.config.validadeCacheSeg, 90);
  assert.equal(r.ok && r.config.janelaFloat, 0.07);
});

test("campos opcionais em branco (custos, ROI mínimo, mínimo de vendas) caem nos padrões decididos", () => {
  const r = lerFormulario({ ...CAMPOS, custosReais: "", roiMinPct: "", minVendas: "" }, false);
  assert.equal(r.ok && r.config.custosCents, 0);
  assert.equal(r.ok && r.config.roiMinPct, 15);
  assert.equal(r.ok && r.config.minVendas, 5);
});

test("validade 0 (sem cache) e taxa 0 são aceitas", () => {
  assert.equal(campos({ validadeMin: "0" }), "ok");
  assert.equal(campos({ taxaPct: "0" }), "ok");
});

// ---------- chave ----------

test("chave em branco com chave já salva: mantém (devolve nulo)", () => {
  const r = lerFormulario({ ...CAMPOS, chave: "" }, true);
  assert.deepEqual(r, { ok: true, chave: null, config: CONFIG });
});

test("chave em branco sem chave salva: erro apontando 'chave'", () => {
  assert.deepEqual(campos({ chave: "" }, false), ["chave"]);
  assert.deepEqual(campos({ chave: "   " }, false), ["chave"]);
});

test("chave com espaço no meio ou com mais de 200 caracteres é recusada; com 200 vale", () => {
  assert.deepEqual(campos({ chave: "ab cd" }), ["chave"]);
  assert.deepEqual(campos({ chave: "a".repeat(201) }), ["chave"]);
  assert.equal(campos({ chave: "a".repeat(200) }), "ok");
});

// ---------- valores inválidos: o campo do formulário é apontado ----------

const INVALIDOS: [string, Record<string, string>, string][] = [
  ["cotação em texto", { cotacaoUsdBrl: "abc" }, "cotacaoUsdBrl"],
  ["cotação com separador de milhar", { cotacaoUsdBrl: "1.234,56" }, "cotacaoUsdBrl"],
  ["cotação com duas vírgulas", { cotacaoUsdBrl: "5,6,7" }, "cotacaoUsdBrl"],
  ["cotação negativa", { cotacaoUsdBrl: "-5" }, "cotacaoUsdBrl"],
  ["cotação com vírgula solta no fim", { cotacaoUsdBrl: "5," }, "cotacaoUsdBrl"],
  ["cotação zero", { cotacaoUsdBrl: "0" }, "cotacaoUsdBrl"],
  ["cotação em branco", { cotacaoUsdBrl: "" }, "cotacaoUsdBrl"],
  ["taxa de 100%", { taxaPct: "100" }, "taxaPct"],
  ["taxa com 3 casas (meio ponto-base não existe)", { taxaPct: "2,555" }, "taxaPct"],
  ["taxa em branco", { taxaPct: "" }, "taxaPct"],
  ["custos com 3 casas (fração de centavo)", { custosReais: "1,505" }, "custosReais"],
  ["piso com 3 casas (fração de centavo)", { pisoBuyOrderUsd: "10,005" }, "pisoBuyOrderUsd"],
  ["piso em branco", { pisoBuyOrderUsd: "" }, "pisoBuyOrderUsd"],
  ["janela de float maior que 1", { janelaFloat: "1,5" }, "janelaFloat"],
  ["janela de float em branco", { janelaFloat: "" }, "janelaFloat"],
  ["mínimo de vendas fracionário", { minVendas: "2,5" }, "minVendas"],
  ["mínimo de vendas zero", { minVendas: "0" }, "minVendas"],
  ["validade em branco", { validadeMin: "" }, "validadeMin"],
];

for (const [nome, troca, campo] of INVALIDOS) {
  test(`formulário inválido aponta o campo do formulário: ${nome}`, () => {
    assert.deepEqual(campos(troca), [campo]);
  });
}

test("vários erros vêm todos, sempre na ordem do formulário, sem repetição", () => {
  const r = lerFormulario({}, false);
  assert.deepEqual(r, {
    ok: false,
    campos: ["chave", "cotacaoUsdBrl", "taxaPct", "janelaFloat", "pisoBuyOrderUsd", "validadeMin"],
  });
});

test("campo que nem existe no objeto conta como em branco", () => {
  const { janelaFloat: _, ...sem } = CAMPOS;
  assert.deepEqual(lerFormulario(sem, false), { ok: false, campos: ["janelaFloat"] });
});

// ---------- preencher o formulário com o que está guardado ----------

test("paraFormulario escreve cada valor na unidade do dono, com vírgula, e sem a chave", () => {
  const { chave: _, ...esperado } = CAMPOS;
  assert.deepEqual(paraFormulario(CONFIG), esperado);
  assert.equal("chave" in paraFormulario(CONFIG), false);
});

test("paraFormulario: taxa inteira sem vírgula, custos sempre com 2 casas, validade fracionária", () => {
  const f = paraFormulario({ ...CONFIG, taxaBp: 200, custosCents: 0, validadeCacheSeg: 90 });
  assert.equal(f["taxaPct"], "2");
  assert.equal(f["custosReais"], "0,00");
  assert.equal(f["validadeMin"], "1,5");
});

test("ida e volta: lerFormulario(paraFormulario(config)) devolve a mesma configuração", () => {
  for (const config of [CONFIG, { ...CONFIG, taxaBp: 255, validadeCacheSeg: 90, janelaFloat: 0.07, custosCents: 5 }]) {
    const v = validarConfig(config);
    assert.equal(v.ok, true);
    const r = lerFormulario({ ...paraFormulario(config), chave: "k" }, false);
    assert.deepEqual(r, { ok: true, chave: "k", config });
  }
});
