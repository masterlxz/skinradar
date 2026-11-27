import assert from "node:assert/strict";
import { test } from "node:test";
import { criarAnalisador, type Analise, type ItemParaAnalise } from "../../src/analysis/analisar.ts";
import { readCard } from "../../src/adapters/dashskins/card.ts";
import { createClient, type FetchLike } from "../../src/csfloat/client.ts";
import { fixture, htmlDashskins, raizDoCard, unwrap } from "../helpers.ts";

const NAME = "AK-47 | Redline (Field-Tested)";

/**
 * Valores de teste, não recomendações (taxa e cotação reais seguem em P9 e P3). Cotação 5 e taxa 2%
 * só para as contas fecharem em inteiros. Janela 0,07 e mínimo 2 vendas foram escolhidos para a
 * fixture `vendas.json` render amostras pequenas porém não vazias (ver tabela do plano).
 */
const CONFIG = {
  cotacaoUsdBrl: 5,
  taxaBp: 200,
  janelaFloat: 0.07,
  minVendas: 2,
  pisoBuyOrderCents: 1000,
  validadeCacheSeg: 300,
};

const ITEM: ItemParaAnalise = {
  marketHashName: NAME,
  priceCents: 8000,
  float: 0.28,
  stickers: [],
  tradeLock: "livre",
};

type Rota = { status?: number; body?: unknown; headers?: Record<string, string>; lanca?: boolean };
type Nome = "listings" | "vendas" | "buyOrders";

const PADRAO: Record<Nome, Rota> = {
  listings: { body: { data: fixture("listings-buy-now.json") } },
  vendas: { body: fixture("vendas.json") },
  buyOrders: { body: fixture("buy-orders-alto.json") },
};

/** Rede falsa por rota (a única fronteira de I/O). Guarda cada URL chamada. */
function rede(troca: Partial<Record<Nome, Rota>> = {}) {
  const chamadas: string[] = [];
  const f: FetchLike = async (url) => {
    chamadas.push(url);
    const nome: Nome = url.includes("/buy-orders") ? "buyOrders" : url.includes("/history/") ? "vendas" : "listings";
    const r = { ...PADRAO[nome], ...troca[nome] };
    if (r.lanca === true) throw new Error("sem rede");
    const corpo = r.body === undefined ? "" : JSON.stringify(r.body);
    return new Response(corpo, { status: r.status ?? 200, headers: r.headers ?? {} });
  };
  return { f, chamadas };
}

const T0 = 1_000_000;

function montar(troca: Partial<Record<Nome, Rota>> = {}) {
  const { f, chamadas } = rede(troca);
  let agora = T0;
  const analisar = criarAnalisador({ client: createClient({ apiKey: "chave-de-teste", fetch: f }), agora: () => agora });
  return {
    analisar,
    chamadas,
    avancar(ms: number) {
      agora += ms;
    },
  };
}

async function analise(
  troca: Partial<Record<Nome, Rota>> = {},
  item: ItemParaAnalise = ITEM,
  config: Record<string, unknown> = CONFIG,
): Promise<Analise> {
  return unwrap(await montar(troca).analisar(item, config));
}

const kinds = (a: Analise) => a.avisos.map((x) => x.kind).sort();

// ---------- caminho feliz ----------

test("item limpo de float 0,28 a R$ 80,00: as três saídas separadas, em reais, e 'interessante'", async () => {
  const a = await analise();
  // vendas limpas dentro de ±0,07: 2132 (float 0,3443) e 2550 (0,2294) → mediana (2132+2550)/2 = 2341 US$c
  assert.deepEqual(a.vendas, { status: "ok", n: 2, median: 2341, min: 2132, max: 2550 });
  // mercado: 2341×5 = 11705; taxa 2% = 234; lucro = 11705−234−8000 = 3471; ROI = 43,3875%
  assert.equal(a.saidas.mercado?.venda, 11705);
  assert.equal(a.saidas.mercado?.taxa, 234);
  assert.equal(a.saidas.mercado?.lucro, 3471);
  assert.ok(Math.abs((a.saidas.mercado?.roiPct ?? 0) - 43.3875) < 1e-9);
  // menor anúncio buy_now: 2081×5 = 10405; taxa 208; lucro 2197
  assert.equal(a.saidas.menorAnuncio?.venda, 10405);
  assert.equal(a.saidas.menorAnuncio?.lucro, 2197);
  // Buy Order: a maior elegível (2040)×5 = 10200; taxa 204; lucro 1996
  assert.equal(a.saidas.buyOrder?.venda, 10200);
  assert.equal(a.saidas.buyOrder?.lucro, 1996);
  assert.equal(a.classificacao, "interessante");
  assert.deepEqual(a.erros, {});
  assert.equal(a.deCache, false);
});

