import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Analise } from "../../src/analysis/analisar.ts";
import { CSS, renderEstado, renderPainel } from "../../src/ui/painel.ts";
import { pagina } from "../helpers.ts";

const T0 = 1_000_000;
const NAME = "AK-47 | Redline (Field-Tested)";

/**
 * Análise escrita à mão (o tipo `Analise` garante o contrato no typecheck). Os números do mercado e do
 * menor anúncio são os do caminho feliz da 2b-2a (compra R$ 80,00, cotação 5, taxa 2%); a Buy Order foi
 * ajustada (venda 10250) só para o ROI não cair num empate de arredondamento.
 */
const BASE: Analise = {
  item: { marketHashName: NAME, priceCents: 8000, float: 0.28, stickers: [], tradeLock: "livre" },
  classificacao: "interessante",
  saidas: {
    mercado: { compra: 8000, venda: 11705, taxa: 234, custos: 0, lucro: 3471, roiPct: 43.3875 },
    menorAnuncio: { compra: 8000, venda: 10405, taxa: 208, custos: 0, lucro: 2197, roiPct: 27.4625 },
    buyOrder: { compra: 8000, venda: 10250, taxa: 205, custos: 0, lucro: 2045, roiPct: 25.5625 },
  },
  vendas: { status: "ok", n: 2, median: 2341, min: 2132, max: 2550 },
  ancora: { listingId: "1046154856651425681", distancia: 0.00016576170921326 },
  buyOrders: { melhor: { price: 2040, qty: 10 }, elegiveis: 9, deSticker: 0, foraDaFaixa: 0, abaixoDoPiso: 2 },
  avisos: [{ kind: "moeda_inferida" }],
  erros: {},
  atualizadoEm: T0,
  deCache: false,
};

function painel(troca: Partial<Analise> = {}, agora = T0): Element {
  return renderPainel(pagina("") as Document, { ...BASE, ...troca }, agora);
}

const texto = (raiz: Element, seletor: string): string | undefined =>
  raiz.querySelector(seletor)?.textContent?.trim();

// ---------- caminho feliz ----------

test("o painel mostra o item: nome, float em 4 casas, preço de compra e a classificação", () => {
  const p = painel();
  assert.equal(texto(p, '[data-secao="item"] [data-campo="nome"]'), NAME);
  assert.equal(texto(p, '[data-secao="item"] [data-campo="float"] .sr-valor'), "0,2800");
  assert.equal(texto(p, '[data-secao="item"] [data-campo="compra"] .sr-valor'), "R$ 80,00");
  assert.equal(texto(p, '[data-secao="classificacao"]'), "Oportunidade interessante");
  assert.equal(p.getAttribute("data-classificacao"), "interessante");
});

test("as três saídas aparecem separadas, cada uma com venda, taxa, lucro e ROI em reais", () => {
  const p = painel();
  const campo = (saida: string, c: string) => texto(p, `[data-saida="${saida}"] [data-campo="${c}"] .sr-valor`);
  assert.deepEqual(
    ["venda", "taxa", "lucro", "roi"].map((c) => campo("mercado", c)),
    ["R$ 117,05", "R$ 2,34", "R$ 34,71", "43,4%"],
  );
  assert.deepEqual(
    ["venda", "taxa", "lucro", "roi"].map((c) => campo("menor_anuncio", c)),
    ["R$ 104,05", "R$ 2,08", "R$ 21,97", "27,5%"],
  );
  assert.deepEqual(
    ["venda", "taxa", "lucro", "roi"].map((c) => campo("buy_order", c)),
    ["R$ 102,50", "R$ 2,05", "R$ 20,45", "25,6%"],
  );
  assert.equal(p.querySelectorAll("[data-saida]").length, 3);
});

test("a Buy Order é rotulada como alternativa, não como saída garantida (PRD 5.3)", () => {
  const titulo = texto(painel(), '[data-saida="buy_order"] [data-campo="titulo"]');
  assert.equal(titulo, "Venda por Buy Order (não é saída garantida)");
});

