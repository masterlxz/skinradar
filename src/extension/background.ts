// Service worker: cola fina. Toda a decisão está em `servico.ts` (testado); aqui só liga ao Chrome.
import { armazemDeSessao, lerOpcoes } from "./armazenamento.ts";
import { remetenteValido } from "./remetente.ts";
import { criarServico } from "./servico.ts";

// `storage.local` é exposto a content scripts por padrão. A chave da API mora lá: fecha o acesso para que só
// o worker e as páginas da extensão a leiam (defesa em profundidade contra um content script comprometido).
chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {
  console.error("SkinRadar: não consegui restringir o storage.local a contextos confiáveis");
});

const servico = criarServico({
  opcoes: () => lerOpcoes(chrome.storage.local),
  fetch: (url, init) => fetch(url, init),
  armazem: armazemDeSessao(chrome.storage.session),
  agora: () => Date.now(),
});

chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
  if (!remetenteValido(remetente, chrome.runtime.id)) return false;
  void servico.tratar(mensagem).then(responder);
  return true; // mantém o canal aberto: a resposta chega depois do await
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