test("o item aparece no resultado como foi lido, com o preço de compra em reais", async () => {
  const a = await analise();
  assert.equal(a.item.marketHashName, NAME);
  assert.equal(a.item.priceCents, 8000);
  assert.equal(a.item.float, 0.28);
});

test("uma análise faz 3 chamadas: listings buy_now (200, mais barato), vendas e Buy Orders da âncora", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  assert.equal(m.chamadas.length, 3);
  const l = new URL(m.chamadas.find((u) => u.includes("/listings?")) ?? "");
  assert.equal(l.searchParams.get("market_hash_name"), NAME);
  assert.equal(l.searchParams.get("type"), "buy_now");
  assert.equal(l.searchParams.get("limit"), "200");
  assert.equal(l.searchParams.get("sort_by"), "lowest_price");
  assert.ok(m.chamadas.includes("https://csfloat.com/api/v1/history/AK-47%20%7C%20Redline%20(Field-Tested)/sales"));
  // âncora = anúncio de float mais próximo de 0,28 entre os baixados (0,2802, id abaixo)
  assert.ok(m.chamadas.some((u) => u.startsWith("https://csfloat.com/api/v1/listings/1046154856651425681/buy-orders")));
});

test("a âncora é a de float mais próximo, e o resultado diz qual é e a que distância", async () => {
  const a = await analise();
  assert.equal(a.ancora?.listingId, "1046154856651425681");
  assert.ok(Math.abs((a.ancora?.distancia ?? 1) - 0.00016576170921326) < 1e-9);
  assert.deepEqual(kinds(a), ["moeda_inferida"]);
});

test("as Buy Orders do resultado dizem quantas contaram e quantas ficaram de fora", async () => {
  const a = await analise();
  // fixture alto, float 0,28, piso 1000: 9 elegíveis (2040 a 1690), 2 abaixo do piso (400 e 176)
  assert.deepEqual(a.buyOrders, { melhor: { price: 2040, qty: 10 }, elegiveis: 9, deSticker: 0, foraDaFaixa: 0, abaixoDoPiso: 2 });
});

test("a moeda do CSFloat sempre vem rotulada como inferida (P3)", async () => {
  assert.ok((await analise()).avisos.some((x) => x.kind === "moeda_inferida"));
});

// ---------- classificação de ponta a ponta ----------

test("ROI mínimo vem da configuração: 43,39% com mínimo 50% é 'moderada'", async () => {
  const a = await analise({}, ITEM, { ...CONFIG, roiMinPct: 50 });
  assert.equal(a.classificacao, "moderada");
});

test("compra a R$ 110,00: lucro 471 sobre a mediana (ROI 4,28%) é 'margem insuficiente'", async () => {
  const a = await analise({}, { ...ITEM, priceCents: 11000 });
  assert.equal(a.saidas.mercado?.lucro, 471);
  assert.equal(a.classificacao, "margem_insuficiente");
});

test("amostra de 2 vendas com mínimo 5: 'baixa liquidez' e sem saída de mercado inventada", async () => {
  const a = await analise({}, ITEM, { ...CONFIG, minVendas: 5 });
  assert.deepEqual(a.vendas, { status: "insuficiente", n: 2 });
  assert.equal(a.saidas.mercado, null);
  assert.equal(a.classificacao, "baixa_liquidez");
});

test("leilão nunca é menor anúncio: com 4 leilões (o mais barato a US$ 1,30) vale o buy_now de 2081", async () => {
  const a = await analise({ listings: { body: { data: fixture("listings-misto.json") } } });
  assert.equal(a.saidas.menorAnuncio?.venda, 10405);
});

// ---------- stickers ----------

test("item com 2 stickers compara só com vendas com sticker (n 5, mediana 2472) e avisa que ordens de sticker não são cobertas", async () => {
  const item = { ...ITEM, stickers: ["Sticker | A", "Sticker | B"] };
  const a = await analise({ buyOrders: { body: fixture("buy-orders-sticker-77-66.json") } }, item, { ...CONFIG, minVendas: 5 });
  // com sticker, float 0,28±0,07: 2472, 2250, 2645, 2712, 2468 → ordenado 2250 2468 2472 2645 2712
  assert.deepEqual(a.vendas, { status: "ok", n: 5, median: 2472, min: 2250, max: 2712 });
  assert.ok(kinds(a).includes("sticker_nao_coberto"));
});

