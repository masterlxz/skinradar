import assert from "node:assert/strict";
import { test } from "node:test";
import { validarPedido } from "../../src/extension/mensagens.ts";

const ITEM = {
  marketHashName: "AK-47 | Redline (Field-Tested)",
  priceCents: 8000,
  float: 0.28,
  stickers: ["Sticker | A"],
  tradeLock: { dias: 4 },
};
const PEDIDO = { tipo: "analisar", item: ITEM, forcar: true };

test("pedido válido passa, e só os campos conhecidos do item sobrevivem", () => {
  const extra = { ...PEDIDO, item: { ...ITEM, siteItemId: "abc", lixo: { x: 1 } }, tambem: 1 };
  assert.deepEqual(validarPedido(extra), { tipo: "analisar", item: ITEM, forcar: true });
});

test("'forcar' ausente vale falso; verdadeiro só se for exatamente true", () => {
  const { forcar: _, ...semForcar } = PEDIDO;
  assert.equal(validarPedido(semForcar)?.forcar, false);
  assert.equal(validarPedido({ ...PEDIDO, forcar: "true" }), null);
  assert.equal(validarPedido({ ...PEDIDO, forcar: 1 }), null);
});

test("float nulo (card sem float) e bloqueio nulo ou 'livre' são válidos", () => {
  assert.equal(validarPedido({ ...PEDIDO, item: { ...ITEM, float: null } })?.item.float, null);
  assert.equal(validarPedido({ ...PEDIDO, item: { ...ITEM, tradeLock: null } })?.item.tradeLock, null);
  assert.equal(validarPedido({ ...PEDIDO, item: { ...ITEM, tradeLock: "livre" } })?.item.tradeLock, "livre");
});

test("limites válidos: float 0 e 1, 10 stickers, nome de 200 caracteres, bloqueio de 0 e 3650 dias", () => {
  const ok = (troca: Record<string, unknown>) => validarPedido({ ...PEDIDO, item: { ...ITEM, ...troca } }) !== null;
  assert.equal(ok({ float: 0 }), true);
  assert.equal(ok({ float: 1 }), true);
  assert.equal(ok({ stickers: Array.from({ length: 10 }, () => "S") }), true);
  assert.equal(ok({ marketHashName: "a".repeat(200) }), true);
  assert.equal(ok({ tradeLock: { dias: 0 } }), true);
  assert.equal(ok({ tradeLock: { dias: 3650 } }), true);
  assert.equal(ok({ priceCents: 1 }), true);
});

const INVALIDOS: [string, unknown][] = [
  ["mensagem que não é objeto", "analisar"],
  ["mensagem nula", null],
  ["tipo desconhecido", { ...PEDIDO, tipo: "apagar" }],
  ["sem item", { tipo: "analisar", forcar: false }],
  ["item nulo", { ...PEDIDO, item: null }],
  ["nome vazio", { ...PEDIDO, item: { ...ITEM, marketHashName: "" } }],
  ["nome com 201 caracteres", { ...PEDIDO, item: { ...ITEM, marketHashName: "a".repeat(201) } }],
  ["nome que não é texto", { ...PEDIDO, item: { ...ITEM, marketHashName: 7 } }],
  ["preço zero (evaluateExit lançaria)", { ...PEDIDO, item: { ...ITEM, priceCents: 0 } }],
  ["preço negativo", { ...PEDIDO, item: { ...ITEM, priceCents: -1 } }],
  ["preço fracionário", { ...PEDIDO, item: { ...ITEM, priceCents: 80.5 } }],
  ["preço em texto", { ...PEDIDO, item: { ...ITEM, priceCents: "8000" } }],
  ["preço absurdo (acima de R$ 10 milhões)", { ...PEDIDO, item: { ...ITEM, priceCents: 1_000_000_001 } }],
  ["float acima de 1", { ...PEDIDO, item: { ...ITEM, float: 1.01 } }],
  ["float negativo", { ...PEDIDO, item: { ...ITEM, float: -0.01 } }],
  ["float NaN", { ...PEDIDO, item: { ...ITEM, float: Number.NaN } }],
  ["float ausente (undefined não é null)", { ...PEDIDO, item: { ...ITEM, float: undefined } }],
  ["11 stickers", { ...PEDIDO, item: { ...ITEM, stickers: Array.from({ length: 11 }, () => "S") } }],
  ["sticker que não é texto", { ...PEDIDO, item: { ...ITEM, stickers: [1] } }],
  ["sticker vazio", { ...PEDIDO, item: { ...ITEM, stickers: [""] } }],
  ["sticker com 201 caracteres", { ...PEDIDO, item: { ...ITEM, stickers: ["a".repeat(201)] } }],
  ["stickers que não é lista", { ...PEDIDO, item: { ...ITEM, stickers: "Sticker | A" } }],
  ["bloqueio negativo", { ...PEDIDO, item: { ...ITEM, tradeLock: { dias: -1 } } }],
  ["bloqueio fracionário", { ...PEDIDO, item: { ...ITEM, tradeLock: { dias: 1.5 } } }],
  ["bloqueio de 3651 dias", { ...PEDIDO, item: { ...ITEM, tradeLock: { dias: 3651 } } }],
  ["bloqueio com texto qualquer", { ...PEDIDO, item: { ...ITEM, tradeLock: "bloqueado" } }],
];

for (const [nome, entrada] of INVALIDOS) {
  test(`pedido inválido é recusado (nulo): ${nome}`, () => {
    assert.equal(validarPedido(entrada), null);
  });
}

test("o pedido devolvido é uma cópia: mudar o original depois não muda o validado", () => {
  const entrada = { ...PEDIDO, item: { ...ITEM, stickers: ["Sticker | A"] } };
  const v = validarPedido(entrada);
  entrada.item.stickers.push("Sticker | B");
  assert.deepEqual(v?.item.stickers, ["Sticker | A"]);
});
