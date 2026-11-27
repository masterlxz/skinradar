# ADR 0001: Fontes de dados do CSFloat e escolha do anúncio-âncora

- **Status:** Proposto (2026-11-27), aguardando aprovação do dono.
- **Evidência:** `lab/medir-csfloat.md` (rodadas 1, 2, 3 e 3b), medições reais com a chave do dono, item
  `AK-47 | Redline (Field-Tested)`. A documentação oficial do CSFloat **não foi lida** (`docs.csfloat.com`
  não resolve; `csfloat.com/api` dá 404): os endpoints são **observados, não documentados**.

## Contexto

O PRD (4.2, 5.2 a 5.4) precisa de anúncios ativos, vendas realizadas e Buy Orders do CSFloat para
estimar o preço de saída de uma skin de outro marketplace. Não havia garantia de que os três
existissem na mesma API. Medimos, e eles existem, com estas regras:

| Dado | Endpoint | Chave | Limite |
|---|---|---|---|
| Anúncios | `GET /api/v1/listings` (`type=buy_now`, `min_float`, `max_float`, `sort_by`) | sim | 200 |
| Vendas | `GET /api/v1/history/{market_hash_name}/sales` (40 itens, com float e `sold_at`) | não | 500 |
| Buy Orders | `GET /api/v1/listings/{id}/buy-orders` | sim | 20 por ~1 min |

Preços em centavos. **A API não informa a moeda**; USD é inferência: o site exibiu R$ 117,62 para um anúncio que a API
devolveu como `2081`, o que descarta reais e implica ~5,65 R$/US$, mas falta ver o site em USD (ver
`lab/medir-csfloat.md` e P3). Os valores em dólar deste ADR (20,81, 31,70 etc.) assumem isso. Dois fatos mudam o desenho:

1. **As Buy Orders são buscadas por um anúncio-âncora e a lista só traz as ordens compatíveis com o float
   e com os stickers dele.** Para float 0,194 a melhor ordem foi 31,70 (faixa 0,1924 a 0,1972) contra
   20,40 da melhor genérica. O item analisado vem de outro marketplace e não existe no CSFloat.
2. **O float explica o preço.** A mediana de todas as vendas (28,56) ficou acima do menor `buy_now` (20,81);
   vendas de float 0,15 a 0,21 saíram entre 31 e 55, e as de 0,36 em torno de 22.

## Decisão

1. **Fonte única no MVP:** a API do CSFloat com a chave do usuário, enviada em `Authorization`. Nenhum
   endpoint além dos três acima; nada de scraping do site.
2. **Anúncio-âncora:** o `buy_now` do mesmo `market_hash_name` com o float mais próximo do float do item
   analisado (janela `min_float`/`max_float` de ±0,002, ampliando por passos se não houver). Sem float
   conhecido, a análise de Buy Orders fica "dados insuficientes" em vez de usar uma âncora qualquer.
3. **Filtro local das Buy Orders:** ordens genéricas e de faixa de float entram se o float do item cabe na
   faixa (`min_float` a `max_float`); ordens com `applied_stickers` ficam **separadas** e não contam como
   saída. O painel diz que ordens de faixa estreita ou de sticker podem faltar. Piso configurável contra
   ordens-lixo (vimos preços de 0,03 a 1,00 num item de ~20).
4. **Vendas:** só as de float próximo do item (janela configurável), com tamanho da amostra à vista; amostra
   abaixo de um mínimo (a definir na Fase 2) vira "dados insuficientes". Não usar a mediana por nome.
5. **Menor anúncio:** só `type=buy_now`; leilão (lance atual, ex.: 1,30) nunca é preço de saída.
6. **Uma análise = 1 chamada de listings (âncora e menor anúncio), 1 de vendas e 1 de Buy Orders.** Cache pela
   chave (`market_hash_name`, float arredondado ao milésimo, stickers); respeitar `x-ratelimit-remaining`
   e tratar 429.

## Alternativas descartadas

- **Mediana de vendas por nome, sem float:** medido, enviesa (item de float alto parece caro, o de float
  baixo parece barato).
- **API de terceiros (ex.: CSPriceAPI):** vendas só no plano Enterprise e sem Buy Orders do CSFloat
  (fonte: busca de 2026-11-27, não confirmada na página).
- **Engenharia reversa do tráfego do site:** desnecessária, os três dados saem da API com chave; seria o
  caminho com mais risco de violar os termos.
- **Âncora qualquer (menor preço):** devolve as ordens de outro float e subestima a saída (rodada 3).

## Consequências

- Custo: a análise depende de existir um anúncio `buy_now` perto do float do item; para floats raros pode
  não existir, e então a Buy Order é "sem dados".
- Ordens de sticker ficam fora do MVP; cobri-las exigiria âncora com o mesmo sticker.
- A chave fica visível no navegador do dono (`chrome.storage.local`); aceitável para uso pessoal, não para distribuir.
- Habilita: o motor financeiro e a classificação ficam em módulos puros, alimentados por um objeto
  "mercado" independente do marketplace de origem (PRD 12).

## Não verificado

A moeda dos preços do CSFloat (USD inferido); a conversão para BRL, que entra no lucro e no ROI (P3);
documentação e termos de uso oficiais; outros itens além do Redline FT (comportamento em itens sem
float ou StatTrak/Souvenir); se `limit` tem teto (pedi 20 e vieram 24); janela real de cada limite.
