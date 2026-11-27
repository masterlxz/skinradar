import assert from "node:assert/strict";
import { test } from "node:test";
import type { Armazem } from "../../src/analysis/cache.ts";
import type { FetchLike } from "../../src/csfloat/client.ts";
import type { Opcoes } from "../../src/extension/armazenamento.ts";
import { criarServico } from "../../src/extension/servico.ts";
import { fixture } from "../helpers.ts";

const NAME = "AK-47 | Redline (Field-Tested)";
const CHAVE = "CHAVE-SECRETA-123";
/** Valores de teste, os mesmos de analisar.test.ts (cotação 5, taxa 2%, janela 0,07, mínimo 2 vendas). */
const CONFIG = {
  cotacaoUsdBrl: 5,
  taxaBp: 200,
  janelaFloat: 0.07,
  minVendas: 2,
  pisoBuyOrderCents: 1000,
  validadeCacheSeg: 300,
};
const ITEM = { marketHashName: NAME, priceCents: 8000, float: 0.28, stickers: [], tradeLock: "livre" };
const PEDIDO = { tipo: "analisar", item: ITEM, forcar: false };

function armazemFalso(): Armazem {
  const m = new Map<string, string>();
  return {
    async ler(c) {
      const s = m.get(c);
      return s === undefined ? undefined : (JSON.parse(s) as { valor: unknown; em: number });
    },
    async gravar(c, e) {
      m.set(c, JSON.stringify(e));
    },
    async apagar(c) {
      m.delete(c);
    },
  };
}

function rede(foraDoAr = false) {
  const chamadas: { url: string; chave: string | undefined }[] = [];
  const f: FetchLike = async (url, init) => {
    chamadas.push({ url, chave: init.headers["Authorization"] });
    if (foraDoAr) throw new Error("sem rede");
    const corpo = url.includes("/buy-orders")
      ? fixture("buy-orders-alto.json")
      : url.includes("/history/")
        ? fixture("vendas.json")
        : { data: fixture("listings-buy-now.json") };
    return new Response(JSON.stringify(corpo), { status: 200 });
  };
  return { f, chamadas };
}

function montar(opcoes: () => Promise<Opcoes>, extra: { foraDoAr?: boolean; armazem?: Armazem } = {}) {
  const { f, chamadas } = rede(extra.foraDoAr === true);
  const servico = criarServico({
    opcoes,
    fetch: f,
    armazem: extra.armazem ?? armazemFalso(),
    agora: () => 1_000_000,
  });
  return { servico, chamadas };
}

const opcoesOk = (): Promise<Opcoes> => Promise.resolve({ chave: CHAVE, config: CONFIG });

// ---------- caminho feliz ----------

test("pedido válido com chave e configuração: devolve a análise (mercado R$ 117,05, 'interessante')", async () => {
  const { servico } = montar(opcoesOk);
  const r = await servico.tratar(PEDIDO);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.analise.classificacao, "interessante");
  assert.equal(r.analise.saidas.mercado?.venda, 11705);
});

test("a chave vai no Authorization das 3 chamadas ao CSFloat e em nenhum outro lugar da resposta", async () => {
  const { servico, chamadas } = montar(opcoesOk);
  const r = await servico.tratar(PEDIDO);
  assert.equal(chamadas.length, 3);
  assert.deepEqual(new Set(chamadas.map((c) => c.chave)), new Set([CHAVE]));
  assert.equal(JSON.stringify(r).includes(CHAVE), false);
});

test("a resposta sobrevive à serialização JSON do Chrome sem perder nada", async () => {
  const { servico } = montar(opcoesOk);
  const r = await servico.tratar(PEDIDO);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
});

// ---------- pedido, chave e configuração ----------

test("mensagem inválida vira erro interno e nenhuma chamada de rede", async () => {
  const ruins = [null, "analisar", { tipo: "apagar" }, { ...PEDIDO, item: { ...ITEM, priceCents: 0 } }];
  for (const ruim of ruins) {
    const { servico, chamadas } = montar(opcoesOk);
    assert.deepEqual(await servico.tratar(ruim), { ok: false, erro: { kind: "interno" } }, JSON.stringify(ruim));
    assert.equal(chamadas.length, 0);
  }
});

test("sem chave salva (ou em branco): erro 'sem_chave' e nenhuma chamada", async () => {
  const { servico, chamadas } = montar(() => Promise.resolve({ chave: null, config: CONFIG }));
  assert.deepEqual(await servico.tratar(PEDIDO), { ok: false, erro: { kind: "sem_chave" } });
  assert.equal(chamadas.length, 0);
});

