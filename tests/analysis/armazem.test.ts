import assert from "node:assert/strict";
import { test } from "node:test";
import { criarAnalisador, type ItemParaAnalise } from "../../src/analysis/analisar.ts";
import type { Armazem } from "../../src/analysis/cache.ts";
import { createClient, type FetchLike } from "../../src/csfloat/client.ts";
import { fixture, unwrap } from "../helpers.ts";

const NAME = "AK-47 | Redline (Field-Tested)";
const CHAVE = `v1|${NAME}|f=0.280|s=[]`;
const T0 = 1_000_000;
/** Valores de teste, os mesmos de analisar.test.ts. */
const CONFIG = {
  cotacaoUsdBrl: 5,
  taxaBp: 200,
  janelaFloat: 0.07,
  minVendas: 2,
  pisoBuyOrderCents: 1000,
  validadeCacheSeg: 300,
};
const ITEM: ItemParaAnalise = { marketHashName: NAME, priceCents: 8000, float: 0.28, stickers: [], tradeLock: "livre" };

/** Armazém falso que guarda JSON, como o `chrome.storage` (ida e volta pela serialização). */
function armazemFalso(inicial: Record<string, string> = {}) {
  const guardado = new Map(Object.entries(inicial));
  const uso = { ler: 0, gravar: 0, apagar: 0 };
  const porta: Armazem = {
    async ler(chave) {
      uso.ler++;
      await Promise.resolve();
      const s = guardado.get(chave);
      return s === undefined ? undefined : (JSON.parse(s) as { valor: unknown; em: number });
    },
    async gravar(chave, entrada) {
      uso.gravar++;
      guardado.set(chave, JSON.stringify(entrada));
    },
    async apagar(chave) {
      uso.apagar++;
      guardado.delete(chave);
    },
  };
  return { guardado, uso, porta };
}

function rede(vendasStatus = 200) {
  const chamadas: string[] = [];
  const f: FetchLike = async (url) => {
    chamadas.push(url);
    const corpo = url.includes("/buy-orders")
      ? fixture("buy-orders-alto.json")
      : url.includes("/history/")
        ? fixture("vendas.json")
        : { data: fixture("listings-buy-now.json") };
    const status = url.includes("/history/") ? vendasStatus : 200;
    return new Response(JSON.stringify(corpo), { status });
  };
  return { f, chamadas };
}

/** Cada chamada cria um analisador novo: é o service worker que acordou, com a memória vazia. */
function acordar(porta: Armazem | undefined, relogio: { t: number }, vendasStatus = 200) {
  const { f, chamadas } = rede(vendasStatus);
  const analisar = criarAnalisador({
    client: createClient({ apiKey: "chave-de-teste", fetch: f }),
    agora: () => relogio.t,
    ...(porta === undefined ? {} : { armazem: porta }),
  });
  return { analisar, chamadas };
}

test("a primeira análise grava os dados no armazém com a chave versionada e o horário da busca", async () => {
  const { guardado, porta } = armazemFalso();
  const w = acordar(porta, { t: T0 });
  unwrap(await w.analisar(ITEM, CONFIG));
  assert.deepEqual([...guardado.keys()], [CHAVE]);
  assert.equal((JSON.parse(guardado.get(CHAVE) ?? "{}") as { em: number }).em, T0);
});

test("o worker que acordou com a memória vazia lê do armazém: 0 chamadas, 'de cache', mesmos números", async () => {
  const { porta } = armazemFalso();
  const relogio = { t: T0 };
  const primeira = unwrap(await acordar(porta, relogio).analisar(ITEM, CONFIG));
  relogio.t += 120_000;
  const w = acordar(porta, relogio);
  const segunda = unwrap(await w.analisar(ITEM, CONFIG));
  assert.equal(w.chamadas.length, 0);
  assert.equal(segunda.deCache, true);
  assert.equal(segunda.atualizadoEm, T0);
  assert.deepEqual({ ...segunda, deCache: false }, primeira);
});

test("entrada do armazém com idade igual à validade (300 s) está vencida: refaz as 3 chamadas e regrava", async () => {
  const { guardado, porta } = armazemFalso();
  const relogio = { t: T0 };
  unwrap(await acordar(porta, relogio).analisar(ITEM, CONFIG));
  relogio.t += 300_000;
  const w = acordar(porta, relogio);
  const r = unwrap(await w.analisar(ITEM, CONFIG));
  assert.equal(w.chamadas.length, 3);
  assert.equal(r.deCache, false);
  assert.equal((JSON.parse(guardado.get(CHAVE) ?? "{}") as { em: number }).em, T0 + 300_000);
});

