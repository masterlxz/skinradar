import { findCards, readCard } from "../adapters/dashskins/card.ts";
import { renderEstado, renderPainel } from "../ui/painel.ts";
import type { Pedido, Resposta } from "./mensagens.ts";

export interface DepsControlador {
  doc: Document;
  enviar: (pedido: Pedido) => Promise<Resposta>;
  /** Põe o elemento no painel (na extensão, o overlay); um por vez. */
  mostrar: (elemento: Element) => void;
  agora: () => number;
}

export interface Controlador {
  /** Põe o botão nos cards ainda sem ele; devolve quantos botões novos. */
  preparar(raiz: ParentNode): number;
  analisar(card: Element, forcar: boolean): Promise<void>;
}

const MARCA = "data-skinradar";
const TEXTO_BOTAO = "Analisar no SkinRadar";
const TEXTO_OCUPADO = "Analisando…";

export function criarControlador(deps: DepsControlador): Controlador {
  const { doc } = deps;
  const emAndamento = new Set<Element>();

  const botaoDe = (card: Element) => card.querySelector(`[${MARCA}] button`);

  /**
   * Tudo até o primeiro `await` roda no ato do clique: o estado "Analisando…", o botão desabilitado e a
   * marca de "em andamento" já valem quando um segundo clique chega (PRD 4.3).
   */
  async function analisar(card: Element, forcar: boolean): Promise<void> {
    if (emAndamento.has(card)) return;
    emAndamento.add(card);
    const botao = botaoDe(card);
    try {
      const lido = readCard(card);
      if (!lido.ok) {
        deps.mostrar(
          renderEstado(doc, { tipo: "erro", erro: { kind: "card_ilegivel", motivo: lido.error.kind } }),
        );
        return;
      }
      deps.mostrar(renderEstado(doc, { tipo: "carregando" }));
      if (botao !== null) {
        botao.setAttribute("disabled", "");
        botao.textContent = TEXTO_OCUPADO;
      }

      const { marketHashName, priceCents, float, stickers, tradeLock } = lido.value;
      let resposta: Resposta;
      try {
        resposta = await deps.enviar({
          tipo: "analisar",
          item: { marketHashName, priceCents, float, stickers, tradeLock },
          forcar,
        });
      } catch {
        resposta = { ok: false, erro: { kind: "interno" } };
      }

      if (resposta.ok) {
        const painel = renderPainel(doc, resposta.analise, deps.agora());
        painel.querySelector('button[data-acao="atualizar"]')?.addEventListener("click", () => {
          void analisar(card, true);
        });
        deps.mostrar(painel);
      } else {
        deps.mostrar(renderEstado(doc, { tipo: "erro", erro: resposta.erro }));
      }
    } finally {
      emAndamento.delete(card);
      if (botao !== null) {
        botao.removeAttribute("disabled");
        botao.textContent = TEXTO_BOTAO;
      }
    }
  }

  function preparar(raiz: ParentNode): number {
    let novos = 0;
    for (const card of findCards(raiz)) {
      if (card.querySelector(`[${MARCA}]`) !== null) continue;
      const botao = doc.createElement("button");
      botao.setAttribute("type", "button");
      botao.textContent = TEXTO_BOTAO;
      botao.addEventListener("click", () => {
        void analisar(card, false);
      });
      const caixa = doc.createElement("div");
      caixa.setAttribute(MARCA, "");
      caixa.appendChild(botao);
      card.appendChild(caixa);
      novos++;
    }
    return novos;
  }

  return { preparar, analisar };
}
