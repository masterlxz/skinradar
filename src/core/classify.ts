import type { ExitResult } from "./profit.ts";
import type { SalesSummary } from "./sales.ts";

export type Classificacao =
  | "interessante"
  | "moderada"
  | "margem_insuficiente"
  | "referencia_inflacionada"
  | "baixa_liquidez"
  | "dados_insuficientes";

export interface ClassifyInput {
  /** `null` quando a fonte de vendas falhou. */
  vendas: SalesSummary | null;
  /** Saída pela mediana das vendas de float parecido. */
  mercado: ExitResult | null;
  /** Saída pelo menor anúncio `buy_now`. */
  menorAnuncio: ExitResult | null;
  /** ROI mínimo (%) para "interessante"; metade dele é o piso de "moderada". */
  roiMinPct: number;
}

/**
 * A régua é a saída pelas vendas reais. Lucro que só existe contra o menor anúncio
 * (preço pedido, não pago) é "referência inflacionada", nunca "interessante".
 */
export function classify(input: ClassifyInput): Classificacao {
  const { vendas, mercado, menorAnuncio, roiMinPct } = input;
  if (vendas === null) return "dados_insuficientes";
  if (vendas.status === "insuficiente") {
    return vendas.n === 0 ? "dados_insuficientes" : "baixa_liquidez";
  }
  if (mercado === null) return "dados_insuficientes";

  if (
    menorAnuncio !== null &&
    menorAnuncio.roiPct >= roiMinPct &&
    mercado.roiPct < roiMinPct
  ) {
    return "referencia_inflacionada";
  }
  if (mercado.roiPct >= roiMinPct) return "interessante";
  if (mercado.roiPct >= roiMinPct / 2) return "moderada";
  return "margem_insuficiente";
}
