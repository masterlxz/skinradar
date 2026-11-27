# Log de sessões

> Última atualização: 2026-11-27 (Sessão 1)

### 2026-11-27 — Sessão 1

- **Objetivo**: registrar o projeto a partir do PRD do dono e planejar a Fase 1.
- **Decisões do dono**: nome `skinradar`; sem chave do CSFloat ainda (roteiro para criar no PC
  dele); lógica pura testada no CI e UI testada por ele no Chrome.
- **Feito**: repo criado (`git init`, branch `main`), PRD gravado em `project/PRD.md`, esqueleto de
  `project/` (OVERVIEW, PENDING, SESSIONS). Nenhum código.
- **Procurar pronto (2026-11-27)**: extensão oficial `csfloat/extension` (MIT, só float/seed, não
  compara mercado); BetterFloat (20+ marketplaces, preço unificado e análise de stickers; README não
  cita DashSkins nem RentSkins, nem histórico de vendas, Buy Orders ou ROI; licença CC BY-NC-SA 4.0
  e o repo "não contém mais o código completo", então não serve de base); Riftwalk (GPL-3.0,
  inventário/trade). Clientes não oficiais da API: `csfloat-rs`, `csfloat_go`, `csfloat-api` (PyPI).
  Nenhum faz a análise do PRD (clique → vendas + Buy Orders + lucro/ROI): criar é válido.
- **Documentação oficial**: não lida. `docs.csfloat.com` não resolve (DNS) e `csfloat.com/api` dá 404.
  Endpoints de listings, histórico e Buy Orders são **hipótese** vinda de clientes da comunidade.
- **Feito também**: `lab/medir-csfloat.md` (roteiro para o PC do dono, com a chave fora do repo).
- **Medições (dono rodou nesta máquina, 3 rodadas, item Redline FT)**: listings, histórico de vendas e
  Buy Orders respondem com chave (vendas também sem); `type=buy_now` filtra leilão; a lista de Buy
  Orders depende do **float** da âncora (provado) e do sticker (provado na rodada 3b); limites: listings 200,
  vendas 500, Buy Orders 20 por ~1 min. Relatório completo em `lab/medir-csfloat.md`.
- **Erros meus corrigidos**: limites de listings/vendas trocados na rodada 1 (lidos pela ordem do
  `grep -h`); `max_float=0.12` inválido para Field-Tested na rodada 2.
- **Feito**: ADR 0001 escrito como **proposto** (`adr/0001-fontes-de-dados-csfloat.md`), aguardando o dono.
- **Decisão do dono**: repo **público** (`masterlxz/skinradar`). Sobre o ADR 0001, o dono cogitou HTML
  no lugar da API (preço em real, limites, dados que faltariam); medi os campos da API (75 em listings,
  52 em vendas) e ela cobre o que o PRD pede, só não traz real. Dono aceitou: API como fonte,
  cotação USD→BRL nas configurações, HTML só dos marketplaces de origem. **ADR 0001 Aceito.**
  Licença **MIT** (mesmo titular do `kin`).
- **Feito também**: repo criado, `.github/` (template de PR e `guard`, do `padrao/`), PR #1 (fundação,
  `guard` verde, mesclado em `d288ccf`), ruleset `protect-main` ligado (ativo, `guard` obrigatório),
  secret scanning, push protection e alertas do Dependabot ligados.
- **Fase 2a (PR #3, branch `fase-2a-nucleo`)**: núcleo puro (`src/core`: money, anchor, orders, sales,
  profit, classify, cache-key) e cliente do CSFloat (`src/csfloat`), com `node:test` e `typescript`
  7.0.2 (+ `@types/node` 24.19.4, só tipos). Decisões do dono: ROI mínimo 15% (moderada de 7,5%),
  mínimo de 5 vendas, regra de "referência inflacionada" (lucro só contra o menor anúncio) e distinção
  baixa liquidez × dados insuficientes. Testes primeiro: no CI, antes de implementar, 46 falharam e 3
  arquivos quebraram ao carregar (as 22 asserções deles só rodaram depois); depois, **68 de 68 passam**
  (Node 24.22.3). **Mutação planejada, conferida pelo nome: 28 de 28 derrubaram os testes previstos**
  (`scripts/mutacao.py`, workflow `Mutação`); a M03 foi trocada por ser recusada pelo compilador.
