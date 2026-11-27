import assert from "node:assert/strict";
import { test } from "node:test";
import { armazemDeSessao, gravarOpcoes, lerOpcoes, type Area } from "../../src/extension/armazenamento.ts";

/** Área falsa que guarda cópias (como o `chrome.storage`: tudo passa por serialização). */
function areaFalsa(inicial: Record<string, unknown> = {}) {
  const guardado = new Map<string, unknown>(Object.entries(inicial));
  const gravacoes: string[][] = [];
  const area: Area = {
    async get(chaves) {
      const lista = typeof chaves === "string" ? [chaves] : chaves;
      const saida: Record<string, unknown> = {};
      for (const c of lista) if (guardado.has(c)) saida[c] = structuredClone(guardado.get(c));
      return saida;
    },
    async set(itens) {
      gravacoes.push(Object.keys(itens));
      for (const [c, v] of Object.entries(itens)) guardado.set(c, structuredClone(v));
    },
    async remove(chaves) {
      for (const c of typeof chaves === "string" ? [chaves] : chaves) guardado.delete(c);
    },
  };
  return { guardado, gravacoes, area };
}

const CHAVE_CACHE = "skinradar.cache|v1|AK-47 | Redline (Field-Tested)|f=0.280|s=[]";
const ENTRADA = { valor: { listings: { ok: true, value: [] }, vendas: null, buyOrders: null }, em: 1_000_000 };

// ---------- cache em chrome.storage.session ----------

test("armazém de sessão: grava sob 'skinradar.cache|<chave>' e lê de volta a mesma entrada", async () => {
  const { guardado, area } = areaFalsa();
  const armazem = armazemDeSessao(area);
  await armazem.gravar("v1|AK-47 | Redline (Field-Tested)|f=0.280|s=[]", ENTRADA);
  assert.deepEqual([...guardado.keys()], [CHAVE_CACHE]);
  assert.deepEqual(await armazem.ler("v1|AK-47 | Redline (Field-Tested)|f=0.280|s=[]"), ENTRADA);
});

test("armazém de sessão: chave ausente lê como indefinida; apagar remove só aquela chave", async () => {
  const { guardado, area } = areaFalsa({ [CHAVE_CACHE]: ENTRADA, "skinradar.cache|outra": ENTRADA });
  const armazem = armazemDeSessao(area);
  assert.equal(await armazem.ler("v1|nao-existe"), undefined);
  await armazem.apagar("v1|AK-47 | Redline (Field-Tested)|f=0.280|s=[]");
  assert.deepEqual([...guardado.keys()], ["skinradar.cache|outra"]);
});

const MALFORMADOS: [string, unknown][] = [
  ["texto", "isto não é uma entrada"],
  ["nulo", null],
  ["sem o horário", { valor: {} }],
  ["horário em texto", { valor: {}, em: "ontem" }],
  ["horário infinito", { valor: {}, em: Number.POSITIVE_INFINITY }],
  ["sem o valor", { em: 1_000_000 }],
];

for (const [nome, bruto] of MALFORMADOS) {
  test(`armazém de sessão: entrada malformada lê como indefinida: ${nome}`, async () => {
    const { area } = areaFalsa({ [CHAVE_CACHE]: bruto });
    const lido = await armazemDeSessao(area).ler("v1|AK-47 | Redline (Field-Tested)|f=0.280|s=[]");
    assert.equal(lido, undefined);
  });
}

// ---------- opções em chrome.storage.local ----------

test("opções: nada gravado dá chave nula e config indefinida", async () => {
  const { area } = areaFalsa();
  assert.deepEqual(await lerOpcoes(area), { chave: null, config: undefined });
});

test("opções: lê a chave aparada e a configuração como estão guardadas", async () => {
  const config = { cotacaoUsdBrl: 5.65, taxaBp: 200 };
  const { area } = areaFalsa({ "skinradar.chave": "  abc123  ", "skinradar.config": config });
  assert.deepEqual(await lerOpcoes(area), { chave: "abc123", config });
});

test("opções: chave em branco ou que não é texto vira nula", async () => {
  for (const ruim of ["", "   ", 123, null, { x: 1 }]) {
    const { area } = areaFalsa({ "skinradar.chave": ruim });
    assert.equal((await lerOpcoes(area)).chave, null, JSON.stringify(ruim));
  }
});

test("opções: grava chave aparada e configuração", async () => {
  const { guardado, area } = areaFalsa();
  await gravarOpcoes(area, { chave: "  nova-chave  ", config: { taxaBp: 250 } });
  assert.equal(guardado.get("skinradar.chave"), "nova-chave");
  assert.deepEqual(guardado.get("skinradar.config"), { taxaBp: 250 });
});

test("opções: sem chave informada (ou em branco) a chave guardada não é tocada", async () => {
  const { guardado, gravacoes, area } = areaFalsa({ "skinradar.chave": "velha" });
  await gravarOpcoes(area, { config: { taxaBp: 100 } });
  await gravarOpcoes(area, { chave: "   ", config: { taxaBp: 300 } });
  assert.equal(guardado.get("skinradar.chave"), "velha");
  assert.deepEqual(guardado.get("skinradar.config"), { taxaBp: 300 });
  assert.equal(gravacoes.flat().includes("skinradar.chave"), false);
});
