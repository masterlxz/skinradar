export interface Entrada<T> {
  valor: T;
  /** Quando os dados foram buscados (ms, relógio injetado). */
  em: number;
  deCache: boolean;
}

/**
 * Armazenamento que sobrevive ao sono do service worker (na extensão, `chrome.storage.session`).
 * O `valor` é `unknown` de propósito: o que volta do armazenamento não é confiável até ser validado.
 */
export interface Armazem {
  ler(chave: string): Promise<{ valor: unknown; em: number } | undefined>;
  gravar(chave: string, entrada: { valor: unknown; em: number }): Promise<void>;
  apagar(chave: string): Promise<void>;
}

export interface Cache<T> {
  /**
   * Devolve o valor guardado se ainda vale (idade estritamente menor que a validade), reaproveita a
   * busca em andamento da mesma chave ou chama `produzir`. Só guarda se `produzir` disser `guardar`.
   * A busca em andamento é registrada de forma síncrona, **antes** de qualquer `await` (inclusive a
   * leitura do armazém): dois chamadores no mesmo tick dividem uma busca só.
   */
  obter(
    chave: string,
    validadeMs: number,
    forcar: boolean,
    produzir: () => Promise<{ valor: T; guardar: boolean }>,
  ): Promise<Entrada<T>>;
}

export interface OpcoesCache<T> {
  armazem?: Armazem;
  /** Obrigatória com `armazem`: confere o formato do que veio do armazenamento. */
  valida?: (valor: unknown) => valor is T;
}

/** Falha do armazenamento é falha de cache, nunca falha da análise. */
async function tentar(acao: () => Promise<void>): Promise<void> {
  try {
    await acao();
  } catch {
    // armazenamento indisponível ou cheio: segue só com a memória
  }
}

export function criarCache<T>(agora: () => number, opcoes: OpcoesCache<T> = {}): Cache<T> {
  const { armazem, valida } = opcoes;
  const guardado = new Map<string, { valor: T; em: number }>();
  const emVoo = new Map<string, Promise<Entrada<T>>>();

  async function lerDoArmazem(chave: string, validadeMs: number): Promise<{ valor: T; em: number } | null> {
    if (armazem === undefined || valida === undefined) return null;
    let lido: { valor: unknown; em: number } | undefined | null;
    try {
      lido = await armazem.ler(chave);
    } catch {
      return null;
    }
    if (lido === undefined || lido === null || typeof lido !== "object") return null;
    if (typeof lido.em !== "number" || !Number.isFinite(lido.em)) return null;
    if (!valida(lido.valor) || !(agora() - lido.em < validadeMs)) return null;
    return { valor: lido.valor, em: lido.em };
  }

  return {
    obter(chave, validadeMs, forcar, produzir) {
      const g = guardado.get(chave);
      if (!forcar && g !== undefined && agora() - g.em < validadeMs) {
        return Promise.resolve({ valor: g.valor, em: g.em, deCache: true });
      }
      const andamento = emVoo.get(chave);
      if (andamento !== undefined) return andamento;

      const em = agora();
      const busca = (async (): Promise<Entrada<T>> => {
        try {
          if (!forcar) {
            const doArmazem = await lerDoArmazem(chave, validadeMs);
            if (doArmazem !== null) {
              guardado.set(chave, doArmazem);
              return { valor: doArmazem.valor, em: doArmazem.em, deCache: true };
            }
          }
          const { valor, guardar } = await produzir();
          if (guardar) {
            guardado.set(chave, { valor, em });
            if (armazem !== undefined) await tentar(() => armazem.gravar(chave, { valor, em }));
          } else {
            guardado.delete(chave);
            // Só uma atualização pedida pelo usuário apaga: sem `forcar`, o que há no armazém já estava
            // vencido, ausente ou corrompido.
            if (forcar && armazem !== undefined) await tentar(() => armazem.apagar(chave));
          }
          return { valor, em, deCache: false };
        } finally {
          emVoo.delete(chave);
        }
      })();
      emVoo.set(chave, busca);
      return busca;
    },
  };
}
