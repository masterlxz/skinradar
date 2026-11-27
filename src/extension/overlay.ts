export interface Overlay {
  /** Substitui o conteúdo do overlay e o mostra: um painel por vez. */
  mostrar(elemento: Element): void;
  fechar(): void;
}

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function montarOverlay(_doc: Document, _raiz: Node & ParentNode, _css: string): Overlay {
  throw new Error("não implementado");
}