- **Não verificado**: Node/CI só leram as fixtures de 2026-11-27 (Redline FT); taxa oficial (P9); `limit`
  do endpoint de Buy Orders (P10); a janela de float das vendas (P11); nada de DOM, extensão ou build.
- **Cards do DashSkins (dono colou 2, 2026-11-27)**: luvas FT com bloqueio de troca ("Unlocks in 4 days") e
  AK-47 Asiimov FN com 4 stickers ("Withdrawable"). Achados: nome exato no `href` do link do Steam; float no
  marcador da barra (`left: 5.48621%` = 0,0548621; o texto `0.054` trunca); preço `R$1,399.99` (vírgula de
  milhar, ponto decimal, em inglês); id do item de 24 hex no `href` e no `id` do botão; stickers só como
  `alt` com o **nome**; classes com sufixo gerado (CSS Modules), então nada de seletor por classe.
- **Decisões do dono (2b)**: stickers: segmentar vendas e avisar; bloqueio de troca: analisar e avisar;
  idioma: só inglês por enquanto; item limpo com menos de 5 vendas limpas: "baixa liquidez" (sem cair na mistura).
- **P12 resolvida (PR #4, branch `p12-vendas-por-sticker`)**: `summarizeSales` compara item com sticker só com
  vendas com sticker (e o limpo só com limpas); `cacheKey` usa nomes de sticker (JSON, repetição conta);
  `Sale.stickerCount`. Testes primeiro: no CI do rascunho, 75 testes, 66 passaram e 9 falharam por asserção;
  depois **75 de 75**. Mutação: **31 de 31** (M29 a M31 novas; M20 e M22 reescritas). Valores esperados
  recalculados das 15 vendas da fixture. **Achado**: das 40 vendas reais da API, **31 têm sticker e 9 não**,
  e as 40 cobrem ~10 h; item limpo cai quase sempre em "baixa liquidez" (P13).
- **PR B (PR #5, branch `adaptador-dashskins-card`)**: leitor do card do DashSkins (`src/adapters/dashskins`:
  `findCards`, `readCard`, `parseBrlPrice`), com `linkedom` 0.18.15 só nos testes (ISC, 20 pacotes, 0 avisos OSV,
  não executa JavaScript; escolhido pelo dono sobre jsdom e happy-dom). Fixtures: os 2 cards reais, sem
  `srcset` nem conteúdo de SVG. Testes primeiro: no CI do rascunho, 96 testes, 79 passaram e 17 falharam
  (4 testes novos já passavam por artefato do esboço); depois **96 de 96**. Mutação: **39 de 39** (M32 a M39
  novas). **Defeito achado pelo CI**: `card.textContent` cola os textos sem separador ("RifleWithdrawable"),
  então `\bWithdrawable\b` não casava; corrigido lendo cada `<span>` isolado (o mesmo erro ocorreria no
  navegador). Preço só no formato inglês (`R$1,399.99`); `R$ 1.399,99` vira erro, nunca número errado.
- **Não verificado**: só 2 cards (luvas FT e AK-47 FN), 1 idioma e 2 categorias; facas, agentes, adesivos,
  StatTrak, Souvenir, itens sem float, chaveiros e o português não foram vistos (P15); o parser do `linkedom`
  não é o do navegador, o teste real é o Chrome do dono na 2b-2.
- **Próximo**: mesclar o PR #5; plano da 2b-2 (botão, painel, service worker, manifest, build), que ainda
  precisa da aba Network da listagem, da rolagem e de um card do RentSkins.
- **Não verificado**: documentação oficial; outros itens além do Redline FT; a chave está
  em `~/.config/skinradar/csfloat.key` nesta máquina (confirmar se é PC ou VM).
