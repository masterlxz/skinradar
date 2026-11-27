# Medição da API do CSFloat (Fase 1, P1)

Roda **no PC do dono**, num terminal real (não na VM, não com `!`: a chave é digitada sem eco).
A chave fica em `~/.config/skinradar/csfloat.key` (fora de qualquer repo) e nunca é impressa.

## O que se mede (todos os endpoints abaixo são HIPÓTESE)

Fonte das hipóteses: clientes não oficiais (`csfloat-rs`, `csfloat_go`, `csfloat-api` no PyPI),
lidos via busca em 2026-11-27. **Não há documentação oficial lida**: `docs.csfloat.com` não resolve
no DNS e `csfloat.com/api` dá 404. Confiança: média nos listings, baixa em histórico e Buy Orders.

| Dado do PRD | Hipótese de endpoint | Pergunta a responder |
|---|---|---|
| Anúncios ativos | `GET /api/v1/listings?market_hash_name=...&limit=5&sort_by=lowest_price` | exige chave? traz float, paint_seed, stickers? preço em centavos, em qual moeda? |
| Vendas recentes | `GET /api/v1/history/{market_hash_name}/sales` | existe? quantas vendas? traz data e float? |
| Buy Orders | `GET /api/v1/listings/{id}/buy-orders?limit=10` | existe? é por anúncio (não por item)? traz restrições? |
| Limites | cabeçalhos `x-ratelimit-*` / `retry-after` | quantas requisições por janela? |

## Passo 1: criar a chave (manual, no site)

Entre no CSFloat, perfil, aba "Developer", e gere uma API key. Anote só para você; não cole no chat.

## Passo 2: bloco autocontido (cole inteiro)

```bash
mkdir -p ~/.config/skinradar ~/skinradar-medicao && chmod 700 ~/.config/skinradar ~/skinradar-medicao
cd ~/skinradar-medicao
[ -s ~/.config/skinradar/csfloat.key ] || { read -rsp "Chave CSFloat: " K; echo; printf '%s' "$K" > ~/.config/skinradar/csfloat.key; unset K; chmod 600 ~/.config/skinradar/csfloat.key; }
KEY="$(cat ~/.config/skinradar/csfloat.key)"
BASE="https://csfloat.com/api/v1"
NAME="AK-47 | Redline (Field-Tested)"

echo "== 1. listings =="
curl -sS -D 1-headers.txt -o 1-listings.json -w "HTTP %{http_code}\n" -H "Authorization: $KEY" \
  --get --data-urlencode "market_hash_name=$NAME" --data-urlencode "limit=5" --data-urlencode "sort_by=lowest_price" "$BASE/listings"
ID="$(grep -o '"id":"[0-9]*"' 1-listings.json | head -1 | grep -o '[0-9]*')"
echo "primeiro id de anúncio: ${ID:-NENHUM}"

echo "== 2. sales history =="
ENC="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$NAME")"
curl -sS -D 2-headers.txt -o 2-sales.json -w "HTTP %{http_code}\n" -H "Authorization: $KEY" "$BASE/history/$ENC/sales"

echo "== 3. buy orders do anúncio =="
curl -sS -D 3-headers.txt -o 3-buyorders.json -w "HTTP %{http_code}\n" -H "Authorization: $KEY" "$BASE/listings/$ID/buy-orders?limit=10"

echo "== 4. sem chave (listings) =="
curl -sS -o 4-sem-chave.json -w "HTTP %{http_code}\n" --get --data-urlencode "market_hash_name=$NAME" --data-urlencode "limit=1" "$BASE/listings"

echo "== limites e tamanhos =="
grep -ihE 'ratelimit|retry-after' 1-headers.txt 2-headers.txt 3-headers.txt
wc -c 1-listings.json 2-sales.json 3-buyorders.json 4-sem-chave.json
```

## Passo 3: o que me devolver

