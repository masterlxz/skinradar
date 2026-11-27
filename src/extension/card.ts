import type { Pedido, Resposta } from "./mensagens.ts";

export interface DepsControlador {
  doc: Document;
  enviar: (pedido: Pedido) => Promise<Resposta>;
  /** Põe o elemento no painel (na extensão, o overlay); um por vez. */
  mostrar: (elemento: Element) => void;
  agora: () => number;
}

export interface Controlador {
  /** Põe o botão nos cards ainda sem ele; devolve quantos botões novos. */
  preparar(raiz: ParentNode): number;
  analisar(card: Element, forcar: boolean): Promise<void>;
}

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function criarControlador(_deps: DepsControlador): Controlador {
  throw new Error("não implementado");
}
