# Fixtures do DashSkins

Cards **reais** da listagem do DashSkins.com.br (página em inglês, `/en/`), copiados pelo dono do DevTools
(`outerHTML`) em 2026-11-27.

**Removido para caber no repo** (nada do que o leitor usa): `srcset` das imagens (dezenas de URLs), o `src` das
imagens (trocado por `IMAGEM-REMOVIDA`) e o conteúdo (`<path>`, `<g>`, `<defs>`) dos `<svg>`. Todo o resto,
inclusive as classes, os `href`, os `id` e os `style`, está como o site entregou. Nenhum dado pessoal.

| Arquivo | O que é |
|---|---|
| `card-luvas-ft-bloqueado.html` | Specialist Gloves \| Tiger Strike (Field-Tested), `R$699.99`, float 0.328, "Unlocks in 4 days", sem stickers |
| `card-ak47-asiimov-fn-stickers.html` | AK-47 \| Asiimov (Factory New), `R$1,399.99`, float 0.054, "Withdrawable", 4 stickers |

As classes têm sufixo gerado (`BumpedBackground_bump__eJ288`): o leitor **não** pode depender delas.
Se o site mudar, capture de novo e rode os testes antes de ajustar o leitor.
