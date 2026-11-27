import assert from "node:assert/strict";
import { test } from "node:test";
import { dolar, floatBr, idade, percentual, reais } from "../../src/ui/formatar.ts";

test("reais: centavos viram 'R$ 117,05', com ponto de milhar e sem espaço especial", () => {
  const casos: [number, string][] = [
    [11705, "R$ 117,05"],
    [0, "R$ 0,00"],
    [5, "R$ 0,05"],
    [100, "R$ 1,00"],
    [139999, "R$ 1.399,99"],
    [100000000, "R$ 1.000.000,00"],
    [-300, "-R$ 3,00"],
    [-5, "-R$ 0,05"],
  ];
  for (const [centavos, esperado] of casos) assert.equal(reais(centavos), esperado, String(centavos));
});

test("reais e dólar usam espaço comum (U+0020), não o NBSP do Intl", () => {
  assert.equal(reais(100).includes(" "), false);
  assert.equal(dolar(100).includes(" "), false);
});

test("dolar: 2081 centavos viram 'US$ 20,81', e negativo leva o sinal na frente", () => {
  assert.equal(dolar(2081), "US$ 20,81");
  assert.equal(dolar(123456), "US$ 1.234,56");
  assert.equal(dolar(-250), "-US$ 2,50");
});

test("valor em centavos fracionário ou infinito é recusado, nunca arredondado em silêncio", () => {
  assert.throws(() => reais(10.5), RangeError);
  assert.throws(() => dolar(Number.NaN), RangeError);
  assert.throws(() => reais(Number.POSITIVE_INFINITY), RangeError);
});

test("percentual: uma casa decimal com vírgula, sinal só quando o valor arredondado não é zero", () => {
  const casos: [number, string][] = [
    [43.3875, "43,4%"],
    [27.4625, "27,5%"],
    [4.28, "4,3%"],
    [7.5, "7,5%"],
    [0, "0,0%"],
    [-0.04, "0,0%"],
    [-12.34, "-12,3%"],
    [100, "100,0%"],
    [1234.56, "1234,6%"],
  ];
  for (const [roi, esperado] of casos) assert.equal(percentual(roi), esperado, String(roi));
});

test("floatBr: 4 casas com vírgula (0,28 → '0,2800'; 0,0548621 → '0,0549')", () => {
  assert.equal(floatBr(0.28), "0,2800");
  assert.equal(floatBr(0.0548621), "0,0549");
  assert.equal(floatBr(0.28016576170921326), "0,2802");
  assert.equal(floatBr(0), "0,0000");
  assert.equal(floatBr(1), "1,0000");
});

test("idade: instantes, minutos, horas e dias, trocando exatamente nos limites", () => {
  const casos: [number, string][] = [
    [0, "há instantes"],
    [59_999, "há instantes"],
    [60_000, "há 1 min"],
    [3_599_999, "há 59 min"],
    [3_600_000, "há 1 h"],
    [86_399_999, "há 23 h"],
    [86_400_000, "há 1 d"],
    [3 * 86_400_000, "há 3 d"],
  ];
  for (const [ms, esperado] of casos) assert.equal(idade(1_000_000 + ms, 1_000_000), esperado, String(ms));
});

test("idade: relógio que anda para trás não gera 'há -5 min'", () => {
  assert.equal(idade(1_000_000, 1_300_000), "há instantes");
});
