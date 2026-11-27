import type { Cents } from "../core/types.ts";

export interface Config {
  /** Reais por dólar, preenchida pelo dono (ADR 0001, decisão 7). Sem padrão. */
  cotacaoUsdBrl: number;
  /** Taxa de venda em pontos-base (500 = 5%). Sem padrão enquanto a taxa oficial não é lida (P9). */
  taxaBp: number;
  /** Outros custos por operação, em centavos de real. */
  custosCents: Cents;
  /** ROI mínimo (%) para "interessante"; metade dele é o piso de "moderada". */
  roiMinPct: number;
  /** Janela de float das vendas (±). Sem padrão enquanto P11 está aberta. */
  janelaFloat: number;
  /** Mínimo de vendas comparáveis; abaixo disso a amostra é insuficiente. */
  minVendas: number;
  /** Piso das Buy Orders, em centavos de dólar, contra ordens-lixo. */
  pisoBuyOrderCents: Cents;
  /** Validade do cache dos dados do CSFloat, em segundos (0 = sem cache). */
  validadeCacheSeg: number;
}

export type ResultadoConfig =
  | { ok: true; value: Config }
  | { ok: false; error: { kind: "config_invalida"; campos: string[] } };

const finito = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const inteiro = (x: unknown): x is number => finito(x) && Number.isInteger(x);

interface Campo {
  nome: keyof Config;
  /** `undefined`: obrigatório. */
  padrao?: number;
  vale: (x: unknown) => boolean;
}

// A ordem daqui é a ordem de `campos` no erro.
const CAMPOS: Campo[] = [
  { nome: "cotacaoUsdBrl", vale: (x) => finito(x) && x > 0 },
  { nome: "taxaBp", vale: (x) => inteiro(x) && x >= 0 && x < 10000 },
  { nome: "custosCents", padrao: 0, vale: (x) => inteiro(x) && x >= 0 },
  { nome: "roiMinPct", padrao: 15, vale: (x) => finito(x) && x >= 0 },
  { nome: "janelaFloat", vale: (x) => finito(x) && x > 0 && x <= 1 },
  { nome: "minVendas", padrao: 5, vale: (x) => inteiro(x) && x >= 1 },
  { nome: "pisoBuyOrderCents", vale: (x) => inteiro(x) && x >= 0 },
  { nome: "validadeCacheSeg", vale: (x) => finito(x) && x >= 0 },
];

/** Valida a configuração vinda do armazenamento: sem valor inventado para o que o dono não informou. */
export function validarConfig(entrada: unknown): ResultadoConfig {
  const bruto: Record<string, unknown> =
    typeof entrada === "object" && entrada !== null ? (entrada as Record<string, unknown>) : {};
  const campos: string[] = [];
  const valor: Record<string, number> = {};
  for (const c of CAMPOS) {
    const x = bruto[c.nome] ?? c.padrao;
    if (x !== undefined && c.vale(x)) valor[c.nome] = x as number;
    else campos.push(c.nome);
  }
  if (campos.length > 0) return { ok: false, error: { kind: "config_invalida", campos } };
  return { ok: true, value: valor as unknown as Config };
}
