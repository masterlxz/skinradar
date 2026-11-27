export interface Overlay {
  /** Substitui o conteúdo do overlay e o mostra: um painel por vez. */
  mostrar(elemento: Element): void;
  fechar(): void;
}

/** Estilo do próprio overlay (o do painel vem de `ui/painel.ts`); a cola do Chrome junta os dois. */
export const CSS_OVERLAY = `
[data-sr-overlay] { position: relative; }
[data-sr-overlay][hidden] { display: none; }
[data-sr-overlay] > button[data-acao="fechar"] { position: absolute; top: 4px; right: 8px; background: none; border: 0;
  color: #e8e8ee; font: 18px/1 system-ui, sans-serif; cursor: pointer; }
`;

type RaizComFolhas = Node & ParentNode & { adoptedStyleSheets?: unknown[] };

/**
 * Monta o overlay dentro de `raiz` (na extensão, um shadow root). O estilo entra como folha construível
 * quando existe (a CSP da página não a bloqueia) e, senão, como `<style>`.
 */
export function montarOverlay(doc: Document, raiz: Node & ParentNode, css: string): Overlay {
  const r = raiz as RaizComFolhas;
  if ("adoptedStyleSheets" in r && r.adoptedStyleSheets !== undefined && typeof CSSStyleSheet === "function") {
    const folha = new CSSStyleSheet();
    folha.replaceSync(css);
    r.adoptedStyleSheets.push(folha);
  } else {
    const estilo = doc.createElement("style");
    estilo.textContent = css;
    raiz.appendChild(estilo);
  }

  const contentor = doc.createElement("div");
  contentor.setAttribute("data-sr-overlay", "");
  contentor.setAttribute("hidden", "");

  const corpo = doc.createElement("div");
  corpo.setAttribute("data-sr-corpo", "");

  const fecharBotao = doc.createElement("button");
  fecharBotao.setAttribute("type", "button");
  fecharBotao.setAttribute("data-acao", "fechar");
  fecharBotao.setAttribute("aria-label", "Fechar");
  fecharBotao.textContent = "×";

  contentor.appendChild(fecharBotao);
  contentor.appendChild(corpo);
  raiz.appendChild(contentor);

  function esvaziar(): void {
    while (corpo.firstChild !== null) corpo.removeChild(corpo.firstChild);
  }

  function fechar(): void {
    contentor.setAttribute("hidden", "");
    esvaziar();
  }

  fecharBotao.addEventListener("click", fechar);

  return {
    mostrar(elemento) {
      esvaziar();
      corpo.appendChild(elemento);
      contentor.removeAttribute("hidden");
    },
    fechar,
  };
}
