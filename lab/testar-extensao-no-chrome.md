# Roteiro: carregar a extensão no Chrome (PC do dono)

O build roda **só no PC do dono** (ADR 0017). Cada bloco de comando abaixo é autocontido: cole um por vez.
A chave da API **nunca** entra em chat, print ou log. Se um passo pedir para ver o que está guardado, olhe, não cole.

## 1. Gerar a pasta `dist/`

Antes de mesclar o PR (a branch da fatia):

```
cd ~/Documents/workspace/skinradar && git fetch origin && git checkout fase-2b2d-cola-e-build && git pull --ff-only && node --version && npm ci && npm run build && ls dist
```

Depois de mesclar (a `main`):

```
cd ~/Documents/workspace/skinradar && git fetch origin && git checkout main && git pull --ff-only && node --version && npm ci && npm run build && ls dist
```

Esperado: `node --version` mostra 24 ou mais; o build termina sem erro e `ls dist` mostra
`background.js  content.js  manifest.json  opcoes.html  opcoes.js`. Se o `npm ci` falhar, cole a saída inteira.

## 2. Carregar no Chrome

1. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor** (canto superior direito).
2. **Carregar sem compactação** e escolha a pasta `~/Documents/workspace/skinradar/dist`.
3. A extensão "SkinRadar" aparece sem erro. Se aparecer um botão vermelho **Erros**, clique e copie o texto.

## 3. Configurar (página de opções)

1. Clique no ícone do SkinRadar na barra do Chrome (ou **Detalhes > Opções da extensão**): abre a página de opções numa aba.
2. Preencha: chave da API do CSFloat; cotação USD→BRL (reais por dólar, ex.: `5,65`); taxa de venda em % (confira a
   oficial do CSFloat); janela de float (ex.: `0,05`); piso das Buy Orders em US$ (ex.: `10,00`); validade do cache em
   minutos (ex.: `5`). Custos, ROI mínimo e mínimo de vendas são opcionais.
3. **Salvar**. Esperado: "Salvo." e "Chave salva."; o campo da chave volta em branco.
4. Teste de erro: apague a cotação, salve e veja "Corrija os campos: cotação USD→BRL." com o campo marcado em vermelho.

## 4. Testar em `dashskins.com.br`

1. Abra uma listagem em `https://dashskins.com.br/en/` e **recarregue a página** (o content script entra no carregamento).
2. Esperado: um botão **Analisar no SkinRadar** no fim de cada card. Role a página: os cards novos ganham botão.
3. Clique num botão. Esperado: um painel escuro no canto inferior direito dizendo "Analisando…" e, em seguida, a análise
   (item, classificação, três saídas separadas, vendas, Buy Orders, avisos, rodapé com "Atualizar").
4. Clique de novo no mesmo botão enquanto analisa: nada deve acontecer (o botão fica desabilitado).
5. **Atualizar** no painel refaz a análise sem cache. O **×** fecha o painel.
6. Abra o Network do DevTools da página do site: ao clicar, **nenhuma** chamada para `csfloat.com` deve sair dali
   (elas saem do service worker); e **nenhuma** chamada deve sair só por rolar a página (PRD 4.4).

## 5. Verificar o isolamento da chave (o ponto que eu não consegui provar sem o Chrome)

1. Na aba do DashSkins, DevTools > Console. No seletor de contexto (topo do console, escrito "top"), escolha **SkinRadar**.
2. Rode, e **não cole o resultado se aparecerem valores**:

```
chrome.storage.local.get(null).then((r) => console.log("chaves visíveis:", Object.keys(r)), (e) => console.log("recusado:", String(e)))
```

   Esperado: "recusado: …" ou "chaves visíveis: []". **Se aparecer `skinradar.chave` na lista, me avise: o
   `setAccessLevel` não funcionou.** Em `chrome://extensions`, o link "service worker" do SkinRadar abre o console do worker,
   onde a mesma linha **deve** listar `skinradar.chave` e `skinradar.config`.

## 6. Se algo falhar, cole só isto

- O texto de **Erros** em `chrome://extensions`.
- O console da página do site (contexto SkinRadar) e o console do service worker.
- Se o botão não aparecer: o `outerHTML` de um card (DevTools > Elements > botão direito no card > Copy > Copy outerHTML),
  sem a chave nem dados pessoais, e a aba Network da listagem (nome das chamadas, não o conteúdo).
- Se a classificação parecer errada: o nome do item, o float, o preço do card e o que o painel mostrou.
