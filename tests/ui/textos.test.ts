import assert from "node:assert/strict";
import { test } from "node:test";
import type { Aviso } from "../../src/analysis/analisar.ts";
import type { Classificacao } from "../../src/core/classify.ts";
import type { CsfloatError } from "../../src/csfloat/types.ts";
import { rotuloCampo, rotuloClassificacao, textoAviso, textoErro } from "../../src/ui/textos.ts";

test("cada classificação tem o rótulo do PRD (seção 6)", () => {
  const esperado: Record<Classificacao, string> = {
    interessante: "Oportunidade interessante",
    moderada: "Oportunidade moderada",
    margem_insuficiente: "Margem insuficiente",
    referencia_inflacionada: "Preço de referência inflacionado",
    baixa_liquidez: "Baixa liquidez",
    dados_insuficientes: "Dados insuficientes",
  };
  for (const [k, texto] of Object.entries(esperado)) {
    assert.equal(rotuloClassificacao(k as Classificacao), texto);
  }
});

test("avisos: moeda, bloqueio (singular e plural), sem float, âncora distante e sticker", () => {
  const casos: [Aviso, string][] = [
    [{ kind: "moeda_inferida" }, "Moeda do CSFloat inferida como dólar (US$): a API não informa a moeda."],
    [{ kind: "bloqueio_troca", dias: 4 }, "Bloqueio de troca: libera em 4 dias."],
    [{ kind: "bloqueio_troca", dias: 1 }, "Bloqueio de troca: libera em 1 dia."],
    [{ kind: "sem_float" }, "Item sem float no card: vendas e Buy Orders por float não foram analisadas."],
    [
      { kind: "ancora_distante", distancia: 0.06016576 },
      "Anúncio-âncora a 0,0602 de float do item: Buy Orders de faixa estreita podem faltar.",
    ],
    [
      { kind: "sticker_nao_coberto" },
      "Item com stickers: Buy Orders que exigem sticker não são cobertas, e as vendas comparam só itens com sticker.",
    ],
  ];
  for (const [aviso, texto] of casos) assert.equal(textoAviso(aviso), texto, aviso.kind);
});

test("erros do CSFloat: cada tipo vira uma frase com o nome da fonte", () => {
  const casos: [CsfloatError, string][] = [
    [{ kind: "auth", status: 401 }, "Vendas: o CSFloat recusou a chave (HTTP 401); confira a chave nas opções."],
    [{ kind: "nao_encontrado", status: 404 }, "Vendas: item não encontrado no CSFloat."],
    [
      { kind: "limite", status: 429, retryAfterSeg: 30 },
      "Vendas: limite de requisições do CSFloat atingido; tente de novo em 30 s.",
    ],
    [{ kind: "limite", status: 429 }, "Vendas: limite de requisições do CSFloat atingido; tente de novo em instantes."],
    [{ kind: "rede", detalhe: "sem rede" }, "Vendas: sem conexão com o CSFloat."],
    [{ kind: "resposta_invalida" }, "Vendas: resposta inesperada do CSFloat."],
    [{ kind: "http", status: 500 }, "Vendas: o CSFloat respondeu HTTP 500."],
  ];
  for (const [erro, texto] of casos) assert.equal(textoErro("Vendas", erro), texto, erro.kind);
});

test("o detalhe técnico de um erro de rede não vaza para o texto do painel", () => {
  assert.equal(textoErro("Anúncios", { kind: "rede", detalhe: "TypeError: chave=SEGREDO" }).includes("SEGREDO"), false);
});

test("rótulos dos campos da configuração, para o aviso de configuração incompleta", () => {
  assert.equal(rotuloCampo("cotacaoUsdBrl"), "cotação USD→BRL");
  assert.equal(rotuloCampo("taxaBp"), "taxa de venda");
  assert.equal(rotuloCampo("janelaFloat"), "janela de float das vendas");
  assert.equal(rotuloCampo("pisoBuyOrderCents"), "piso de Buy Order");
  assert.equal(rotuloCampo("validadeCacheSeg"), "validade do cache");
  assert.equal(rotuloCampo("custosCents"), "custos");
  assert.equal(rotuloCampo("roiMinPct"), "ROI mínimo");
  assert.equal(rotuloCampo("minVendas"), "mínimo de vendas");
  assert.equal(rotuloCampo("campoDesconhecido"), "campoDesconhecido");
});
