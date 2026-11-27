/** Valores monetários sempre em centavos inteiros (a moeda é de quem chama). */
export type Cents = number;

export interface Sticker {
  id: number;
  /** Posição na arma, quando a API informa. */
  slot?: number;
}

export interface Listing {
  id: string;
  /** "buy_now" ou "auction" (a API pode trazer outros; não assumimos). */
  type: string;
  state: string;
  price: Cents;
  float: number;
  stickers: Sticker[];
  marketHashName: string;
}

export interface Sale {
  price: Cents;
  float: number;
  soldAt: string;
  type: string;
  /** Quantos stickers o item vendido tinha (a venda só compara com item do mesmo grupo). */
  stickerCount: number;
}

export interface BuyOrder {
  price: Cents;
  qty: number;
  minFloat?: number;
  maxFloat?: number;
  /** Stickers exigidos pela ordem. */
  stickers: Sticker[];
}
