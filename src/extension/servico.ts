import type { Armazem } from "../analysis/cache.ts";
import type { FetchLike } from "../csfloat/client.ts";
import type { Opcoes } from "./armazenamento.ts";
import type { Resposta } from "./mensagens.ts";

export interface DepsServico {
  opcoes: () => Promise<Opcoes>;
  fetch: FetchLike;
  armazem: Armazem;
  agora: () => number;
}

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function criarServico(_deps: DepsServico): { tratar(msg: unknown): Promise<Resposta> } {
  throw new Error("não implementado");
}
