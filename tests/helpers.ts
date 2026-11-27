import { readFileSync } from "node:fs";

/** Lê uma fixture real e sanitizada de `tests/fixtures/csfloat/`. */
export function fixture(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/csfloat/${nome}`, import.meta.url), "utf8"));
}

export function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`esperava ok, veio erro: ${JSON.stringify(r.error)}`);
  return r.value;
}