Cole no chat **a saída do bloco** (os `HTTP ...`, os `ratelimit` e os tamanhos) e depois, para cada
arquivo, os primeiros ~40 linhas (`head -c 1500 1-listings.json`, etc.). Os arquivos não contêm a
chave (ela só vai no cabeçalho de requisição, e `-D` grava só os cabeçalhos de resposta). Confira
antes de colar: `grep -c "$KEY" *.json *.txt` deve dar 0 em todos.

## Relatório (medido em 2026-11-27, item `AK-47 | Redline (Field-Tested)`, 1 chamada por endpoint)

Os três endpoints da hipótese responderam `HTTP 200` com a chave. Preços em centavos,
**moeda não informada pela API** (nenhum campo `currency` nas respostas nem nos cabeçalhos). USD é
**inferência, não confirmada**: `reference.base_price` = 2087 bate com ~US$ 20,87 para esse item, e em
reais seria ~US$ 3,80. O dono viu o anúncio `1046142323509036504` (API: `2081`) no site por **R$ 117,62**:
isso descarta reais na API (seria R$ 20,81) e implica ~5,65 R$/US$ no dia (conversão de exibição do site,
cotação não verificada). Falta ver o site com a moeda de exibição em USD (esperado: US$ 20,81). Chave não vazou: 0 ocorrências nos 7 arquivos.

| Dado | Endpoint real | Chave? | Limite (cabeçalho) | Campos úteis vistos | Confiança |
|---|---|---|---|---|---|
| Anúncios ativos | `GET /api/v1/listings?market_hash_name=&limit=&sort_by=` | **Sim** (sem chave: `"You need to be logged in to search listings"`) | 200 (corrigido na rodada 2; a rodada 1 dizia 500 por eu ter lido a ordem do `grep -h`, sem nomes de arquivo) | `price`, `type` (`auction`/`buy_now`), `item.float_value`, `paint_seed`, `stickers`, `reference.base_price`, `reference.predicted_price`, `reference.quantity` | Alta |
| Vendas recentes | `GET /api/v1/history/{market_hash_name}/sales` | Funciona **sem chave** (rodada 2: HTTP 200) | 500 (corrigido na rodada 2; a rodada 1 dizia 200) | 40 itens, todos `state:"sold"`, com `sold_at`, `price`, `type`, `float_value`, `paint_seed`, `reference` | Alta (resposta); média (se `price` de topo é sempre o valor da venda) |
| Buy Orders | `GET /api/v1/listings/{id}/buy-orders?limit=` | Com chave funciona; sem chave **não testado** | **20** | por ordem: `price`, `qty`, `hybrid_properties` (`{}` = genérica; `min_float`/`max_float`; `applied_stickers`) | Média |

### Achados que mudam o desenho

1. **`sort_by=lowest_price` mistura leilão.** 4 dos 5 resultados eram `type:"auction"` (lance atual, ex.: US$ 1,30), não preço de compra. Para o "menor anúncio" é preciso filtrar `buy_now` (parâmetro a descobrir; não testado).
2. **Buy Orders são buscadas por um anúncio do CSFloat (`/listings/{id}/...`).** O item do DashSkins não tem id no CSFloat. Falta medir se a lista devolvida depende do float/stickers daquele anúncio ou é a do item inteiro: chamar 2 anúncios do mesmo nome com floats diferentes e comparar.
3. **O limite de Buy Orders é 20 por janela**, o menor dos três. Uma análise gasta 1 chamada de cada endpoint; a janela (duração) não foi medida (só o `x-ratelimit-reset`).
4. **Ordens genéricas existem e são separáveis**: a maior genérica foi 2040 (US$ 20,40) contra `base_price` 2087; ordens com sticker chegaram a 9000. É exatamente a distinção do PRD 5.3.
5. **Vendas trazem float e paint_seed**, então dá para filtrar vendas por faixa de float (PRD seção 8).
6. **O CSFloat entrega `reference.predicted_price`** (preço previsto por float): é uma quarta referência, fora do PRD, ainda não avaliada.
7. A chave fica só em arquivo local; numa extensão ela irá para `chrome.storage.local` (ver P2).

