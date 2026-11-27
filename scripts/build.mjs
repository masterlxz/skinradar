// Gera `dist/`, a pasta que o Chrome carrega ("Carregar sem compactação"). Roda só no PC do dono (ADR 0017).
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: {
    background: "src/extension/background.ts",
    content: "src/extension/content.ts",
    opcoes: "src/extension/opcoes.ts",
  },
  bundle: true,
  // Um arquivo por ponto de entrada, sem módulos: o content script do MV3 não carrega ES modules.
  format: "iife",
  platform: "browser",
  target: "chrome120",
  outdir: "dist",
  legalComments: "none",
  logLevel: "info",
});

cpSync("extension/manifest.json", "dist/manifest.json");
cpSync("extension/opcoes.html", "dist/opcoes.html");
console.log("dist/ pronto: no Chrome, chrome://extensions > Modo do desenvolvedor > Carregar sem compactação > dist");
