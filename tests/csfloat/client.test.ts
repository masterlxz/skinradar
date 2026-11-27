import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient, type FetchLike } from "../../src/csfloat/client.ts";
import { fixture } from "../helpers.ts";

const KEY = "chave-de-teste";
const NAME = "AK-47 | Redline (Field-Tested)";
/** Cabeçalhos copiados de uma resposta real de Buy Orders (medição, rodada 1). */
const LIMITES = { "x-ratelimit-limit": "20", "x-ratelimit-remaining": "19", "x-ratelimit-reset": "1795741980" };

function fake(status: number, body: unknown, headers: Record<string, string> = {}) {
  const chamadas: { url: string; headers: Record<string, string> }[] = [];
  const f: FetchLike = async (url, init) => {
    chamadas.push({ url, headers: init.headers });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  };
  return { f, chamadas };
}

test("listings: monta a URL com os filtros e manda a chave sem prefixo 'Bearer'", async () => {
  const { f, chamadas } = fake(200, { data: fixture("listings-buy-now.json") });
  const client = createClient({ apiKey: KEY, fetch: f });
  const r = await client.listings({
    marketHashName: NAME, type: "buy_now", minFloat: 0.15, maxFloat: 0.2, limit: 50, sortBy: "lowest_price",
  });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.length, 8);
  const url = new URL(chamadas[0]?.url ?? "");
  assert.equal(url.origin + url.pathname, "https://csfloat.com/api/v1/listings");
  assert.equal(url.searchParams.get("market_hash_name"), NAME);
  assert.equal(url.searchParams.get("type"), "buy_now");
  assert.equal(url.searchParams.get("min_float"), "0.15");
  assert.equal(url.searchParams.get("max_float"), "0.2");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(url.searchParams.get("sort_by"), "lowest_price");
  assert.equal(chamadas[0]?.headers["Authorization"], KEY);
});

test("vendas: o nome vai codificado no caminho", async () => {
  const { f, chamadas } = fake(200, fixture("vendas.json"));
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(r.ok && r.value.length, 15);
  assert.equal(
    chamadas[0]?.url,
    "https://csfloat.com/api/v1/history/AK-47%20%7C%20Redline%20(Field-Tested)/sales",
  );
});

test("buy orders: caminho com o id do anúncio, limite e leitura dos cabeçalhos de limite", async () => {
  const { f, chamadas } = fake(200, fixture("buy-orders-alto.json"), LIMITES);
  const r = await createClient({ apiKey: KEY, fetch: f }).buyOrders("1046142323509036504", 30);
  assert.equal(r.ok && r.value.length, 11);
  assert.equal(
    chamadas[0]?.url,
    "https://csfloat.com/api/v1/listings/1046142323509036504/buy-orders?limit=30",
  );
  assert.deepEqual(r.rateLimit, { limit: 20, remaining: 19, resetEpoch: 1795741980 });
});

test("401 e 403 viram erro de autenticação", async () => {
  for (const status of [401, 403]) {
    const { f } = fake(status, { code: 1, message: "You need to be logged in to search listings" });
    const r = await createClient({ apiKey: KEY, fetch: f }).listings({ marketHashName: NAME });
    assert.equal(!r.ok && r.error.kind, "auth");
    assert.equal(!r.ok && r.error.status, status);
  }
});

test("404 vira 'nao_encontrado'", async () => {
  const { f } = fake(404, { message: "not found" });
  const r = await createClient({ apiKey: KEY, fetch: f }).buyOrders("1");
  assert.equal(!r.ok && r.error.kind, "nao_encontrado");
});

test("429 vira 'limite' e guarda o retry-after em segundos", async () => {
  const { f } = fake(429, { message: "slow down" }, { "retry-after": "12", ...LIMITES });
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(!r.ok && r.error.kind, "limite");
  assert.equal(!r.ok && r.error.retryAfterSeg, 12);
});

test("500 vira 'http' com o status", async () => {
  const { f } = fake(500, "erro interno");
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(!r.ok && r.error.kind, "http");
  assert.equal(!r.ok && r.error.status, 500);
});

test("falha de rede (fetch rejeita) vira 'rede', sem lançar exceção", async () => {
  const f: FetchLike = async () => {
    throw new TypeError("fetch failed");
  };
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(!r.ok && r.error.kind, "rede");
});

test("200 com corpo que não é JSON vira 'resposta_invalida'", async () => {
  const { f } = fake(200, "<html>Cloudflare</html>");
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(!r.ok && r.error.kind, "resposta_invalida");
});

test("200 com lista vazia é sucesso com zero itens, não erro", async () => {
  const { f } = fake(200, []);
  const r = await createClient({ apiKey: KEY, fetch: f }).sales(NAME);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.length, 0);
});