test("ordem de Buy Order que exige sticker (US$ 90,00) nunca vira a saída: vale a maior sem sticker (2040)", async () => {
  const a = await analise({ buyOrders: { body: fixture("buy-orders-sticker-77-66.json") } });
  assert.equal(a.saidas.buyOrder?.venda, 10200);
  assert.equal(a.buyOrders?.deSticker, 3);
  assert.equal(a.buyOrders?.melhor?.price, 2040);
});

// ---------- âncora distante, sem float, bloqueio ----------

test("sem anúncio de float parecido (float 0,22; mais próximo 0,2802): usa a âncora e avisa a distância de ~0,06", async () => {
  const a = await analise({}, { ...ITEM, float: 0.22 });
  assert.equal(a.ancora?.listingId, "1046154856651425681");
  const aviso = a.avisos.find((x) => x.kind === "ancora_distante");
  assert.ok(aviso !== undefined && "distancia" in aviso && Math.abs(aviso.distancia - 0.06016576170921326) < 1e-9);
  assert.ok(a.buyOrders !== null);
});

test("sem float no card: só o menor anúncio é calculado (1 chamada), o resto fica 'dados insuficientes'", async () => {
  const m = montar();
  const a = unwrap(await m.analisar({ ...ITEM, float: null }, CONFIG));
  assert.equal(m.chamadas.length, 1);
  assert.equal(a.saidas.menorAnuncio?.venda, 10405);
  assert.equal(a.saidas.mercado, null);
  assert.equal(a.saidas.buyOrder, null);
  assert.equal(a.ancora, null);
  assert.equal(a.vendas, null);
  assert.equal(a.classificacao, "dados_insuficientes");
  assert.ok(kinds(a).includes("sem_float"));
});

test("bloqueio de troca de 4 dias vira aviso com os dias; item livre não avisa", async () => {
  const a = await analise({}, { ...ITEM, tradeLock: { dias: 4 } });
  const aviso = a.avisos.find((x) => x.kind === "bloqueio_troca");
  assert.ok(aviso !== undefined && "dias" in aviso && aviso.dias === 4);
  assert.equal(kinds(await analise()).includes("bloqueio_troca"), false);
});

// ---------- fontes que falham (análise parcial) ----------

test("vendas com erro 500: o erro é apontado, as outras saídas seguem e a classificação é 'dados insuficientes'", async () => {
  const a = await analise({ vendas: { status: 500 } });
  assert.deepEqual(a.erros.vendas, { kind: "http", status: 500 });
  assert.equal(a.saidas.mercado, null);
  assert.equal(a.saidas.menorAnuncio?.venda, 10405);
  assert.equal(a.saidas.buyOrder?.venda, 10200);
  assert.equal(a.vendas, null);
  assert.equal(a.classificacao, "dados_insuficientes");
});

test("Buy Orders com 429 e retry-after 30: o erro leva os 30 s e a classificação não depende dela", async () => {
  const a = await analise({ buyOrders: { status: 429, headers: { "retry-after": "30" } } });
  assert.deepEqual(a.erros.buyOrders, { kind: "limite", status: 429, retryAfterSeg: 30 });
  assert.equal(a.saidas.buyOrder, null);
  assert.equal(a.buyOrders, null);
  assert.equal(a.classificacao, "interessante");
});

test("listings com 401: erro de autenticação, sem âncora não há chamada de Buy Orders, vendas seguem", async () => {
  const m = montar({ listings: { status: 401 } });
  const a = unwrap(await m.analisar(ITEM, CONFIG));
  assert.deepEqual(a.erros.listings, { kind: "auth", status: 401 });
  assert.equal(m.chamadas.length, 2);
  assert.equal(a.ancora, null);
  assert.equal(a.saidas.menorAnuncio, null);
  assert.equal(a.saidas.buyOrder, null);
  assert.equal(a.saidas.mercado?.venda, 11705);
});

test("sem rede nas três fontes: devolve o resultado com os três erros, não lança", async () => {
  const lanca = { lanca: true };
  const a = await analise({ listings: lanca, vendas: lanca, buyOrders: lanca });
  assert.equal(a.erros.listings?.kind, "rede");
  assert.equal(a.erros.vendas?.kind, "rede");
  assert.equal(a.classificacao, "dados_insuficientes");
});

// ---------- configuração ----------

test("configuração incompleta: erro com os campos e nenhuma chamada de rede", async () => {
  const m = montar();
  const r = await m.analisar(ITEM, { ...CONFIG, cotacaoUsdBrl: undefined, taxaBp: undefined });
  assert.deepEqual(r, { ok: false, error: { kind: "config_invalida", campos: ["cotacaoUsdBrl", "taxaBp"] } });
  assert.equal(m.chamadas.length, 0);
});

