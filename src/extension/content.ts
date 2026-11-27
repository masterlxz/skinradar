// Content script: cola fina. Não importa nada de armazenamento e não faz rede (só o service worker faz).
import { CSS } from "../ui/painel.ts";
import { criarAgendador } from "./agendador.ts";
import { criarControlador } from "./card.ts";
import type { Pedido, Resposta } from "./mensagens.ts";
import { CSS_OVERLAY, montarOverlay } from "./overlay.ts";

// Um painel só, fixo no canto, dentro de um shadow root fechado: as classes do site têm sufixo gerado e o CSS
// dele não alcança o painel (nem o nosso alcança a página).
const host = document.createElement("div");
host.id = "skinradar-overlay";
host.style.cssText = "all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;";
const overlay = montarOverlay(document, host.attachShadow({ mode: "closed" }), CSS_OVERLAY + CSS);
document.body.appendChild(host);

async function enviar(pedido: Pedido): Promise<Resposta> {
  const resposta = await chrome.runtime.sendMessage(pedido);
  // O worker recusa remetente inválido sem responder (volta `undefined`): trata como falha, não como análise.
  const ok = (resposta as { ok?: unknown } | null | undefined)?.ok;
  if (typeof ok !== "boolean") throw new Error("resposta inválida do service worker");
  return resposta as Resposta;
}

const controlador = criarControlador({
  doc: document,
  enviar,
  mostrar: (elemento) => overlay.mostrar(elemento),
  agora: () => Date.now(),
});

// Varre a página atrás de cards novos (rolagem, troca de página). Só mexe no DOM: nenhuma consulta externa
// acontece sem clique (PRD 4.4). Nossas próprias inserções disparam o observador, mas a segunda varredura não
// acha nada para fazer e o ciclo acaba.
const varrer = criarAgendador(
  { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (id) => clearTimeout(id as number) },
  200,
  () => {
    controlador.preparar(document);
  },
);
new MutationObserver(() => varrer.agendar()).observe(document.body, { childList: true, subtree: true });
controlador.preparar(document);