test("configuração incompleta: erro 'config_invalida' com os campos e nenhuma chamada", async () => {
  const { servico, chamadas } = montar(() => Promise.resolve({ chave: CHAVE, config: {} }));
  assert.deepEqual(await servico.tratar(PEDIDO), {
    ok: false,
    erro: {
      kind: "config_invalida",
      campos: ["cotacaoUsdBrl", "taxaBp", "janelaFloat", "pisoBuyOrderCents", "validadeCacheSeg"],
    },
  });
  assert.equal(chamadas.length, 0);
});

test("sem chave e sem configuração ao mesmo tempo: a chave vem primeiro", async () => {
  const { servico } = montar(() => Promise.resolve({ chave: null, config: undefined }));
  assert.deepEqual(await servico.tratar(PEDIDO), { ok: false, erro: { kind: "sem_chave" } });
});

test("falha ao ler as opções vira erro interno e a mensagem do erro (com a chave dentro) não vaza", async () => {
  const { servico } = montar(() => Promise.reject(new Error(`storage morreu: ${CHAVE}`)));
  const r = await servico.tratar(PEDIDO);
  assert.deepEqual(r, { ok: false, erro: { kind: "interno" } });
  assert.equal(JSON.stringify(r).includes(CHAVE), false);
});

test("CSFloat fora do ar não é erro interno: a análise volta com os erros de rede por fonte", async () => {
  const { servico } = montar(opcoesOk, { foraDoAr: true });
  const r = await servico.tratar(PEDIDO);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.analise.erros.listings?.kind, "rede");
  assert.equal(r.analise.classificacao, "dados_insuficientes");
});

// ---------- opções lidas a cada pedido, cache, chave trocada ----------

test("as opções são lidas a cada pedido: mudar a taxa vale no clique seguinte, sem refazer as chamadas", async () => {
  let config: unknown = CONFIG;
  const { servico, chamadas } = montar(() => Promise.resolve({ chave: CHAVE, config }));
  const a = await servico.tratar(PEDIDO);
  config = { ...CONFIG, taxaBp: 500 };
  const b = await servico.tratar(PEDIDO);
  assert.equal(chamadas.length, 3);
  // venda 11705; taxa 5% = round(585,25) = 585; lucro = 11705 − 585 − 8000 = 3120
  assert.equal(a.ok && a.analise.saidas.mercado?.lucro, 3471);
  assert.equal(b.ok && b.analise.saidas.mercado?.taxa, 585);
  assert.equal(b.ok && b.analise.saidas.mercado?.lucro, 3120);
});

test("'forcar' no pedido refaz as 3 chamadas", async () => {
  const { servico, chamadas } = montar(opcoesOk);
  await servico.tratar(PEDIDO);
  await servico.tratar({ ...PEDIDO, forcar: true });
  assert.equal(chamadas.length, 6);
});

test("o worker que dormiu (serviço novo, memória vazia) acha o cache no armazém de sessão", async () => {
  const armazem = armazemFalso();
  await montar(opcoesOk, { armazem }).servico.tratar(PEDIDO);
  const depois = montar(opcoesOk, { armazem });
  const r = await depois.servico.tratar(PEDIDO);
  assert.equal(depois.chamadas.length, 0);
  assert.equal(r.ok && r.analise.deCache, true);
});

test("trocar a chave nas opções vale no pedido seguinte: as chamadas novas levam a chave nova", async () => {
  let chave = CHAVE;
  const { servico, chamadas } = montar(() => Promise.resolve({ chave, config: CONFIG }));
  await servico.tratar(PEDIDO);
  chave = "OUTRA-CHAVE-456";
  await servico.tratar({ ...PEDIDO, forcar: true });
  assert.deepEqual(chamadas.slice(0, 3).map((c) => c.chave), [CHAVE, CHAVE, CHAVE]);
  assert.deepEqual(chamadas.slice(3).map((c) => c.chave), Array(3).fill("OUTRA-CHAVE-456"));
});

test("dois pedidos ao mesmo tempo para o mesmo item fazem 3 chamadas só", async () => {
  const { servico, chamadas } = montar(opcoesOk);
  const [a, b] = await Promise.all([servico.tratar(PEDIDO), servico.tratar(PEDIDO)]);
  assert.equal(chamadas.length, 3);
  assert.deepEqual(a, b);
});
