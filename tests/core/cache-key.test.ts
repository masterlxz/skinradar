import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheKey } from "../../src/core/cache-key.ts";

const base = { marketHashName: "AK-47 | Redline (Field-Tested)", float: 0.1942, stickers: [] };

test("mesma skin, mesmo float e mesmos stickers dão a mesma chave", () => {
  assert.equal(cacheKey(base), cacheKey({ ...base }));
});

test("floats no mesmo milésimo dão a mesma chave (0,1941 e 0,1944)", () => {
  assert.equal(cacheKey({ ...base, float: 0.1941 }), cacheKey({ ...base, float: 0.1944 }));
});

test("floats em milésimos diferentes dão chaves diferentes (0,1944 e 0,1946)", () => {
  assert.notEqual(cacheKey({ ...base, float: 0.1944 }), cacheKey({ ...base, float: 0.1946 }));
});

test("a ordem dos stickers não muda a chave", () => {
  const a = cacheKey({ ...base, stickers: [{ id: 77 }, { id: 66, slot: 3 }] });
  const b = cacheKey({ ...base, stickers: [{ id: 66, slot: 3 }, { id: 77 }] });
  assert.equal(a, b);
});

test("sticker diferente, ou na posição diferente, muda a chave", () => {
  const um = cacheKey({ ...base, stickers: [{ id: 66, slot: 3 }] });
  assert.notEqual(um, cacheKey({ ...base, stickers: [{ id: 66, slot: 1 }] }));
  assert.notEqual(um, cacheKey({ ...base, stickers: [{ id: 77, slot: 3 }] }));
  assert.notEqual(um, cacheKey(base));
});

test("nome diferente muda a chave", () => {
  assert.notEqual(cacheKey(base), cacheKey({ ...base, marketHashName: "AK-47 | Redline (Minimal Wear)" }));
});
