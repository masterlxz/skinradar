# Fixtures do CSFloat

Respostas **reais** da API, capturadas em 2026-11-27 para `AK-47 | Redline (Field-Tested)`, com a chave do
dono, por `lab/capturar-fixtures.py` (menos `buy-orders-sticker-77-66.json`, da rodada 1 da medição).

**Removido** (pessoas, imagens, textos longos): `seller` (só `statistics` fica), `steam_id`, `avatar`,
`username`, `serialized_inspect`, `gs_sig`, `icon_url`, `description`, `obfuscated_buyer_id`, `contract_id`,
`cs2_screenshot_id`, `asset_id`. Conferido: 0 steam ids e 0 ocorrências da chave. O resto é como a API devolveu.

Preços em **centavos**; a moeda não é informada pela API (USD inferido, ADR 0001 e P3).

| Arquivo | O que é |
|---|---|
| `listings-misto.json` | 5 menores anúncios sem filtro de tipo: 4 `auction` e 1 `buy_now` |
| `listings-buy-now.json` | 8 menores `buy_now` com float de 0,15 a 0,38 |
| `vendas.json` | 15 das 40 vendas mais recentes (`state: sold`) |
| `buy-orders-baixo.json` | ordens para a âncora de float 0,1942 (10 ordens, todas com faixa de float) |
| `buy-orders-alto.json` | ordens para a âncora de float 0,3368 (11 ordens, 7 genéricas) |
| `buy-orders-sticker-77-66.json` | ordens para a âncora de float 0,3468 com stickers 77 e 66 (3 exigem sticker) |
| `ancoras.json` | float, stickers e preço das âncoras acima |

**Forma do corpo:** os arquivos `listings-*.json` guardam só a lista; a API devolve `{"data": [...]}` para
anúncios (vendas e Buy Orders vêm como lista direta). Os testes do cliente reembrulham como a API faz.

O mercado muda: **não regenerar** sem rever os valores esperados dos testes.
