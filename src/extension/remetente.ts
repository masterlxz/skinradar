/** Subconjunto de `chrome.runtime.MessageSender` que a validação usa. */
export interface Remetente {
  id?: string;
  url?: string;
}

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function remetenteValido(_sender: Remetente | undefined, _idProprio: string): boolean {
  throw new Error("não implementado");
}
