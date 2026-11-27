import type { BuyOrder, Cents } from "./types.ts";

export interface SplitOrders {
  /** Ordens que contam como saída (genéricas ou com faixa de float que contém o float do item). */
  eligible: BuyOrder[];
  /** Ordens que exigem sticker: nunca contam como saída (ADR 0001, decisão 3). */
  stickerOnly: BuyOrder[];
  /** Ordens com faixa de float que não contém o float do item. */
  outOfRange: BuyOrder[];
  /** Ordens elegíveis, mas abaixo do piso (ordens-lixo). */
  belowFloor: BuyOrder[];
  /** Maior preço entre as elegíveis. */
  best: BuyOrder | null;
  /** Maior preço entre as elegíveis sem faixa de float. */
  bestGeneric: BuyOrder | null;
}

function maisCara(orders: BuyOrder[]): BuyOrder | null {
  let best: BuyOrder | null = null;
  for (const o of orders) {
    if (best === null || o.price > best.price) best = o;
  }
  return best;
}

function temFaixa(o: BuyOrder): boolean {
  return o.minFloat !== undefined || o.maxFloat !== undefined;
}

/** Separa as Buy Orders pelo que cada uma significa para o item (float inclusivo nos dois lados). */
export function splitOrders(orders: BuyOrder[], itemFloat: number, floorCents: Cents): SplitOrders {
  const eligible: BuyOrder[] = [];
  const stickerOnly: BuyOrder[] = [];
  const outOfRange: BuyOrder[] = [];
  const belowFloor: BuyOrder[] = [];

  for (const o of orders) {
    if (o.stickers.length > 0) {
      stickerOnly.push(o);
    } else if (
      (o.minFloat !== undefined && itemFloat < o.minFloat) ||
      (o.maxFloat !== undefined && itemFloat > o.maxFloat)
    ) {
      outOfRange.push(o);
    } else if (o.price < floorCents) {
      belowFloor.push(o);
    } else {
      eligible.push(o);
    }
  }

  return {
    eligible,
    stickerOnly,
    outOfRange,
    belowFloor,
    best: maisCara(eligible),
    bestGeneric: maisCara(eligible.filter((o) => !temFaixa(o))),
  };
}
