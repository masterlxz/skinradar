import assert from "node:assert/strict";
import { test } from "node:test";
import type { Analise } from "../../src/analysis/analisar.ts";
import { findCards } from "../../src/adapters/dashskins/card.ts";
import { criarControlador } from "../../src/extension/card.ts";
import type { Pedido, Resposta } from "../../src/extension/mensagens.ts";
import { htmlDashskins, pagina } from "../helpers.ts";

const luvas = htmlDashskins("card-luvas-ft-bloqueado.html");
const ak = htmlDashskins("card-ak47-asiimov-fn-stickers.html");
const T0 = 1_000_000;
const TEXTO_BOTAO = "Analisar no SkinRadar";

const ANALISE: Analise = {
  item: { marketHashName: "AK-47 | Asiimov (Factory New)", priceCents: 139999, float: 0.0548621, stickers: [], tradeLock: "livre" },
  classificacao: "interessante",
  saidas: {
    mercado: { compra: 139999, venda: 200000, taxa: 4000, custos: 0, lucro: 56001, roiPct: 40.0 },
    menorAnuncio: null,
    buyOrder: null,
  },
  vendas: { status: "ok", n: 5, median: 40000, min: 30000, max: 50000 },
  ancora: null,
  buyOrders: null,
  avisos: [],
  erros: {},
  atualizadoEm: T0,
  deCache: false,
};
const OK: Resposta = { ok: true, analise: ANALISE };

/** `enviar` falso: cada chamada fica pendente até o teste liberar, para ver o que a tela mostra no meio. */
function montar(html = `${luvas}${ak}`, resposta: Resposta | "rejeitar" = OK) {
  const doc = pagina(`<div id="grade">${html}</div>`) as Document;
  const pedidos: Pedido[] = [];
  const liberar: (() => void)[] = [];
  const mostrados: Element[] = [];
  const controlador = criarControlador({
    doc,
    enviar: (p) => {
      pedidos.push(p);
      return new Promise<Resposta>((resolve, reject) => {
        liberar.push(() => (resposta === "rejeitar" ? reject(new Error("worker indisponível")) : resolve(resposta)));
      });
    },
    mostrar: (e) => {
      mostrados.push(e);
    },
    agora: () => T0,
  });
  const cards = findCards(doc);
  const botao = (card: Element) => card.querySelector("[data-skinradar] button");
  return { doc, controlador, pedidos, liberar, mostrados, cards, botao };
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const texto = (e: Element | null | undefined) => e?.textContent?.trim();

// ---------- botões nos cards ----------

test("preparar põe 1 botão 'Analisar no SkinRadar' em cada card e diz quantos pôs", () => {
  const { controlador, doc, cards, botao } = montar();
  assert.equal(controlador.preparar(doc.body), 2);
  assert.equal(cards.length, 2);
  for (const c of cards) assert.equal(texto(botao(c)), TEXTO_BOTAO);
});

test("preparar de novo (a página mudou) não duplica botões: devolve 0 e continua 1 por card", () => {
  const { controlador, doc, cards } = montar();
  controlador.preparar(doc.body);
  assert.equal(controlador.preparar(doc.body), 0);
  for (const c of cards) assert.equal(c.querySelectorAll("[data-skinradar]").length, 1);
});

test("card que aparece depois (rolagem) ganha botão, e o que já tinha não ganha outro", () => {
  const { controlador, doc, cards } = montar();
  // o observador da página passa só o trecho que mudou: primeiro o 1º card, depois a página toda
  assert.equal(controlador.preparar(cards[0]!), 1);
  assert.equal(controlador.preparar(doc.body), 1);
  assert.equal(doc.querySelectorAll("[data-skinradar]").length, 2);
});

test("página sem card: nenhum botão", () => {
  const { controlador, doc } = montar("<p>nada aqui</p>");
  assert.equal(controlador.preparar(doc.body), 0);
});

// ---------- pedido enviado ----------

test("a análise lê o card real e envia só os 5 campos do item, sem forçar, sem chave nenhuma", async () => {
  const { controlador, pedidos, liberar, cards } = montar();
  const card = cards[1]!;
  const p = controlador.analisar(card, false);
  assert.equal(pedidos.length, 1);
  assert.deepEqual(pedidos[0], {
    tipo: "analisar",
    forcar: false,
    item: {
      marketHashName: "AK-47 | Asiimov (Factory New)",
      priceCents: 139999,
      float: 0.0548621,
      stickers: [
        "Sticker | NiKo (Gold) | Paris 2023",
        "Sticker | G2 Esports (Gold) | Paris 2023",
        "Sticker | G2 Esports (Gold) | Paris 2023",
        "Sticker | G2 Esports (Gold) | Paris 2023",
      ],
      tradeLock: "livre",
    },
  });
  liberar[0]?.();
  await p;
});

test("clicar no botão do card dispara a análise daquele card", async () => {
  const { controlador, doc, pedidos, liberar, cards, botao } = montar();
  controlador.preparar(doc.body);
  (botao(cards[0]!) as HTMLElement).click();
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0]?.item.marketHashName, "★ Specialist Gloves | Tiger Strike (Field-Tested)");
  liberar[0]?.();
  await tick();
});

// ---------- durante e depois da análise ----------

