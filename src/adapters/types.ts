export interface AdapterError {
  kind: "preco_invalido" | "sem_preco" | "sem_nome" | "sem_id";
  detalhe?: string;
}

export type Lido<T> = { ok: true; value: T } | { ok: false; error: AdapterError };
