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
  vendas: SalesSummary | null;
  /** Saída pela mediana das vendas de float parecido. */
  mercado: ExitResult | null;
  /** Saída pelo menor anúncio `buy_now`. */
  menorAnuncio: ExitResult | null;
  /** ROI mínimo (%) para "interessante"; metade dele é o piso de "moderada". */
  roiMinPct: number;
}

export function classify(input: ClassifyInput): Classificacao {
  throw new Error("não implementado");
}
