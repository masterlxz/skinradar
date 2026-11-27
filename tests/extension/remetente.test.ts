import assert from "node:assert/strict";
import { test } from "node:test";
import { remetenteValido } from "../../src/extension/remetente.ts";

const ID = "abcdefghijklmnopabcdefghijklmnop";

test("mensagem do content script do DashSkins (com ou sem 'www.') é aceita", () => {
  assert.equal(remetenteValido({ id: ID, url: "https://dashskins.com.br/en/skins" }, ID), true);
  assert.equal(remetenteValido({ id: ID, url: "https://www.dashskins.com.br/en/skins?page=2#topo" }, ID), true);
});

const RECUSADOS: [string, Parameters<typeof remetenteValido>[0]][] = [
  ["sem remetente", undefined],
  ["id de outra extensão", { id: "outraextensaooutraextensaooutra", url: "https://dashskins.com.br/" }],
  ["sem id", { url: "https://dashskins.com.br/" }],
  ["sem url (não dá para saber de onde veio)", { id: ID }],
  ["http em vez de https", { id: ID, url: "http://dashskins.com.br/" }],
  ["subdomínio que só começa igual", { id: ID, url: "https://dashskins.com.br.evil.com/" }],
  ["domínio que só termina igual", { id: ID, url: "https://notdashskins.com.br/" }],
  ["outro domínio com o DashSkins na query", { id: ID, url: "https://evil.com/?https://dashskins.com.br/" }],
  ["usuário e senha na url para enganar", { id: ID, url: "https://dashskins.com.br@evil.com/" }],
  ["porta diferente da padrão", { id: ID, url: "https://dashskins.com.br:8443/" }],
  ["outro subdomínio do DashSkins", { id: ID, url: "https://api.dashskins.com.br/" }],
  ["página da própria extensão", { id: ID, url: `chrome-extension://${ID}/opcoes.html` }],
  ["url ilegível", { id: ID, url: "isto não é uma url" }],
  ["url vazia", { id: ID, url: "" }],
];

for (const [nome, sender] of RECUSADOS) {
  test(`mensagem recusada: ${nome}`, () => {
    assert.equal(remetenteValido(sender, ID), false);
  });
}

test("'dashskins.com' (outro país) não vale: só o domínio .com.br do manifest", () => {
  assert.equal(remetenteValido({ id: ID, url: "https://dashskins.com/" }, ID), false);
});
