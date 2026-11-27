import assert from "node:assert/strict";
import { test } from "node:test";
import { montarOverlay } from "../../src/extension/overlay.ts";
import { pagina } from "../helpers.ts";

const CSS = ".sr-painel { color: red; }";

function montar() {
  const doc = pagina("<div id='raiz'></div>") as Document;
  const raiz = doc.getElementById("raiz") as HTMLElement;
  const overlay = montarOverlay(doc, raiz, CSS);
  const corpo = () => raiz.querySelector("[data-sr-corpo]");
  const contenedor = () => raiz.querySelector("[data-sr-overlay]");
  return { doc, raiz, overlay, corpo, contenedor };
}

const painel = (doc: Document, texto: string) => {
  const e = doc.createElement("div");
  e.textContent = texto;
  return e;
};

test("montar: o estilo do painel entra na raiz como <style> (sem folha construível)", () => {
  const { raiz } = montar();
  assert.equal(raiz.querySelector("style")?.textContent, CSS);
});

test("montar: começa escondido e vazio", () => {
  const { contenedor, corpo } = montar();
  assert.equal(contenedor()?.hasAttribute("hidden"), true);
  assert.equal(corpo()?.childNodes.length, 0);
});

test("mostrar: põe o painel no overlay e o torna visível", () => {
  const { doc, overlay, contenedor, corpo } = montar();
  overlay.mostrar(painel(doc, "análise A"));
  assert.equal(contenedor()?.hasAttribute("hidden"), false);
  assert.equal(corpo()?.textContent, "análise A");
});

test("mostrar de novo substitui o painel: nunca dois ao mesmo tempo", () => {
  const { doc, overlay, corpo } = montar();
  overlay.mostrar(painel(doc, "análise A"));
  overlay.mostrar(painel(doc, "análise B"));
  assert.equal(corpo()?.children.length, 1);
  assert.equal(corpo()?.textContent, "análise B");
});

test("fechar: esconde o overlay e esvazia o corpo", () => {
  const { doc, overlay, contenedor, corpo } = montar();
  overlay.mostrar(painel(doc, "análise A"));
  overlay.fechar();
  assert.equal(contenedor()?.hasAttribute("hidden"), true);
  assert.equal(corpo()?.childNodes.length, 0);
});

test("o botão × do overlay fecha, e depois dá para mostrar de novo", () => {
  const { doc, raiz, overlay, contenedor, corpo } = montar();
  overlay.mostrar(painel(doc, "análise A"));
  const x = raiz.querySelector('button[data-acao="fechar"]') as HTMLElement;
  assert.equal(x.getAttribute("aria-label"), "Fechar");
  x.click();
  assert.equal(contenedor()?.hasAttribute("hidden"), true);
  overlay.mostrar(painel(doc, "análise B"));
  assert.equal(contenedor()?.hasAttribute("hidden"), false);
  assert.equal(corpo()?.textContent, "análise B");
});

test("o botão × não fica dentro do corpo: mostrar não o apaga", () => {
  const { doc, raiz, overlay } = montar();
  overlay.mostrar(painel(doc, "A"));
  overlay.mostrar(painel(doc, "B"));
  assert.equal(raiz.querySelectorAll('button[data-acao="fechar"]').length, 1);
});

test("com folha de estilo construível (adoptedStyleSheets), usa a folha e não cria <style>", () => {
  class Folha {
    texto = "";
    replaceSync(t: string) {
      this.texto = t;
    }
  }
  const global = globalThis as unknown as { CSSStyleSheet?: unknown };
  const antes = global.CSSStyleSheet;
  global.CSSStyleSheet = Folha;
  try {
    const doc = pagina("<div id='raiz'></div>") as Document;
    const raiz = doc.getElementById("raiz") as HTMLElement & { adoptedStyleSheets?: Folha[] };
    Object.defineProperty(raiz, "adoptedStyleSheets", { value: [], writable: true });
    montarOverlay(doc, raiz, CSS);
    assert.equal(raiz.adoptedStyleSheets?.length, 1);
    assert.equal(raiz.adoptedStyleSheets?.[0]?.texto, CSS);
    assert.equal(raiz.querySelector("style"), null);
  } finally {
    if (antes === undefined) delete global.CSSStyleSheet;
    else global.CSSStyleSheet = antes;
  }
});
