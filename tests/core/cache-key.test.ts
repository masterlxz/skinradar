import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheKey } from "../../src/core/cache-key.ts";

const NIKO = "Sticker | NiKo (Gold) | Paris 2023";
const G2 = "Sticker | G2 Esports (Gold) | Paris 2023";
const base = { marketHashName: "AK-47 | Asiimov (Factory New)", float: 0.0548621, stickers: [] as string[] };

test("mesma skin, mesmo float e mesmos stickers dão a mesma chave", () => {
  assert.equal(cacheKey({ ...base, stickers: [NIKO, G2] }), cacheKey({ ...base, stickers: [NIKO, G2] }));
});

test("floats no mesmo milésimo dão a mesma chave (0,0541 e 0,0544)", () => {
  assert.equal(cacheKey({ ...base, float: 0.0541 }), cacheKey({ ...base, float: 0.0544 }));
});

test("floats em milésimos diferentes dão chaves diferentes (0,0544 e 0,0546)", () => {
  assert.notEqual(cacheKey({ ...base, float: 0.0544 }), cacheKey({ ...base, float: 0.0546 }));
});

test("a ordem dos stickers não muda a chave", () => {
  assert.equal(cacheKey({ ...base, stickers: [NIKO, G2] }), cacheKey({ ...base, stickers: [G2, NIKO] }));
});

test("nome de sticker diferente muda a chave", () => {
  assert.notEqual(cacheKey({ ...base, stickers: [NIKO] }), cacheKey({ ...base, stickers: [G2] }));
  assert.notEqual(cacheKey({ ...base, stickers: [NIKO] }), cacheKey(base));
});

test("o mesmo sticker 3 vezes difere de 1 vez (3 G2 contra 1 G2)", () => {
  assert.notEqual(
    cacheKey({ ...base, stickers: [G2, G2, G2] }),
    cacheKey({ ...base, stickers: [G2] }),
  );
});

test("nome diferente muda a chave", () => {
  assert.notEqual(cacheKey(base), cacheKey({ ...base, marketHashName: "AK-47 | Asiimov (Field-Tested)" }));
});
