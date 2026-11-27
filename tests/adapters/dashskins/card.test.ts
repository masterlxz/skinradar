import assert from "node:assert/strict";
import { test } from "node:test";
import { findCards, readCard } from "../../../src/adapters/dashskins/card.ts";
import { htmlDashskins, pagina, raizDoCard, unwrap } from "../../helpers.ts";

const luvas = htmlDashskins("card-luvas-ft-bloqueado.html");
const ak = htmlDashskins("card-ak47-asiimov-fn-stickers.html");

const ler = (html: string) => readCard(raizDoCard(html));
const erro = (html: string) => {
  const r = ler(html);
  return r.ok ? "ok" : r.error.kind;
};

/** Os trechos trocados abaixo existem nas fixtures; o teste falha se o HTML mudar e a troca não casar. */
function trocar(html: string, de: string | RegExp, para: string): string {
  const novo = html.replace(de, para);
  assert.notEqual(novo, html, `a troca de ${String(de)} não encontrou nada`);
  return novo;
}

test("achar cards: a página com 2 cards acha 2, cada um pelo botão do carrinho", () => {
  const cards = findCards(pagina(`<div class="grade">${luvas}${ak}</div>`));
  assert.equal(cards.length, 2);
  for (const c of cards) assert.equal(c.querySelectorAll("h1").length, 1, "a raiz do card é o card, não a grade");
  assert.equal(cards[0]?.querySelector("h1")?.textContent, "Specialist Gloves | Tiger Strike");
  assert.equal(cards[1]?.querySelector("h1")?.textContent, "AK-47 | Asiimov");
});

test("achar cards: página sem cards devolve lista vazia", () => {
  assert.deepEqual(findCards(pagina("<div><p>nada aqui</p></div>")), []);
});

test("luvas FT bloqueadas: todos os campos do card real", () => {
  assert.deepEqual(unwrap(ler(luvas)), {
    siteItemId: "6b0472ebb48b53fc6dd4d23e",
    marketHashName: "★ Specialist Gloves | Tiger Strike (Field-Tested)",
    priceCents: 69999,
    float: 0.328844,
    floatSource: "marcador",
    stickers: [],
    tradeLock: { dias: 4 },
  });
});

test("AK-47 Asiimov FN com 4 stickers: todos os campos do card real", () => {
  assert.deepEqual(unwrap(ler(ak)), {
    siteItemId: "6af0c24034f8b49652bec9c4",
    marketHashName: "AK-47 | Asiimov (Factory New)",
    priceCents: 139999,
    float: 0.0548621,
    floatSource: "marcador",
    stickers: [
      "Sticker | NiKo (Gold) | Paris 2023",
      "Sticker | G2 Esports (Gold) | Paris 2023",
      "Sticker | G2 Esports (Gold) | Paris 2023",
      "Sticker | G2 Esports (Gold) | Paris 2023",
    ],
    tradeLock: "livre",
  });
});

test("nome vem do link do Steam, com ★ (e não do h1, que não tem ★ nem exterior)", () => {
  const nome = unwrap(ler(luvas)).marketHashName;
  assert.ok(nome.startsWith("★ "));
  assert.ok(nome.endsWith("(Field-Tested)"));
});

test("link do Steam codificado com %: o nome sai decodificado", () => {
  const html = trocar(
    luvas,
    "730/★ Specialist Gloves | Tiger Strike (Field-Tested)",
    "730/%E2%98%85%20Specialist%20Gloves%20%7C%20Tiger%20Strike%20(Field-Tested)",
  );
  assert.equal(unwrap(ler(html)).marketHashName, "★ Specialist Gloves | Tiger Strike (Field-Tested)");
});

test("StatTrak™ no link do Steam é preservado no nome", () => {
  const html = trocar(ak, "730/AK-47 | Asiimov (Factory New)", "730/StatTrak™ AK-47 | Asiimov (Factory New)");
  assert.equal(unwrap(ler(html)).marketHashName, "StatTrak™ AK-47 | Asiimov (Factory New)");
});

test("o preço lido é o do strong, não o sugerido (69999 e não 73986)", () => {
  const r = unwrap(ler(luvas));
  assert.equal(r.priceCents, 69999);
  assert.notEqual(r.priceCents, 73986);
});

test("float do marcador: 0,0548621 e não 0,054 do texto", () => {
  const r = unwrap(ler(ak));
  assert.equal(r.float, 0.0548621);
  assert.equal(r.floatSource, "marcador");
});

test("sem marcador na barra, o float vem do texto (0.328) e a origem diz 'texto'", () => {
  const r = unwrap(ler(trocar(luvas, ' style="left: 32.8844%;"', "")));
  assert.equal(r.float, 0.328);
  assert.equal(r.floatSource, "texto");
});

test("sem marcador e sem texto, o float é null e o card ainda é lido", () => {
  const html = trocar(trocar(luvas, ' style="left: 32.8844%;"', ""), '<span class="text-caption-2">0.328</span>', "");
  const r = unwrap(ler(html));
  assert.equal(r.float, null);
  assert.equal(r.floatSource, null);
  assert.equal(r.priceCents, 69999);
});

test("sem a barra de float (item sem float): float null", () => {
  const html = trocar(luvas, /<a href="\/en\/item\/[^"]*"><div class="flex items-center gap-x-2\.5.*?<\/a>/s, "");
  const r = unwrap(ler(html));
  assert.equal(r.float, null);
});

test("bloqueio: 'Unlocks in 4 days' dá 4 dias; 'Withdrawable' dá livre; texto estranho dá null", () => {
  assert.deepEqual(unwrap(ler(luvas)).tradeLock, { dias: 4 });
  assert.equal(unwrap(ler(ak)).tradeLock, "livre");
  assert.equal(unwrap(ler(trocar(luvas, "Unlocks in 4 days", "Em breve"))).tradeLock, null);
});

test("sem o link do Steam o nome não é adivinhado: erro 'sem_nome'", () => {
  const html = trocar(luvas, /<a target="_blank"[^>]*>.*?<\/a>/s, "");
  assert.equal(erro(html), "sem_nome");
});

test("sem o strong do preço: erro 'sem_preco' (o sugerido não vale como preço)", () => {
  const html = trocar(luvas, /<strong[^>]*>R\$699\.99<\/strong>/, "");
  assert.equal(erro(html), "sem_preco");
});

test("preço no formato brasileiro: erro 'preco_invalido', nunca um valor errado", () => {
  assert.equal(erro(trocar(luvas, "R$699.99", "R$ 699,99")), "preco_invalido");
});

test("sem id do item (nem no link nem no botão): erro 'sem_id'", () => {
  const html = trocar(
    trocar(luvas, /\/en\/item\/[a-z0-9-]*\/6b0472ebb48b53fc6dd4d23e/g, "/en/outra-coisa"),
    /id="item-card-6b0472ebb48b53fc6dd4d23e-[a-z-]*"/g,
    "",
  );
  assert.equal(erro(html), "sem_id");
});
