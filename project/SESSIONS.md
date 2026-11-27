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
- **Próximo**: HTML de um card real do DashSkins (ou RentSkins) e plano da Fase 2.
- **Não verificado**: documentação oficial; outros itens além do Redline FT; a chave está
  em `~/.config/skinradar/csfloat.key` nesta máquina (confirmar se é PC ou VM).
