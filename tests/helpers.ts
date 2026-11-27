import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";

/** Lê uma fixture real e sanitizada de `tests/fixtures/csfloat/`. */
export function fixture(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/csfloat/${nome}`, import.meta.url), "utf8"));
}

/** Lê o HTML de um card real do DashSkins (`tests/fixtures/dashskins/`). */
export function htmlDashskins(nome: string): string {
  return readFileSync(new URL(`./fixtures/dashskins/${nome}`, import.meta.url), "utf8");
}

/** Monta uma página com o HTML dado. O linkedom serve só nos testes; o tipo é o do DOM do navegador. */
export function pagina(html: string): Document {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  return document as unknown as Document;
}

/** O elemento raiz de um único card colado na página (sem depender de `findCards`). */
export function raizDoCard(html: string): Element {
  const raiz = pagina(html).body.firstElementChild;
  if (raiz === null) throw new Error("HTML do card vazio");
  return raiz;
}

export function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`esperava ok, veio erro: ${JSON.stringify(r.error)}`);
  return r.value;
}
