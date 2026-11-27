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

export function splitOrders(orders: BuyOrder[], itemFloat: number, floorCents: Cents): SplitOrders {
  throw new Error("não implementado");
}
