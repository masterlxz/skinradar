import type { Cents } from "../../core/types.ts";
import type { Lido } from "../types.ts";

// `R$` + inteiro (com `,` de milhar bem formado ou sem separador) + `.NN` opcional. Nada além disso.
const FORMATO = /^R\$(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?$/;

/**
 * Preço em reais como centavos inteiros, lido como texto (sem `parseFloat`: 1399.99 não é exato em
 * ponto flutuante). Só aceita a convenção em inglês do site (`R$1,399.99`). Qualquer outro formato,
 * como `R$ 1.399,99`, é erro: nunca um número errado.
 */
export function parseBrlPrice(texto: string): Lido<Cents> {
  const m = FORMATO.exec(texto.trim());
  if (m === null) return { ok: false, error: { kind: "preco_invalido", detalhe: texto } };
  const reais = m[1]!.replaceAll(",", "");
  const centavos = m[2] ?? "00";
  const valor = Number(reais + centavos);
  if (!Number.isSafeInteger(valor)) {
    return { ok: false, error: { kind: "preco_invalido", detalhe: texto } };
  }
  return { ok: true, value: valor };
}
