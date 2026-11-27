import type { Cents } from "../../core/types.ts";
import type { Lido } from "../types.ts";

/**
 * Preço em reais como centavos inteiros. Só aceita a convenção em inglês do site (`R$1,399.99`):
 * vírgula de milhar e ponto de centavos. Qualquer outro formato é erro, nunca um número errado.
 */
export function parseBrlPrice(texto: string): Lido<Cents> {
  // ESBOÇO (testes primeiro)
  return { ok: false, error: { kind: "preco_invalido", detalhe: texto } };
}
