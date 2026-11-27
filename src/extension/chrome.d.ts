// Declaração mínima das APIs do Chrome que a extensão usa (em vez de `@types/chrome`: ~10 chamadas não
// justificam a dependência). Conferida com developer.chrome.com em 2026-11-27.

interface AreaDoChrome {
  get(chaves: string | string[]): Promise<Record<string, unknown>>;
  set(itens: Record<string, unknown>): Promise<void>;
  remove(chaves: string | string[]): Promise<void>;
  /** Chrome 102+: por padrão `local` é exposto a content scripts e `session` não. */
  setAccessLevel(opcoes: { accessLevel: "TRUSTED_CONTEXTS" | "TRUSTED_AND_UNTRUSTED_CONTEXTS" }): Promise<void>;
}

declare const chrome: {
  storage: { local: AreaDoChrome; session: AreaDoChrome };
  runtime: {
    readonly id: string;
    sendMessage(mensagem: unknown): Promise<unknown>;
    openOptionsPage(): Promise<void>;
    onMessage: {
      /** Retornar o literal `true` mantém o canal aberto para um `sendResponse` assíncrono. */
      addListener(
        ouvinte: (
          mensagem: unknown,
          remetente: { id?: string; url?: string },
          responder: (resposta: unknown) => void,
        ) => boolean | undefined,
      ): void;
    };
  };
  action: { onClicked: { addListener(ouvinte: () => void): void } };
};
