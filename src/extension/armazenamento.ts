import type { Armazem } from "../analysis/cache.ts";

/** Subconjunto de `chrome.storage.StorageArea` que usamos: a cola do Chrome o entrega, os testes o imitam. */
export interface Area {
  get(chaves: string | string[]): Promise<Record<string, unknown>>;
  set(itens: Record<string, unknown>): Promise<void>;
  remove(chaves: string | string[]): Promise<void>;
}

export interface Opcoes {
  /** `null`: nunca informada, em branco ou de formato estranho. */
  chave: string | null;
  /** Como está guardada; quem usa valida com `validarConfig`. */
  config: unknown;
}

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function armazemDeSessao(_area: Area): Armazem {
  throw new Error("não implementado");
}

export function lerOpcoes(_area: Area): Promise<Opcoes> {
  throw new Error("não implementado");
}

export function gravarOpcoes(_area: Area, _novo: { chave?: string; config: unknown }): Promise<void> {
  throw new Error("não implementado");
}
