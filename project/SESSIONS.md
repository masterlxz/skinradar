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
- **2b-2a (PR #6, branch `fase-2b2a-orquestrador`)**: orquestrador puro `src/analysis` (`config.ts`, `cache.ts`,
  `analisar.ts`): liga o item lido, o cliente do CSFloat e o núcleo, e devolve o resultado do painel
  (3 saídas em reais separadas, classificação, avisos, erro por fonte). A 2b-2 foi dividida: esta fatia não
  tem DOM, build nem `chrome.*`; a casca (esbuild, manifest, service worker, painel, opções) é a 2b-2b.
  Decisões do dono: fatia 2b-2a primeiro; esbuild e `chrome.storage.local` com página de opções na 2b-2b
  (esbuild ainda passa pela avaliação de dependência); âncora = a mais próxima entre os listings já baixados,
  sem chamada extra, com aviso acima de 0,002 (**ajusta a decisão 2 do ADR 0001**, que previa janela de ±0,002
  ampliando por passos). Config sem padrão para taxa, cotação, janela de float, piso e validade do cache (P9, P3,
  P11); padrões só ROI 15%, mínimo 5 vendas, custos 0. O cache guarda os dados do CSFloat, não a conclusão
  (preço de compra e taxa mudam sem rede), e não guarda análise com fonte falha (P17). Dois cliques seguidos
  dividem uma busca só (registro síncrono da promessa em voo). `ItemParaAnalise` desacopla do marketplace.
  Testes primeiro: no CI do rascunho o typecheck quebrou (módulo inexistente, `npm test` nem rodou); depois
  **151 de 151** (55 novos). Mutação: **70 de 70** (M40 a M70 novas, conferidas pelo nome; M44, M50, M52, M63,
  M67 e M68 derrubaram também testes extras). **Erro meu**: `criarAnalisador` devolvia `{ analisar }` e os testes
  esperavam a função; só o typecheck do CI mostrou.
- **Não verificado (2b-2a)**: nenhuma execução contra a API real (só fixtures de 2026-11-27, Redline FT); a
  fronteira exata de 0,002 da âncora distante não tem teste; `priceCents` inválido (não positivo) faria
  `evaluateExit` lançar; só o leitor do DashSkins foi cruzado com o orquestrador.
- **2b-2b (PR #7, branch `fase-2b2b-partes-puras`)**: partes puras da casca, testáveis no CI sem Chrome.
  `src/ui/formatar.ts` (R$/US$/%/float/idade, manual, sem `Intl` por causa do NBSP), `src/ui/textos.ts`,
  `src/ui/painel.ts` (`renderPainel` e `renderEstado`, só `textContent`; teste lê o código e recusa `innerHTML`),
  `src/extension/mensagens.ts` (`validarPedido`, fronteira de confiança do service worker; fecha o risco do
  `priceCents` não positivo) e a porta `Armazem` no cache, com chave versionada `v1|` e validação do que volta do
  armazenamento. Decisões do dono: só `dashskins.com.br` na 1ª versão; cache em `chrome.storage.session`; divisão
  2b-2b (puro) e 2b-2c (esbuild, manifest, service worker, content script, opções); "siga a recomendação" nas
  duas perguntas (atualização forçada que falha apaga a entrada velha; textos como escritos).
  Testes primeiro: no CI do rascunho o typecheck quebrou (4 módulos inexistentes); depois **233 de 233**
  (82 novos). Mutação: **111 de 111** (M71 a M111 novas, conferidas pelo nome).
  **Avaliação do esbuild** (para a 2b-2c, medida no registro em 2026-11-27): 0.28.2, MIT, 1 mantenedor no registro,
  última release 2026-08-08, ~420 mi downloads/semana, 0 avisos no OSV, sem dependência JS (binário por plataforma
  opcional; `postinstall` existe e o `npm ci --ignore-scripts` do CI não o roda), pré-1.0. Veredito provisório:
  adotar com ressalva (versão fixa no lockfile, script fino por cima), confiança média. Alternativas: `tsc`
  emitindo módulos (content script do MV3 não carrega ES modules), Rollup (4 mantenedores, mas pede plugin de
  TypeScript), WXT (~25 dependências). A decisão final e o `package.json` ficam para a 2b-2c.
  **Problemas do caminho**: (1) o hook `guard-heavy` barrou um heredoc cujo corpo de PR tinha a palavra `npm test`
  (usar `Write` + `--body-file`); (2) o workflow `Mutação` morreu calado (SIGTERM, código 143) quando a M111
  atribuía `innerHTML` com HTML malicioso no `linkedom`, duas vezes; a M111 passou a só provar o teste que lê o
  código, e o `scripts/mutacao.py` ganhou limite de 120 s por rodada e uma linha de progresso por mutação;
  (3) M46 e M90 saíram inválida e sobrevivente: a M90 só foi pega depois de um caso corrompido que isola o campo
  `listings` (os outros campos já recusavam o objeto vazio).
- **Não verificado (2b-2b)**: o painel nunca foi desenhado num navegador real (só no `linkedom`); o limite de ~10 MB do
  `chrome.storage.session` e o formato real do que ele devolve; o CSS; o comportamento do `innerHTML` malicioso só é
  guardado pelo teste do HTML malicioso, sem mutação equivalente.
