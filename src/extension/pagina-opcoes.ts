import { validarConfig } from "../analysis/config.ts";
import { lerOpcoes, gravarOpcoes, type Area } from "./armazenamento.ts";
import { lerFormulario, paraFormulario } from "./formulario.ts";

/** Ids dos campos (iguais aos de `CamposFormulario`) e o nome de cada um para a mensagem de erro. */
const ROTULOS: Record<string, string> = {
  chave: "chave da API",
  cotacaoUsdBrl: "cotação USD→BRL",
  taxaPct: "taxa de venda (%)",
  custosReais: "custos (R$)",
  roiMinPct: "ROI mínimo (%)",
  janelaFloat: "janela de float",
  minVendas: "mínimo de vendas",
  pisoBuyOrderUsd: "piso de Buy Order (US$)",
  validadeMin: "validade do cache (min)",
};
const IDS = Object.keys(ROTULOS);

const entrada = (doc: Document, id: string) => doc.getElementById(id) as HTMLInputElement | null;

function escrever(doc: Document, id: string, texto: string): void {
  const e = doc.getElementById(id);
  if (e !== null) e.textContent = texto;
}

function avisarChave(doc: Document, salva: boolean): void {
  escrever(doc, "estado-chave", salva ? "Chave salva." : "Nenhuma chave salva.");
}

/** Preenche a página com o que está guardado. A chave nunca volta para a tela: só o aviso de que existe. */
export async function carregarOpcoes(doc: Document, area: Area): Promise<void> {
  const { chave, config } = await lerOpcoes(area);
  const valida = validarConfig(config);
  if (valida.ok) {
    for (const [id, valor] of Object.entries(paraFormulario(valida.value))) {
      const campo = entrada(doc, id);
      if (campo !== null) campo.value = valor;
    }
  }
  avisarChave(doc, chave !== null);
}

export async function salvarOpcoes(doc: Document, area: Area): Promise<void> {
  try {
    const { chave: atual } = await lerOpcoes(area);
    const campos: Record<string, string> = {};
    for (const id of IDS) {
      const campo = entrada(doc, id);
      campo?.removeAttribute("aria-invalid");
      campos[id] = campo?.value ?? "";
    }

    const r = lerFormulario(campos, atual !== null);
    if (!r.ok) {
      for (const id of r.campos) entrada(doc, id)?.setAttribute("aria-invalid", "true");
      escrever(doc, "estado", `Corrija os campos: ${r.campos.map((c) => ROTULOS[c] ?? c).join(", ")}.`);
      return;
    }

    await gravarOpcoes(area, { ...(r.chave === null ? {} : { chave: r.chave }), config: r.config });
    const campoChave = entrada(doc, "chave");
    if (campoChave !== null) campoChave.value = "";
    avisarChave(doc, true);
    escrever(doc, "estado", "Salvo.");
  } catch {
    // O detalhe do erro pode conter dados que não devem aparecer na página.
    escrever(doc, "estado", "Não foi possível salvar.");
  }
}