## Rodada 2 (P7): o que se mede e como interpretar

Roteiro: `lab/medir-csfloat-2.py` (roda com `python3`, lê a chave de `~/.config/skinradar/csfloat.key`,
imprime só campos escolhidos, nunca a chave). Gasta 2 das 20 chamadas de Buy Orders da janela.

| Pergunta | Como o script responde | Leitura |
|---|---|---|
| (b) filtro `buy_now` | `GET /listings?type=buy_now&...` (parâmetro é HIPÓTESE) | todos `buy_now` = filtro existe; vier `auction` = não funciona |
| (a) Buy Orders mudam com o anúncio? | float baixo (`max_float=0.12`) × float alto (`min_float=0.30`): compara as listas | `IDÊNTICAS` = lista é do item inteiro; diferentes = depende do anúncio-âncora |
| (e) `price` de topo das vendas | imprime preço, tipo, data, float das 10 primeiras e min/mediana/máx | valores plausíveis (~US$ 20) = ok |
| (c) sem chave | vendas e Buy Orders sem `Authorization` | 200 = não precisa de chave |
| (d) janela do rate limit | `x-ratelimit-reset` menos o relógio local, por endpoint | segundos até zerar |

### Resultados da rodada 2 (2026-11-27, mesmo item)

| Pergunta | Resultado | Conclusão |
|---|---|---|
| (b) filtro `buy_now` | `type=buy_now` funciona: 5 de 5 `buy_now`, de 2081 a 2144 | **Resolvido.** O menor `buy_now` foi US$ 20,81 (vs. leilões a US$ 1,30 na rodada 1). |
| (a) Buy Orders mudam com o anúncio? | **Não respondido pelo teste**: `max_float=0.12` achou 0 anúncios (Field-Tested só vai de 0,15 a 0,38; erro meu), então só um anúncio (float 0,361, 5 stickers) foi consultado: 16 ordens, a maior 2040 | Indício **forte, mas inferido**: na rodada 1 o anúncio-âncora tinha o sticker 77 e a lista trazia ordens de 9000, 6300 e 6250 exigindo sticker; agora, com limite maior (20 contra 10) e outra âncora, essas ordens sumiram. Se a lista fosse do item inteiro, elas ainda estariam no topo. Hipótese: a API só devolve ordens **compatíveis com o anúncio-âncora**. Confiança média. |
| (e) `price` de topo das vendas | Todas `buy_now`; mínimo 2030, mediana 2856, máximo 27000 | Plausível como valor da venda. A mediana (28,56) fica **acima** do menor anúncio (20,81): as vendas de float baixo (0,15 a 0,21) saem de 31 a 55, as de float alto (0,36) em torno de 22. **O float explica a diferença.** |
| (c) sem chave | vendas: **200**; Buy Orders: **401** | Vendas não exigem chave; listings e Buy Orders exigem. |
| (d) janela | Buy Orders 20 por janela, restavam 57 s depois da chamada (janela de cerca de 1 min, indício); listings 200, restavam 636 s; vendas 500, restavam 71 326 s (cerca de 20 h) | Uma análise gasta 1 chamada de cada: o limite não pesa para uso por clique. Vendas parecem vir em cache (o contador não desceu entre as rodadas). |

Correção: as duas rodadas se contradizem nos limites de listings e vendas (500/200 contra 200/500).
A rodada 2 rotula cada limite pelo endpoint, a rodada 1 foi lida por ordem; vale a rodada 2.

## Rodada 3 (P7a): a lista de Buy Orders depende do anúncio-âncora?

Roteiro: `lab/medir-csfloat-3.py`. Usa a faixa de float real do Field-Tested (0,15 a 0,38).
Escolhe 3 âncoras do mesmo item e compara as listas de Buy Orders (até 3 das 20 chamadas por janela).

