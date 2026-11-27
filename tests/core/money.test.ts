import assert from "node:assert/strict";
import { test } from "node:test";
import { usdCentsToBrlCents } from "../../src/core/money.ts";

test("US$ 20,81 a 5,65 vira R$ 117,58 (11758 centavos)", () => {
  assert.equal(usdCentsToBrlCents(2081, 5.65), 11758);
});

test("meio centavo arredonda para cima (3 centavos a 2,5 dá 8)", () => {
  assert.equal(usdCentsToBrlCents(3, 2.5), 8);
});

test("cotação zero, negativa ou infinita é erro", () => {
  assert.throws(() => usdCentsToBrlCents(2081, 0), RangeError);
  assert.throws(() => usdCentsToBrlCents(2081, -5.65), RangeError);
  assert.throws(() => usdCentsToBrlCents(2081, Number.POSITIVE_INFINITY), RangeError);
});

test("centavos não inteiros são erro", () => {
  assert.throws(() => usdCentsToBrlCents(20.81, 5.65), RangeError);
});
