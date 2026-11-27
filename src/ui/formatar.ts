import type { Cents } from "../core/types.ts";

// Formatação manual: o `Intl` põe um espaço sem quebra (NBSP) entre o símbolo e o número e muda com o ICU.

function moeda(prefixo: string, centavos: Cents): string {
  if (!Number.isInteger(centavos)) throw new RangeError("centavos devem ser um número inteiro");
  const abs = Math.abs(centavos);
  const inteiro = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const resto = (abs % 100).toString().padStart(2, "0");
  return `${centavos < 0 ? "-" : ""}${prefixo} ${inteiro},${resto}`;
}

export function reais(centavos: Cents): string {
  return moeda("R$", centavos);
}

export function dolar(centavos: Cents): string {
  return moeda("US$", centavos);
}

/** Uma casa decimal; o sinal só aparece se o valor arredondado não for zero. */
export function percentual(valor: number): string {
  const decimos = Math.round(Math.abs(valor) * 10);
  const sinal = valor < 0 && decimos > 0 ? "-" : "";
  return `${sinal}${Math.floor(decimos / 10)},${decimos % 10}%`;
}

export function floatBr(valor: number): string {
  return valor.toFixed(4).replace(".", ",");
}

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

/** "há 5 min": relógio que anda para trás conta como "há instantes". */
export function idade(agora: number, em: number): string {
  const ms = agora - em;
  if (ms < MIN) return "há instantes";
  if (ms < HORA) return `há ${Math.floor(ms / MIN)} min`;
  if (ms < DIA) return `há ${Math.floor(ms / HORA)} h`;
  return `há ${Math.floor(ms / DIA)} d`;
}