| Âncora | Critério |
|---|---|
| `baixo_limpo` | float 0,15 a 0,20, sem sticker |
| `alto_limpo` | float 0,30 a 0,38, sem sticker |
| `com_sticker` | float 0,15 a 0,38, de preferência com o sticker 77 (o da rodada 1) |

| Resultado | Leitura |
|---|---|
| `baixo_limpo x alto_limpo` DIFERENTES, com ordens de faixa de float só num lado | a API filtra pelo float da âncora |
| `com_sticker` com ordens de sticker que as limpas não têm | a API filtra pelos stickers da âncora (confirma P8) |
| tudo IDÊNTICAS | a lista é do item inteiro e o indício da rodada 2 estava errado |

### Resultados da rodada 3 (2026-11-27, Redline Field-Tested)

| Âncora | Float | Stickers | Ordens | Maior genérica | Maior ordem |
|---|---:|---|---:|---:|---:|
| `baixo_limpo` | 0,1942 | nenhum | 24 | 2040 | **3170** (faixa 0,1924 a 0,1972) |
| `alto_limpo` | 0,3368 | nenhum | 16 | 2040 | 2040 |
| `com_sticker` | 0,3610 | 4979, 7296, 7477 | 16 | 2040 | 2040 |

- **A lista de Buy Orders depende do float da âncora (provado).** `baixo_limpo` recebeu 19 ordens com faixa de float que as outras não recebem (de 3170 a 2000); as âncoras de float alto receberam 11 ordens que a de float baixo não recebeu. O servidor devolve só as ordens cuja faixa contém o float da âncora.
- **Ordens por float valem muito.** Para o float 0,194, a melhor saída por Buy Order é 31,70 contra 20,40 da melhor genérica (+55%). Uma análise que ignore o float subestima a revenda de itens de float baixo.
- **Stickers: não provado na rodada 3 (provado na 3b, abaixo).** `com_sticker` ficou **idêntica** a `alto_limpo`, mas nenhum anúncio com o sticker 77 foi encontrado (a âncora tinha 4979, 7296, 7477). Só se sabe que esses três stickers não têm ordens dedicadas. A hipótese de filtro por sticker segue apoiada só nas ordens de 90, 63 e 62,50 da rodada 1.
- **`limit` não é um teto estrito:** pedi 20 e vieram 24. Com muitas ordens por faixa de float, as genéricas baratas ficam de fora da lista (`baixo_limpo` não trouxe as de 100, 176, 400, 1690, 1910 e 1940).
- Há ordens-lixo (preço 3, 5, 46, 80, 100): têm de ser ignoradas por piso ou por mediana, nunca pelo mínimo.
- Rate limit: 19, 18 e 17 restantes de 20, janela de ~50 s depois de cada chamada.

### Rodada 3b (2026-11-27): o sticker também filtra (provado)

Buy Orders do anúncio da rodada 1 (`1046117546102753928`, leilão ainda `listed`, float 0,3468,
stickers 77 e 66): 11 ordens, e entre elas **3 que nenhuma âncora sem esses stickers recebeu**:

| Preço | Qty | Requisito |
|---:|---:|---|
| 9000 | 1 | sticker 66 **na posição 3** (`{'sId': 66, 's': 3}`) |
| 6300 | 1 | sticker 77 (qualquer posição) |
| 6250 | 2 | sticker 77 (qualquer posição) |

O float dessa âncora (0,3468) é parecido com o de `alto_limpo` (0,3368), então a diferença vem dos
stickers. Conclusão: a API devolve só as ordens compatíveis com **float e stickers** da âncora.
Alguns requisitos de sticker fixam a posição (`s`), outros não. Sem aninhar mais: ordens de sticker
só aparecem com uma âncora que tenha aquele sticker, e um item de marketplace não tem âncora própria.
