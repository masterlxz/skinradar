/** Subconjunto de `chrome.runtime.MessageSender` que a validação usa. */
export interface Remetente {
  id?: string;
  url?: string;
}

// Os mesmos hosts do `content_scripts.matches` do manifest (um teste confere o manifest).
const HOSTS = new Set(["dashskins.com.br", "www.dashskins.com.br"]);

/**
 * Só vale mensagem da própria extensão, vinda de uma página do DashSkins por https. Quem manda a mensagem
 * é o content script, que roda dentro da página do site: o worker não confia em nada além disso.
 */
export function remetenteValido(sender: Remetente | undefined, idProprio: string): boolean {
  if (sender === undefined || sender.id !== idProprio || sender.url === undefined) return false;
  let u: URL;
  try {
    u = new URL(sender.url);
  } catch {
    return false;
  }
  return u.protocol === "https:" && u.port === "" && HOSTS.has(u.hostname);
}
