import type { Config } from "../analysis/config.ts";

/** Campos de texto da página de opções, nas unidades que o dono digita. */
export type CamposFormulario = Record<string, string>;

export type ResultadoFormulario =
  | { ok: true; chave: string | null; config: Config }
  | { ok: false; campos: string[] };

// ESQUELETO (Etapa D): compila e falha por asserção. A implementação vem depois dos testes.
export function lerFormulario(_campos: CamposFormulario, _jaTemChave: boolean): ResultadoFormulario {
  throw new Error("não implementado");
}

export function paraFormulario(_config: Config): CamposFormulario {
  throw new Error("não implementado");
}
