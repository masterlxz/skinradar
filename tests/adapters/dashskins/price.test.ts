import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBrlPrice } from "../../../src/adapters/dashskins/price.ts";

const valor = (texto: string) => {
  const r = parseBrlPrice(texto);
  return r.ok ? r.value : `erro:${r.error.kind}`;
};

test("preços do site em inglês viram centavos inteiros (R$699.99, R$1,399.99, R$0.50, R$12)", () => {
  assert.equal(valor("R$699.99"), 69999);
  assert.equal(valor("R$1,399.99"), 139999);
  assert.equal(valor("R$0.50"), 50);
  assert.equal(valor("R$12"), 1200);
  assert.equal(valor("R$12,345.67"), 1234567);
});

test("espaços nas pontas do texto são ignorados", () => {
  assert.equal(valor("  R$699.99\n"), 69999);
});

test("formato brasileiro vira erro, nunca número errado (R$ 1.399,99, R$1.399, 699,99)", () => {
  for (const ruim of ["R$ 1.399,99", "R$1.399,99", "R$1.399", "699,99", "R$1,39"]) {
    assert.equal(valor(ruim), "erro:preco_invalido", ruim);
  }
});

test("texto sem preço válido é erro (vazio, sem R$, centavo incompleto, espaço no meio)", () => {
  for (const ruim of ["", "699.99", "R$", "R$699.9", "R$ 699.99", "R$-5.00", "grátis"]) {
    assert.equal(valor(ruim), "erro:preco_invalido", ruim);
  }
});