test("a cotação multiplica todas as referências do CSFloat: com 6 o menor anúncio vira 2081×6 = 12486", async () => {
  const a = await analise({}, ITEM, { ...CONFIG, cotacaoUsdBrl: 6 });
  assert.equal(a.saidas.menorAnuncio?.venda, 12486);
});

test("custos fixos entram no lucro: R$ 1,50 a mais de custo tira 150 do lucro de 3471", async () => {
  const a = await analise({}, ITEM, { ...CONFIG, custosCents: 150 });
  assert.equal(a.saidas.mercado?.lucro, 3321);
});

// ---------- cache e duplicidade ----------

test("repetir a análise dentro da validade não chama a rede e mantém o horário dos dados", async () => {
  const m = montar();
  const primeira = unwrap(await m.analisar(ITEM, CONFIG));
  m.avancar(60_000);
  const segunda = unwrap(await m.analisar(ITEM, CONFIG));
  assert.equal(m.chamadas.length, 3);
  assert.equal(segunda.deCache, true);
  assert.equal(segunda.atualizadoEm, T0);
  assert.equal(primeira.atualizadoEm, T0);
  assert.deepEqual({ ...segunda, deCache: false }, primeira);
});

test("a validade é exclusiva: com 300 s, aos 299,999 s ainda é cache; aos 300 s refaz as 3 chamadas", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  m.avancar(299_999);
  unwrap(await m.analisar(ITEM, CONFIG));
  assert.equal(m.chamadas.length, 3);
  m.avancar(1);
  const c = unwrap(await m.analisar(ITEM, CONFIG));
  assert.equal(m.chamadas.length, 6);
  assert.equal(c.deCache, false);
  assert.equal(c.atualizadoEm, T0 + 300_000);
});

test("atualizar manualmente (forcar) ignora o cache válido", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  unwrap(await m.analisar(ITEM, CONFIG, { forcar: true }));
  assert.equal(m.chamadas.length, 6);
});

test("o cache guarda os dados do CSFloat, não a conclusão: outro preço e outra taxa recalculam sem rede", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  const b = unwrap(await m.analisar({ ...ITEM, priceCents: 9000 }, { ...CONFIG, taxaBp: 500 }));
  assert.equal(m.chamadas.length, 3);
  assert.equal(b.deCache, true);
  // venda 11705; taxa 5% = round(585,25) = 585; lucro = 11705−585−9000 = 2120
  assert.equal(b.saidas.mercado?.taxa, 585);
  assert.equal(b.saidas.mercado?.lucro, 2120);
});

test("float ou stickers diferentes não dividem o cache", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  unwrap(await m.analisar({ ...ITEM, float: 0.29 }, CONFIG));
  assert.equal(m.chamadas.length, 6);
  unwrap(await m.analisar({ ...ITEM, stickers: ["Sticker | A"] }, CONFIG));
  assert.equal(m.chamadas.length, 9);
});

test("a configuração é validada antes do cache: config quebrada não devolve resultado guardado", async () => {
  const m = montar();
  unwrap(await m.analisar(ITEM, CONFIG));
  const r = await m.analisar(ITEM, { ...CONFIG, taxaBp: undefined });
  assert.equal(r.ok, false);
});

test("análise com fonte falha não é guardada: o clique seguinte tenta de novo e vem completo", async () => {
  const falho = montar({ vendas: { status: 500 } });
  unwrap(await falho.analisar(ITEM, CONFIG));
  const outra = unwrap(await falho.analisar(ITEM, CONFIG));
  assert.equal(falho.chamadas.length, 6);
  assert.equal(outra.deCache, false);
});

test("dois cliques ao mesmo tempo no mesmo item fazem uma análise só (3 chamadas) e devolvem o mesmo resultado", async () => {
  const m = montar();
  const [a, b] = await Promise.all([m.analisar(ITEM, CONFIG), m.analisar(ITEM, CONFIG)]);
  assert.equal(m.chamadas.length, 3);
  assert.deepEqual(unwrap(a), unwrap(b));
});

// ---------- contrato com o leitor do DashSkins ----------

test("o resultado do leitor do card real (AK-47 Asiimov FN, 4 stickers) entra direto na análise", async () => {
  const card = unwrap(readCard(raizDoCard(htmlDashskins("card-ak47-asiimov-fn-stickers.html"))));
  const m = montar();
  const a = unwrap(await m.analisar(card, CONFIG));
  const l = new URL(m.chamadas.find((u) => u.includes("/listings?")) ?? "");
  assert.equal(l.searchParams.get("market_hash_name"), card.marketHashName);
  assert.equal(a.item.priceCents, card.priceCents);
  assert.ok(kinds(a).includes("sticker_nao_coberto"));
});