test("lucro negativo leva sinal e é marcado para a cor vermelha", () => {
  const p = painel({ saidas: { ...BASE.saidas, mercado: { compra: 8000, venda: 7700, taxa: 154, custos: 0, lucro: -454, roiPct: -5.675 } } });
  assert.equal(texto(p, '[data-saida="mercado"] [data-campo="lucro"] .sr-valor'), "-R$ 4,54");
  assert.equal(p.querySelector('[data-saida="mercado"] [data-campo="lucro"]')?.getAttribute("data-sinal"), "negativo");
  assert.equal(p.querySelector('[data-saida="menor_anuncio"] [data-campo="lucro"]')?.getAttribute("data-sinal"), "positivo");
});

// ---------- saída sem dado: o motivo, nunca um número inventado ----------

test("mercado sem dados: amostra insuficiente diz quantas vendas comparáveis havia (plural e singular)", () => {
  const sem = { ...BASE.saidas, mercado: null };
  const tres = painel({ saidas: sem, vendas: { status: "insuficiente", n: 3 }, classificacao: "baixa_liquidez" });
  assert.equal(texto(tres, '[data-saida="mercado"] [data-campo="vazio"]'), "Sem dados: amostra insuficiente (3 vendas comparáveis).");
  assert.equal(tres.querySelector('[data-saida="mercado"] [data-campo="venda"]'), null);
  const uma = painel({ saidas: sem, vendas: { status: "insuficiente", n: 1 } });
  assert.equal(texto(uma, '[data-saida="mercado"] [data-campo="vazio"]'), "Sem dados: amostra insuficiente (1 venda comparável).");
});

test("mercado sem dados: sem float no card, ou fonte de vendas fora do ar", () => {
  const sem = { ...BASE.saidas, mercado: null };
  const semFloat = painel({ saidas: sem, vendas: null, item: { ...BASE.item, float: null } });
  assert.equal(texto(semFloat, '[data-saida="mercado"] [data-campo="vazio"]'), "Sem dados: o card não traz float.");
  const falha = painel({ saidas: sem, vendas: null, erros: { vendas: { kind: "http", status: 500 } } });
  assert.equal(texto(falha, '[data-saida="mercado"] [data-campo="vazio"]'), "Sem dados: a fonte de vendas falhou.");
});

test("menor anúncio e Buy Order sem dados: cada um com o seu motivo", () => {
  const p = painel({
    saidas: { ...BASE.saidas, menorAnuncio: null, buyOrder: null },
    buyOrders: { melhor: null, elegiveis: 0, deSticker: 0, foraDaFaixa: 0, abaixoDoPiso: 0 },
  });
  assert.equal(texto(p, '[data-saida="menor_anuncio"] [data-campo="vazio"]'), "Sem dados: nenhum anúncio buy_now à venda.");
  assert.equal(texto(p, '[data-saida="buy_order"] [data-campo="vazio"]'), "Sem dados: nenhuma Buy Order compatível.");
  const falha = painel({
    saidas: { ...BASE.saidas, menorAnuncio: null, buyOrder: null },
    buyOrders: null,
    erros: { listings: { kind: "auth", status: 401 }, buyOrders: { kind: "limite", status: 429 } },
  });
  assert.equal(texto(falha, '[data-saida="menor_anuncio"] [data-campo="vazio"]'), "Sem dados: a fonte de anúncios falhou.");
  assert.equal(texto(falha, '[data-saida="buy_order"] [data-campo="vazio"]'), "Sem dados: a fonte de Buy Orders falhou.");
});

// ---------- vendas e Buy Orders do CSFloat (em dólar, sem converter) ----------

test("vendas do CSFloat aparecem em dólar, com n, mediana, mínimo e máximo", () => {
  assert.equal(
    texto(painel(), '[data-secao="vendas"]'),
    "Vendas do CSFloat (US$, moeda inferida): 2 vendas comparáveis · mediana US$ 23,41 · mín. US$ 21,32 · máx. US$ 25,50",
  );
});

