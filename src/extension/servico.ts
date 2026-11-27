import { criarAnalisador } from "../analysis/analisar.ts";
import type { Armazem } from "../analysis/cache.ts";
import { createClient, type FetchLike } from "../csfloat/client.ts";
import type { Opcoes } from "./armazenamento.ts";
import { validarPedido, type Resposta } from "./mensagens.ts";

export interface DepsServico {
  /** Lê as opções guardadas; chamada a cada pedido (o worker dorme, e mudar a taxa vale no clique seguinte). */
  opcoes: () => Promise<Opcoes>;
  fetch: FetchLike;
  armazem: Armazem;
  agora: () => number;
}

const INTERNO: Resposta = { ok: false, erro: { kind: "interno" } };

/**
 * O que o service worker faz com cada mensagem do content script. Único código que lê a chave da API,
 * e ela só vai ao cabeçalho `Authorization` do cliente: nunca entra na resposta nem no texto de um erro.
 */
export function criarServico(deps: DepsServico): { tratar(msg: unknown): Promise<Resposta> } {
  let atual: { chave: string; analisar: ReturnType<typeof criarAnalisador> } | null = null;

  function analisadorDaChave(chave: string) {
    if (atual === null || atual.chave !== chave) {
      atual = {
        chave,
        analisar: criarAnalisador({
          client: createClient({ apiKey: chave, fetch: deps.fetch }),
          agora: deps.agora,
          armazem: deps.armazem,
        }),
      };
    }
    return atual.analisar;
  }

  return {
    async tratar(msg) {
      try {
        const pedido = validarPedido(msg);
        if (pedido === null) return INTERNO;
        const { chave, config } = await deps.opcoes();
        if (chave === null || chave === "") return { ok: false, erro: { kind: "sem_chave" } };
        const r = await analisadorDaChave(chave)(pedido.item, config, { forcar: pedido.forcar });
        if (!r.ok) return { ok: false, erro: { kind: "config_invalida", campos: r.error.campos } };
        return { ok: true, analise: r.value };
      } catch {
        // A mensagem da exceção pode conter a chave ou dados internos: nada disso sai daqui.
        return INTERNO;
      }
    },
  };
}
