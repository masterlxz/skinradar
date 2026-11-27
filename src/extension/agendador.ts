/** Os timers vêm de fora (no Chrome, `setTimeout` e `clearTimeout`; nos testes, um relógio falso). */
export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface Agendador {
  /** Pede a execução; vários pedidos seguidos viram uma só, `ms` depois do último. */
  agendar(): void;
  cancelar(): void;
}

export function criarAgendador(timers: Timers, ms: number, fn: () => void): Agendador {
  let id: unknown;
  let pendente = false;

  function cancelar(): void {
    if (!pendente) return;
    timers.clearTimeout(id);
    pendente = false;
  }

  return {
    agendar() {
      cancelar();
      pendente = true;
      id = timers.setTimeout(() => {
        pendente = false;
        fn();
      }, ms);
    },
    cancelar,
  };
}