test("entrada de outra versão do formato ('v0|') é ignorada, mesmo dentro da validade", async () => {
  const atual = armazemFalso();
  const relogio = { t: T0 };
  unwrap(await acordar(atual.porta, relogio).analisar(ITEM, CONFIG));
  const velho = armazemFalso({ [CHAVE.replace("v1|", "v0|")]: atual.guardado.get(CHAVE) ?? "" });
  const w = acordar(velho.porta, relogio);
  unwrap(await w.analisar(ITEM, CONFIG));
  assert.equal(w.chamadas.length, 3);
});

test("análise com fonte falha não grava; e uma atualização forçada que falha apaga a entrada velha", async () => {
  const { guardado, uso, porta } = armazemFalso();
  const relogio = { t: T0 };
  unwrap(await acordar(porta, relogio, 500).analisar(ITEM, CONFIG));
  assert.equal(guardado.size, 0);
  assert.equal(uso.gravar, 0);

  unwrap(await acordar(porta, relogio).analisar(ITEM, CONFIG));
  assert.equal(guardado.size, 1);

  unwrap(await acordar(porta, relogio, 500).analisar(ITEM, CONFIG, { forcar: true }));
  assert.equal(guardado.size, 0);
  assert.equal(uso.apagar, 1);
});

test("armazém que falha ao ler e ao gravar não derruba a análise: ela segue pela rede", async () => {
  const porta: Armazem = {
    async ler() {
      throw new Error("storage indisponível");
    },
    async gravar() {
      throw new Error("storage cheio");
    },
    async apagar() {
      throw new Error("storage indisponível");
    },
  };
  const w = acordar(porta, { t: T0 });
  const r = unwrap(await w.analisar(ITEM, CONFIG));
  assert.equal(w.chamadas.length, 3);
  assert.deepEqual(r.erros, {});
  assert.equal(r.saidas.mercado?.venda, 11705);
});

test("dois cliques ao mesmo tempo leem o armazém uma vez só (a busca é registrada antes do await)", async () => {
  const { uso, porta } = armazemFalso();
  const relogio = { t: T0 };
  unwrap(await acordar(porta, relogio).analisar(ITEM, CONFIG));
  const lidasAntes = uso.ler;
  const w = acordar(porta, relogio);
  const [a, b] = await Promise.all([w.analisar(ITEM, CONFIG), w.analisar(ITEM, CONFIG)]);
  assert.equal(uso.ler - lidasAntes, 1);
  assert.equal(w.chamadas.length, 0);
  assert.deepEqual(unwrap(a), unwrap(b));
});

test("depois de um acerto no armazém, o clique seguinte usa a memória e não lê o armazém de novo", async () => {
  const { uso, porta } = armazemFalso();
  const relogio = { t: T0 };
  unwrap(await acordar(porta, relogio).analisar(ITEM, CONFIG));
  const w = acordar(porta, relogio);
  unwrap(await w.analisar(ITEM, CONFIG));
  const lidas = uso.ler;
  unwrap(await w.analisar(ITEM, CONFIG));
  assert.equal(uso.ler, lidas);
});

const CORROMPIDOS: [string, string][] = [
  ["texto que não é JSON", "{isto não é json"],
  ["valor vazio", JSON.stringify({ valor: {}, em: T0 })],
  [
    "listings com 'ok' que não é booleano",
    JSON.stringify({ valor: { listings: { ok: "sim" }, vendas: null, buyOrders: null }, em: T0 }),
  ],
  [
    "vendas com 'ok' que não é booleano",
    JSON.stringify({ valor: { listings: { ok: true, value: [] }, vendas: { ok: "sim" }, buyOrders: null }, em: T0 }),
  ],
  [
    "buyOrders ausente em vez de nulo",
    JSON.stringify({ valor: { listings: { ok: true, value: [] }, vendas: null }, em: T0 }),
  ],
  ["sem o horário", JSON.stringify({ valor: { listings: { ok: true, value: [] } } })],
  ["horário em texto", JSON.stringify({ valor: { listings: { ok: true, value: [] } }, em: "ontem" })],
  ["nulo", "null"],
];

for (const [nome, bruto] of CORROMPIDOS) {
  test(`entrada corrompida no armazém vira falha de cache, não erro: ${nome}`, async () => {
    const { guardado, porta } = armazemFalso({ [CHAVE]: bruto });
    const w = acordar(porta, { t: T0 });
    const r = unwrap(await w.analisar(ITEM, CONFIG));
    assert.equal(w.chamadas.length, 3);
    assert.equal(r.deCache, false);
    assert.equal(r.saidas.mercado?.venda, 11705);
    assert.notEqual(guardado.get(CHAVE), bruto);
  });
}