test("vendas: amostra insuficiente e ausência de dados não mostram mediana", () => {
  assert.equal(
    texto(painel({ vendas: { status: "insuficiente", n: 3 } }), '[data-secao="vendas"]'),
    "Vendas do CSFloat (US$, moeda inferida): amostra insuficiente (3 vendas comparáveis).",
  );
  assert.equal(
    texto(painel({ vendas: null }), '[data-secao="vendas"]'),
    "Vendas do CSFloat (US$, moeda inferida): sem dados.",
  );
});

test("Buy Orders: a maior compatível, quantas contam e quantas ficaram de fora", () => {
  const p = painel({
    buyOrders: { melhor: { price: 2040, qty: 10 }, elegiveis: 9, deSticker: 3, foraDaFaixa: 1, abaixoDoPiso: 2 },
  });
  assert.equal(
    texto(p, '[data-secao="buy-orders"]'),
    "Buy Orders do CSFloat (US$): maior compatível US$ 20,40 (10 un.) · 9 contam · 2 abaixo do piso · 1 fora da faixa de float · 3 exigem sticker (não cobertas)",
  );
});

test("Buy Orders: sem ordem compatível, e fonte indisponível, ficam explícitos", () => {
  const nenhuma = painel({ buyOrders: { melhor: null, elegiveis: 0, deSticker: 0, foraDaFaixa: 0, abaixoDoPiso: 0 } });
  assert.equal(texto(nenhuma, '[data-secao="buy-orders"]'), "Buy Orders do CSFloat (US$): nenhuma ordem compatível.");
  const fora = painel({ buyOrders: null });
  assert.equal(texto(fora, '[data-secao="buy-orders"]'), "Buy Orders do CSFloat (US$): não analisadas.");
});

// ---------- avisos, erros, stickers, rodapé ----------

test("avisos aparecem na ordem recebida, com o texto de textoAviso; sem avisos, sem a seção", () => {
  const p = painel({ avisos: [{ kind: "moeda_inferida" }, { kind: "bloqueio_troca", dias: 4 }] });
  const itens = Array.from(p.querySelectorAll('[data-secao="avisos"] li')).map((li) => li.textContent);
  assert.deepEqual(itens, [
    "Moeda do CSFloat inferida como dólar (US$): a API não informa a moeda.",
    "Bloqueio de troca: libera em 4 dias.",
  ]);
  assert.equal(painel({ avisos: [] }).querySelector('[data-secao="avisos"]'), null);
});

test("erros por fonte aparecem com o nome da fonte; sem erros, sem a seção", () => {
  const p = painel({
    erros: { vendas: { kind: "http", status: 500 }, buyOrders: { kind: "limite", status: 429, retryAfterSeg: 30 } },
  });
  const itens = Array.from(p.querySelectorAll('[data-secao="erros"] li')).map((li) => li.textContent);
  assert.deepEqual(itens, [
    "Vendas: o CSFloat respondeu HTTP 500.",
    "Buy Orders: limite de requisições do CSFloat atingido; tente de novo em 30 s.",
  ]);
  assert.equal(painel().querySelector('[data-secao="erros"]'), null);
});

test("stickers do item aparecem um por linha, na ordem do card", () => {
  const p = painel({ item: { ...BASE.item, stickers: ["Sticker | A", "Sticker | B", "Sticker | A"] } });
  const itens = Array.from(p.querySelectorAll('[data-secao="item"] [data-campo="stickers"] li')).map((li) => li.textContent);
  assert.deepEqual(itens, ["Sticker | A", "Sticker | B", "Sticker | A"]);
  assert.equal(painel().querySelector('[data-campo="stickers"]'), null);
});

test("item sem float no card mostra 'sem float', não 'NaN' nem '0,0000'", () => {
  const p = painel({ item: { ...BASE.item, float: null } });
  assert.equal(texto(p, '[data-secao="item"] [data-campo="float"] .sr-valor'), "sem float");
});

