export interface Entrada<T> {
  valor: T;
  /** Quando os dados foram buscados (ms, relógio injetado). */
  em: number;
  deCache: boolean;
}

export interface Cache<T> {
  /**
   * Devolve o valor guardado se ainda vale (idade estritamente menor que a validade), reaproveita a
   * busca em andamento da mesma chave ou chama `produzir`. Só guarda se `produzir` disser `guardar`.
   * Registra a busca em andamento de forma síncrona: dois chamadores no mesmo tick dividem uma busca.
   */
  obter(
    chave: string,
    validadeMs: number,
    forcar: boolean,
    produzir: () => Promise<{ valor: T; guardar: boolean }>,
  ): Promise<Entrada<T>>;
}

export function criarCache<T>(agora: () => number): Cache<T> {
  const guardado = new Map<string, { valor: T; em: number }>();
  const emVoo = new Map<string, Promise<Entrada<T>>>();

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
          const { valor, guardar } = await produzir();
          if (guardar) guardado.set(chave, { valor, em });
          else guardado.delete(chave);
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
