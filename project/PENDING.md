# Pendências do projeto

> Resolvidas e não resolvidas, com ID único. Ao resolver, marcar `✅ Resolvida` com a sessão.
>
> Última atualização: 2026-11-27 (Sessão 1)

## Não resolvidas

| ID | Item | Origem | Prioridade |
|---|---|---|---|
| P1 | **(parcial, Sessão 1: listings, histórico e Buy Orders respondem 200 com chave; ver P7 e o relatório do lab; documentação oficial segue não lida)** **Quais dados o CSFloat entrega oficialmente** (anúncios ativos, vendas recentes, Buy Orders, float/pattern/stickers), com chave, limite de requisições e exemplo real. Medir antes de planejar a extensão. Roteiro: `lab/medir-csfloat.md` (a escrever) | PRD 4.2 / 14 (Sessão 1) | Alta |
| P2 | **Chave de API do CSFloat**: o dono ainda não tem; criar no PC dele, guardar fora do git e da VM | Sessão 1 | Alta |
| P3 | **Moeda**: (a) a API do CSFloat não informa a moeda; USD é inferência (2087 = ~US$ 20,87 num item desse preço), **consistente, falta confirmar**: o site mostrou **R$ 117,62** para o anúncio `1046142323509036504` (API: `2081`), o que descarta reais na API e dá uma razão implícita de ~5,65 R$/US$ em 2026-11-27 (cotação do site para exibição, não verificada); para fechar, trocar a moeda de exibição do site para USD e ver se mostra US$ 20,81; (b) marketplaces em BRL (ou USD no .gg, a confirmar com o HTML real) exigem conversão no lucro e no ROI; **fonte da cotação decidida (ADR 0001, decisão 7)**: campo "cotação USD→BRL" nas configurações, preenchido pelo dono, sem consulta externa; falta só confirmar a moeda do CSFloat vendo o site em USD | Sessão 1 | **Alta** (sem cotação a comparação de preços não faz sentido) |
| P4 | **HTML real dos cards** dos 3 marketplaces (para os adaptadores); só o dono consegue fornecer | PRD 4.1 | Média (Fase 2) |
| P5 | **Prazo "1–2 dias" do PRD × ciclo sem build/teste na VM**: a extensão é carregada e testada no Chrome do dono | Sessão 1 | Média |
| P7 | **Medições que faltam (Fase 1)**: (a) ~~a lista de Buy Orders depende da âncora?~~ (✅ **sim, pelo float**, rodada 3; **por sticker também provado na rodada 3b**: o anúncio da rodada 1, com os stickers 77 e 66, recebeu ordens de 9000, 6300 e 6250 que nenhuma âncora sem eles recebeu); ~~(b) filtro `buy_now`~~ (✅ `type=buy_now` funciona, Sessão 1); ~~(c) rotas sem chave~~ (✅ vendas 200, Buy Orders 401, listings exige chave); ~~(d) janela~~ (✅ parcial: Buy Orders ~1 min, listings e vendas não medidas por inteiro); ~~(e) `price` de topo~~ (✅ plausível). Detalhes em `lab/medir-csfloat.md` | Sessão 1 | Alta |
| P8 | **Buy Orders do item do marketplace**: o item do DashSkins/RentSkins não existe no CSFloat, então não há anúncio-âncora com o mesmo float e os mesmos stickers. **A API filtra pelo float e pelos stickers da âncora (provado nas rodadas 3 e 3b; decisão no ADR 0001, proposto)**: ordens de faixa estreita (ex.: 0,1924 a 0,1972 a 31,70) só aparecem se a âncora estiver dentro da faixa. Desenho provável: escolher como âncora o anúncio do mesmo item com float **mais próximo do float do item analisado** (`min_float`/`max_float` em janela pequena, ampliando se faltar), filtrar localmente as ordens pela faixa do item (a âncora pode estar dentro de faixas que o item não está), e dizer no painel que ordens de faixa estreita ou de sticker podem faltar. Ordens de sticker só aparecem com âncora que tenha o mesmo sticker: o MVP as marca como "não cobertas" | Rodada 2 (Sessão 1) | Alta |
| P9 | **Taxa de venda do CSFloat**: só fontes secundárias (sites de review) dizem **2% do vendedor, sem taxa do comprador, saque à parte (0,5% a 2,5%, varia por fonte)**; a página oficial (`csfloat.com/fees`) devolve só o título (casca de JavaScript, 2026-11-27) e **não foi lida**. Nenhum valor entra no código: as funções de lucro recebem a taxa como parâmetro (plano da Fase 2a). Confirmar no site logado antes de usar como padrão das configurações (2b) | Sessão 1 (Fase 2a) | Alta |
| P6 | Endpoints não documentados do CSFloat só com decisão explícita do dono (termos de uso), e só se a API oficial não cobrir vendas/Buy Orders | PRD 4.2 | Média |

## Resolvidas

(nenhuma)
