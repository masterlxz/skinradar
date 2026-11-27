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

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function criarAgendador(_timers: Timers, _ms: number, _fn: () => void): Agendador {
  throw new Error("não implementado");
}
