# SkinRadar — Visão geral

> Última atualização: 2026-11-27 (Sessão 1)

**Status: Fase 1 concluída (medições do CSFloat); Fase 2 em andamento: núcleo, cliente, leitor do card do
DashSkins e orquestrador da análise (2b-2a) prontos; falta a casca da extensão (2b-2b: build, manifest,
service worker, botão, painel, opções) e os adaptadores do RentSkins e do `.gg`.**

## O que é
Extensão de navegador pessoal que, a pedido do usuário (clique), analisa um anúncio de skin de CS2
contra dados do CSFloat e diz se há oportunidade de arbitragem. Requisitos completos em `PRD.md`.

## Decisões já tomadas (Sessão 1, dono)
- Nome `skinradar`, repo independente no workspace.
- Testes: lógica pura (financeiro, classificação, cache, normalização) testada no CI do GitHub;
  DOM e painel testados pelo dono no Chrome local (sem build/teste na VM, ADR 0017 do workspace).
- Chave de API do CSFloat: o dono ainda não tem; criada no PC dele e mantida só lá.

## Stack provisória (a confirmar na Fase 2 com `padrao/dependencias-novas.md`)
Chrome Manifest V3 + TypeScript, sem backend.

## Fases (do PRD, seção 14)
1. Prova de viabilidade: o que o CSFloat realmente entrega (anúncios, vendas, Buy Orders).
2. MVP funcional.
3. Refinamento.
