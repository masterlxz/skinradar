import type { Cents } from "./types.ts";

export interface ExitInput {
  compra: Cents;
  venda: Cents;
  /** Taxa de venda em pontos-base (500 = 5%). Sem padrão: quem chama informa. */
  taxaBp: number;
  custos: Cents;
}

export interface ExitResult {
  compra: Cents;
  venda: Cents;
  taxa: Cents;
  custos: Cents;
  lucro: Cents;
  /** lucro * 100 / compra, sem arredondar. */
  roiPct: number;
}

export function evaluateExit(input: ExitInput): ExitResult {
  throw new Error("não implementado");
}

export interface References {
  mercado: Cents | null;
  menorAnuncio: Cents | null;
  buyOrder: Cents | null;
}

export interface Exits {
  mercado: ExitResult | null;
  menorAnuncio: ExitResult | null;
  buyOrder: ExitResult | null;
}

/** As três modalidades de saída, separadas: nunca viram uma estimativa só. */
export function evaluateExits(
  compra: Cents,
  refs: References,
  taxaBp: number,
  custos: Cents,
): Exits {
  throw new Error("não implementado");
}
