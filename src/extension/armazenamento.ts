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

const PREFIXO_CACHE = "skinradar.cache|";
const CHAVE_API = "skinradar.chave";
const CHAVE_CONFIG = "skinradar.config";

/** Cache de dados do CSFloat em `chrome.storage.session`; o que volta de lá não é confiável até ser validado. */
export function armazemDeSessao(area: Area): Armazem {
  return {
    async ler(chave) {
      const k = PREFIXO_CACHE + chave;
      const v = (await area.get(k))[k];
      if (typeof v !== "object" || v === null) return undefined;
      const e = v as Record<string, unknown>;
      const em = e["em"];
      if (!("valor" in e) || typeof em !== "number" || !Number.isFinite(em)) return undefined;
      return { valor: e["valor"], em };
    },
    async gravar(chave, entrada) {
      await area.set({ [PREFIXO_CACHE + chave]: entrada });
    },
    async apagar(chave) {
      await area.remove(PREFIXO_CACHE + chave);
    },
  };
}

export async function lerOpcoes(area: Area): Promise<Opcoes> {
  const lido = await area.get([CHAVE_API, CHAVE_CONFIG]);
  const bruta = lido[CHAVE_API];
  const chave = typeof bruta === "string" && bruta.trim() !== "" ? bruta.trim() : null;
  return { chave, config: lido[CHAVE_CONFIG] };
}

/** A chave só é regravada quando informada (em branco = manter a que já está guardada). */
export async function gravarOpcoes(area: Area, novo: { chave?: string; config: unknown }): Promise<void> {
  const itens: Record<string, unknown> = { [CHAVE_CONFIG]: novo.config };
  const chave = novo.chave?.trim();
  if (chave !== undefined && chave !== "") itens[CHAVE_API] = chave;
  await area.set(itens);
}
