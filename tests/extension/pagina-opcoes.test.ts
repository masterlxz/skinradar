import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import type { Area } from "../../src/extension/armazenamento.ts";
import { carregarOpcoes, salvarOpcoes } from "../../src/extension/pagina-opcoes.ts";

const SEGREDO = "CHAVE-SECRETA-123";
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
/** O que o dono digita para gerar CONFIG (valores de teste, não recomendações). */
const DIGITADO: Record<string, string> = {
  chave: SEGREDO,
  cotacaoUsdBrl: "5,65",
  taxaPct: "2,5",
  custosReais: "1,50",
  roiMinPct: "15",
  janelaFloat: "0,05",
  minVendas: "5",
  pisoBuyOrderUsd: "10,00",
  validadeMin: "5",
};

/** A página de verdade (`extension/opcoes.html`), não uma imitação. */
function abrir(): Document {
  const html = readFileSync(new URL("../../extension/opcoes.html", import.meta.url), "utf8");
  return parseHTML(html).document as unknown as Document;
}

const campo = (doc: Document, id: string) => doc.getElementById(id) as HTMLInputElement;
const texto = (doc: Document, id: string) => doc.getElementById(id)?.textContent?.trim();

function preencher(doc: Document, valores: Record<string, string>) {
  for (const [id, v] of Object.entries(valores)) campo(doc, id).value = v;
}

function areaFalsa(inicial: Record<string, unknown> = {}, falhaAoGravar = false) {
  const guardado = new Map<string, unknown>(Object.entries(inicial));
  const area: Area = {
    async get(chaves) {
      const lista = typeof chaves === "string" ? [chaves] : chaves;
      const saida: Record<string, unknown> = {};
      for (const c of lista) if (guardado.has(c)) saida[c] = structuredClone(guardado.get(c));
      return saida;
    },
    async set(itens) {
      if (falhaAoGravar) throw new Error(`storage cheio com ${SEGREDO}`);
      for (const [c, v] of Object.entries(itens)) guardado.set(c, structuredClone(v));
    },
    async remove(chaves) {
      for (const c of typeof chaves === "string" ? [chaves] : chaves) guardado.delete(c);
    },
  };
  return { guardado, area };
}

// ---------- abrir a página ----------

test("abrir com opções salvas: cada campo aparece na unidade do dono, e a chave só como aviso", async () => {
  const doc = abrir();
  const { area } = areaFalsa({ "skinradar.chave": SEGREDO, "skinradar.config": CONFIG });
  await carregarOpcoes(doc, area);
  for (const [id, v] of Object.entries(DIGITADO)) {
    if (id !== "chave") assert.equal(campo(doc, id).value, v, id);
  }
  assert.equal(campo(doc, "chave").value, "");
  assert.equal(texto(doc, "estado-chave"), "Chave salva.");
});

test("abrir sem nada salvo: campos vazios e 'Nenhuma chave salva.'", async () => {
  const doc = abrir();
  await carregarOpcoes(doc, areaFalsa().area);
  for (const id of Object.keys(DIGITADO)) assert.equal(campo(doc, id).value, "", id);
  assert.equal(texto(doc, "estado-chave"), "Nenhuma chave salva.");
});

test("abrir com configuração incompleta ou estragada: não preenche lixo, deixa em branco", async () => {
  for (const config of [{ taxaBp: 250 }, "texto", null, { ...CONFIG, taxaBp: 99999 }]) {
    const doc = abrir();
    await carregarOpcoes(doc, areaFalsa({ "skinradar.config": config }).area);
    assert.equal(campo(doc, "taxaPct").value, "", JSON.stringify(config));
    assert.equal(campo(doc, "cotacaoUsdBrl").value, "", JSON.stringify(config));
  }
});

test("a chave nunca aparece na página, nem no HTML", async () => {
  const doc = abrir();
  await carregarOpcoes(doc, areaFalsa({ "skinradar.chave": SEGREDO, "skinradar.config": CONFIG }).area);
  assert.equal(doc.documentElement.outerHTML.includes(SEGREDO), false);
});