test("rodapé: idade dos dados, marca de cache e o botão de atualizar", () => {
  const novo = painel({}, T0 + 30_000);
  assert.equal(texto(novo, '[data-secao="rodape"] [data-campo="idade"]'), "Dados do CSFloat de há instantes");
  const velho = painel({ deCache: true }, T0 + 5 * 60_000);
  assert.equal(texto(velho, '[data-secao="rodape"] [data-campo="idade"]'), "Dados do CSFloat de há 5 min (cache)");
  assert.equal(texto(velho, 'button[data-acao="atualizar"]'), "Atualizar");
});

// ---------- fronteira de confiança: texto do site nunca vira HTML ----------

test("nome de skin e stickers com HTML malicioso viram texto, sem elemento novo", () => {
  const veneno = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  const p = painel({ item: { ...BASE.item, marketHashName: veneno, stickers: [veneno] } });
  assert.equal(p.querySelector("img"), null);
  assert.equal(p.querySelector("script"), null);
  assert.equal(texto(p, '[data-secao="item"] [data-campo="nome"]'), veneno);
  assert.equal(texto(p, '[data-campo="stickers"] li'), veneno);
});

test("o código do painel não usa innerHTML, outerHTML nem insertAdjacentHTML", () => {
  const fonte = readFileSync(new URL("../../src/ui/painel.ts", import.meta.url), "utf8");
  assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(fonte), false);
});

// ---------- estados ----------

test("estado 'carregando' mostra o texto e nenhuma seção de análise", () => {
  const e = renderEstado(pagina("") as Document, { tipo: "carregando" });
  assert.equal(e.getAttribute("data-estado"), "carregando");
  assert.equal(e.textContent?.trim(), "Analisando…");
  assert.equal(e.querySelector("[data-saida]"), null);
});

test("estado de erro: configuração incompleta lista os campos pelo nome em português", () => {
  const e = renderEstado(pagina("") as Document, {
    tipo: "erro",
    erro: { kind: "config_invalida", campos: ["cotacaoUsdBrl", "taxaBp"] },
  });
  assert.equal(e.getAttribute("data-estado"), "erro");
  assert.equal(e.textContent?.trim(), "Configuração incompleta: preencha nas opções da extensão: cotação USD→BRL, taxa de venda.");
});

test("estado de erro: sem chave e erro interno têm mensagem própria", () => {
  const doc = pagina("") as Document;
  assert.equal(
    renderEstado(doc, { tipo: "erro", erro: { kind: "sem_chave" } }).textContent?.trim(),
    "Chave da API do CSFloat não configurada: abra as opções da extensão.",
  );
  assert.equal(
    renderEstado(doc, { tipo: "erro", erro: { kind: "interno" } }).textContent?.trim(),
    "Erro interno ao analisar. Tente de novo.",
  );
});

test("o CSS exportado estiliza o painel e não busca nada na rede", () => {
  assert.ok(CSS.includes(".sr-painel"));
  assert.equal(/@import|url\(/i.test(CSS), false);
});

test("estado de erro: card ilegível diz o motivo de cada tipo de falha do leitor", () => {
  const doc = pagina("") as Document;
  const esperado: [string, string][] = [
    ["preco_invalido", "Não consegui ler este card: o preço está em formato inesperado."],
    ["sem_preco", "Não consegui ler este card: o preço não foi encontrado."],
    ["sem_nome", "Não consegui ler este card: o nome do item não foi encontrado."],
    ["sem_id", "Não consegui ler este card: o id do item não foi encontrado."],
  ];
  for (const [motivo, frase] of esperado) {
    const e = renderEstado(doc, {
      tipo: "erro",
      erro: { kind: "card_ilegivel", motivo: motivo as "preco_invalido" | "sem_preco" | "sem_nome" | "sem_id" },
    });
    assert.equal(e.textContent?.trim(), frase, motivo);
  }
});
