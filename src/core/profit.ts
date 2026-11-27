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
  /** lucro * 100 / compra, sem arredondar (arredondar aqui mudaria a classificação no limite). */
  roiPct: number;
}

/** Lucro = venda − taxa − custos − compra, tudo em centavos inteiros; taxa com meio centavo para cima. */
export function evaluateExit(input: ExitInput): ExitResult {
  const { compra, venda, taxaBp, custos } = input;
  if (!Number.isInteger(compra) || compra <= 0) {
    throw new RangeError("a compra deve ser um inteiro positivo (ROI é indefinido sem ela)");
  }
  const taxa = Math.round((venda * taxaBp) / 10000);
  const lucro = venda - taxa - custos - compra;
  return { compra, venda, taxa, custos, lucro, roiPct: (lucro * 100) / compra };
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
  const avaliar = (venda: Cents | null): ExitResult | null =>
    venda === null ? null : evaluateExit({ compra, venda, taxaBp, custos });
  return {
    mercado: avaliar(refs.mercado),
    menorAnuncio: avaliar(refs.menorAnuncio),
    buyOrder: avaliar(refs.buyOrder),
  };
}
