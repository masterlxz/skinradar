import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseHTML } from "linkedom";

const ler = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");
const manifest = () => JSON.parse(ler("extension/manifest.json")) as Record<string, any>;
const opcoes = () => parseHTML(ler("extension/opcoes.html")).document as unknown as Document;

// ---------- manifest.json: o contrato de permissões ----------

test("manifest: Manifest V3, nome e versão", () => {
  const m = manifest();
  assert.equal(m["manifest_version"], 3);
  assert.equal(m["name"], "SkinRadar");
  assert.match(String(m["version"]), /^\d+\.\d+\.\d+$/);
});

test("manifest: a única permissão é 'storage' e o único host é o CSFloat", () => {
  const m = manifest();
  assert.deepEqual(m["permissions"], ["storage"]);
  assert.deepEqual(m["host_permissions"], ["https://csfloat.com/*"]);
});

test("manifest: o content script roda só no DashSkins .com.br, no mundo isolado, só no frame principal", () => {
  const cs = manifest()["content_scripts"] as Record<string, unknown>[];
  assert.equal(cs.length, 1);
  assert.deepEqual(cs[0]?.["matches"], ["https://dashskins.com.br/*", "https://www.dashskins.com.br/*"]);
  assert.deepEqual(cs[0]?.["js"], ["content.js"]);
  assert.equal(cs[0]?.["run_at"], "document_idle");
  assert.notEqual(cs[0]?.["world"], "MAIN");
  assert.notEqual(cs[0]?.["all_frames"], true);
});

test("manifest: service worker, página de opções em aba e ícone que abre as opções", () => {
  const m = manifest();
  assert.equal(m["background"]?.["service_worker"], "background.js");
  assert.deepEqual(m["options_ui"], { page: "opcoes.html", open_in_tab: true });
  assert.equal(typeof m["action"]?.["default_title"], "string");
});

test("manifest: nada que amplie a superfície (sem <all_urls>, recursos expostos, externally_connectable, CSP própria)", () => {
  const m = manifest();
  const bruto = JSON.stringify(m);
  assert.equal(bruto.includes("all_urls"), false);
  assert.equal(bruto.includes("*://*/*"), false);
  for (const chave of ["web_accessible_resources", "externally_connectable", "content_security_policy", "optional_permissions", "optional_host_permissions"]) {
    assert.equal(chave in m, false, chave);
  }
});

// ---------- build ----------

test("build: o script gera os arquivos que o manifest cita e copia o manifest e a página de opções", () => {
  const build = ler("scripts/build.mjs");
  for (const entrada of ["src/extension/background.ts", "src/extension/content.ts", "src/extension/opcoes.ts"]) {
    assert.ok(build.includes(entrada), entrada);
  }
  for (const arquivo of ["extension/manifest.json", "extension/opcoes.html"]) {
    assert.ok(build.includes(arquivo), arquivo);
  }
  assert.match(build, /format:\s*"iife"/);
  assert.match(build, /outdir:\s*"dist"/);
});

test("package.json: esbuild com versão exata como dependência de desenvolvimento, e o script 'build'", () => {
  const pkg = JSON.parse(ler("package.json")) as Record<string, any>;
  assert.equal(pkg["devDependencies"]?.["esbuild"], "0.28.2");
  assert.equal(pkg["scripts"]?.["build"], "node scripts/build.mjs");
  assert.equal("dependencies" in pkg, false);
});

// ---------- opcoes.html ----------

const CAMPOS = ["chave", "cotacaoUsdBrl", "taxaPct", "custosReais", "roiMinPct", "janelaFloat", "minVendas", "pisoBuyOrderUsd", "validadeMin"];

test("opções: cada campo do formulário tem um <input> com o mesmo id e um <label for>", () => {
  const doc = opcoes();
  for (const id of CAMPOS) {
    assert.equal(doc.getElementById(id)?.tagName, "INPUT", id);
    const rotulo = doc.querySelector(`label[for="${id}"]`);
    assert.ok((rotulo?.textContent ?? "").trim().length > 0, `label de ${id}`);
  }
});

test("opções: a chave é um campo de senha sem preenchimento automático; os demais são texto", () => {
  const doc = opcoes();
  assert.equal(doc.getElementById("chave")?.getAttribute("type"), "password");
  assert.equal(doc.getElementById("chave")?.getAttribute("autocomplete"), "off");
  for (const id of CAMPOS.filter((c) => c !== "chave")) {
    assert.equal(doc.getElementById(id)?.getAttribute("type"), "text", id);
  }
});

test("opções: áreas de estado e de aviso da chave, anunciadas a leitores de tela", () => {
  const doc = opcoes();
  assert.equal(doc.getElementById("estado")?.getAttribute("role"), "status");
  assert.ok(doc.getElementById("estado-chave") !== null);
});

test("opções: um único <script> externo (opcoes.js), sem JavaScript inline nem handlers no HTML", () => {
  const doc = opcoes();
  const scripts = Array.from(doc.querySelectorAll("script"));
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0]?.getAttribute("src"), "opcoes.js");
  assert.equal((scripts[0]?.textContent ?? "").trim(), "");
  assert.equal(/\son[a-z]+\s*=/i.test(ler("extension/opcoes.html")), false);
});

test("opções: página em português, com charset e um formulário com botão de salvar", () => {
  const doc = opcoes();
  assert.equal(doc.documentElement.getAttribute("lang"), "pt-BR");
  assert.equal(doc.querySelector("meta[charset]")?.getAttribute("charset")?.toLowerCase(), "utf-8");
  assert.equal(doc.querySelectorAll("form").length, 1);
  assert.ok(doc.querySelector('form button[type="submit"]') !== null);
});
