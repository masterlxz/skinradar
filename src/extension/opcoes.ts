// Página de opções: cola fina. A lógica está em `pagina-opcoes.ts` (testado contra o `opcoes.html` de verdade).
import { carregarOpcoes, salvarOpcoes } from "./pagina-opcoes.ts";

const area = chrome.storage.local;

void carregarOpcoes(document, area);
document.getElementById("formulario")?.addEventListener("submit", (evento) => {
  evento.preventDefault();
  void salvarOpcoes(document, area);
});