// ---------- salvar ----------

test("salvar formulário completo: grava a chave e a configuração nas unidades certas e avisa 'Salvo.'", async () => {
  const doc = abrir();
  const { guardado, area } = areaFalsa();
  preencher(doc, DIGITADO);
  await salvarOpcoes(doc, area);
  assert.equal(guardado.get("skinradar.chave"), SEGREDO);
  assert.deepEqual(guardado.get("skinradar.config"), CONFIG);
  assert.equal(texto(doc, "estado"), "Salvo.");
  assert.equal(texto(doc, "estado-chave"), "Chave salva.");
});

test("depois de salvar, o campo da chave é limpo (ela sai da página)", async () => {
  const doc = abrir();
  preencher(doc, DIGITADO);
  await salvarOpcoes(doc, areaFalsa().area);
  assert.equal(campo(doc, "chave").value, "");
  assert.equal(doc.documentElement.outerHTML.includes(SEGREDO), false);
});

test("chave em branco com chave já salva: a chave guardada continua, a configuração muda", async () => {
  const doc = abrir();
  const { guardado, area } = areaFalsa({ "skinradar.chave": "VELHA", "skinradar.config": CONFIG });
  preencher(doc, { ...DIGITADO, chave: "", taxaPct: "3" });
  await salvarOpcoes(doc, area);
  assert.equal(guardado.get("skinradar.chave"), "VELHA");
  assert.equal((guardado.get("skinradar.config") as { taxaBp: number }).taxaBp, 300);
  assert.equal(texto(doc, "estado"), "Salvo.");
});

test("sem chave salva e sem chave digitada: não grava nada e aponta a chave", async () => {
  const doc = abrir();
  const { guardado, area } = areaFalsa();
  preencher(doc, { ...DIGITADO, chave: "" });
  await salvarOpcoes(doc, area);
  assert.equal(guardado.size, 0);
  assert.equal(texto(doc, "estado"), "Corrija os campos: chave da API.");
  assert.equal(campo(doc, "chave").getAttribute("aria-invalid"), "true");
});

test("campos inválidos: nada é gravado, os inválidos são marcados e nomeados na ordem da página", async () => {
  const doc = abrir();
  const { guardado, area } = areaFalsa();
  preencher(doc, { ...DIGITADO, cotacaoUsdBrl: "abc", pisoBuyOrderUsd: "10,005" });
  await salvarOpcoes(doc, area);
  assert.equal(guardado.size, 0);
  assert.equal(texto(doc, "estado"), "Corrija os campos: cotação USD→BRL, piso de Buy Order (US$).");
  assert.equal(campo(doc, "cotacaoUsdBrl").getAttribute("aria-invalid"), "true");
  assert.equal(campo(doc, "pisoBuyOrderUsd").getAttribute("aria-invalid"), "true");
  assert.equal(campo(doc, "taxaPct").hasAttribute("aria-invalid"), false);
});

test("corrigir e salvar de novo tira as marcas de erro", async () => {
  const doc = abrir();
  const { area } = areaFalsa();
  preencher(doc, { ...DIGITADO, cotacaoUsdBrl: "abc" });
  await salvarOpcoes(doc, area);
  preencher(doc, { cotacaoUsdBrl: "5,65", chave: SEGREDO });
  await salvarOpcoes(doc, area);
  assert.equal(campo(doc, "cotacaoUsdBrl").hasAttribute("aria-invalid"), false);
  assert.equal(texto(doc, "estado"), "Salvo.");
});

test("armazenamento que falha ao gravar: mensagem genérica, sem o detalhe do erro (que trazia a chave)", async () => {
  const doc = abrir();
  preencher(doc, DIGITADO);
  await salvarOpcoes(doc, areaFalsa({}, true).area);
  assert.equal(texto(doc, "estado"), "Não foi possível salvar.");
  assert.equal(texto(doc, "estado-chave")?.includes(SEGREDO), false);
});