test("durante a análise: painel 'Analisando…' à vista, botão desabilitado e com o texto 'Analisando…'", async () => {
  const { controlador, doc, mostrados, liberar, cards, botao } = montar();
  controlador.preparar(doc.body);
  const p = controlador.analisar(cards[1]!, false);
  assert.equal(mostrados.length, 1);
  assert.equal(mostrados[0]?.getAttribute("data-estado"), "carregando");
  assert.equal(botao(cards[1]!)?.hasAttribute("disabled"), true);
  assert.equal(texto(botao(cards[1]!)), "Analisando…");
  liberar[0]?.();
  await p;
});

test("depois da análise: o painel da análise substitui o 'Analisando…' e o botão volta ao normal", async () => {
  const { controlador, doc, mostrados, liberar, cards, botao } = montar();
  controlador.preparar(doc.body);
  const p = controlador.analisar(cards[1]!, false);
  liberar[0]?.();
  await p;
  assert.equal(mostrados.length, 2);
  assert.equal(mostrados[1]?.getAttribute("data-classificacao"), "interessante");
  assert.equal(botao(cards[1]!)?.hasAttribute("disabled"), false);
  assert.equal(texto(botao(cards[1]!)), TEXTO_BOTAO);
});

test("clique repetido no mesmo card durante a análise não faz um segundo pedido (PRD 4.3)", async () => {
  const { controlador, pedidos, liberar, cards } = montar();
  const a = controlador.analisar(cards[1]!, false);
  const b = controlador.analisar(cards[1]!, false);
  assert.equal(pedidos.length, 1);
  liberar[0]?.();
  await Promise.all([a, b]);
  assert.equal(pedidos.length, 1);
});

test("terminada a análise, o mesmo card pode ser analisado de novo", async () => {
  const { controlador, pedidos, liberar, cards } = montar();
  const a = controlador.analisar(cards[1]!, false);
  liberar[0]?.();
  await a;
  const b = controlador.analisar(cards[1]!, false);
  assert.equal(pedidos.length, 2);
  liberar[1]?.();
  await b;
});

test("cards diferentes são independentes: análise em andamento num não trava o outro", async () => {
  const { controlador, doc, pedidos, liberar, cards, botao } = montar();
  controlador.preparar(doc.body);
  const a = controlador.analisar(cards[0]!, false);
  const b = controlador.analisar(cards[1]!, false);
  assert.equal(pedidos.length, 2);
  assert.equal(botao(cards[0]!)?.hasAttribute("disabled"), true);
  assert.equal(botao(cards[1]!)?.hasAttribute("disabled"), true);
  liberar[0]?.();
  liberar[1]?.();
  await Promise.all([a, b]);
});

test("o botão 'Atualizar' do painel refaz a análise do mesmo card com forcar verdadeiro", async () => {
  const { controlador, pedidos, liberar, mostrados, cards } = montar();
  const a = controlador.analisar(cards[1]!, false);
  liberar[0]?.();
  await a;
  const painel = mostrados.at(-1);
  (painel?.querySelector('button[data-acao="atualizar"]') as HTMLElement).click();
  assert.equal(pedidos.length, 2);
  assert.equal(pedidos[1]?.forcar, true);
  assert.equal(pedidos[1]?.item.marketHashName, "AK-47 | Asiimov (Factory New)");
  liberar[1]?.();
  await tick();
});

// ---------- erros ----------

test("resposta de erro do service worker vira o texto do estado, e o botão volta ao normal", async () => {
  const resposta: Resposta = { ok: false, erro: { kind: "sem_chave" } };
  const { controlador, doc, mostrados, liberar, cards, botao } = montar(`${luvas}${ak}`, resposta);
  controlador.preparar(doc.body);
  const p = controlador.analisar(cards[1]!, false);
  liberar[0]?.();
  await p;
  assert.equal(mostrados.at(-1)?.getAttribute("data-estado"), "erro");
  assert.equal(texto(mostrados.at(-1)), "Chave da API do CSFloat não configurada: abra as opções da extensão.");
  assert.equal(botao(cards[1]!)?.hasAttribute("disabled"), false);
});

test("service worker que não responde (envio rejeitado): 'Erro interno', sem travar o botão", async () => {
  const { controlador, doc, mostrados, liberar, cards, botao } = montar(`${luvas}${ak}`, "rejeitar");
  controlador.preparar(doc.body);
  const p = controlador.analisar(cards[1]!, false);
  liberar[0]?.();
  await p;
  assert.equal(texto(mostrados.at(-1)), "Erro interno ao analisar. Tente de novo.");
  assert.equal(botao(cards[1]!)?.hasAttribute("disabled"), false);
});

test("card ilegível (preço no formato brasileiro): explica o motivo, não envia nada e não desabilita o botão", async () => {
  const quebrado = ak.replace("R$1,399.99", "R$ 1.399,99");
  assert.notEqual(quebrado, ak, "a troca não encontrou o preço na fixture");
  const { controlador, doc, pedidos, mostrados, cards, botao } = montar(quebrado);
  controlador.preparar(doc.body);
  await controlador.analisar(cards[0]!, false);
  assert.equal(pedidos.length, 0);
  assert.equal(texto(mostrados.at(-1)), "Não consegui ler este card: o preço está em formato inesperado.");
  assert.equal(botao(cards[0]!)?.hasAttribute("disabled"), false);
});
