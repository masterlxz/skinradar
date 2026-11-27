import type { Analise } from "../analysis/analisar.ts";
import type { ExitResult } from "../core/profit.ts";
import type { ErroResposta } from "../extension/mensagens.ts";
import { dolar, floatBr, idade, percentual, reais } from "./formatar.ts";
import { rotuloCampo, rotuloClassificacao, textoAviso, textoErro } from "./textos.ts";

// Regra deste arquivo: todo texto entra por `textContent`. O nome da skin e os stickers vêm do HTML do
// marketplace e não podem virar HTML (nenhuma API que interprete texto como marcação; há teste que confere).

export type Estado = { tipo: "carregando" } | { tipo: "erro"; erro: ErroResposta };

function el(
  doc: Document,
  tag: string,
  atributos: Record<string, string> = {},
  texto?: string,
  filhos: Element[] = [],
): HTMLElement {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v);
  if (texto !== undefined) e.textContent = texto;
  for (const f of filhos) e.appendChild(f);
  return e;
}

function linha(doc: Document, campo: string, rotulo: string, valor: string, extra: Record<string, string> = {}): HTMLElement {
  return el(doc, "div", { "data-campo": campo, ...extra }, undefined, [
    el(doc, "span", { class: "sr-rotulo" }, rotulo),
    el(doc, "span", { class: "sr-valor" }, valor),
  ]);
}

function lista(doc: Document, secao: string, itens: string[]): HTMLElement {
  return el(doc, "ul", { "data-secao": secao }, undefined, itens.map((t) => el(doc, "li", {}, t)));
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function secaoItem(doc: Document, a: Analise): HTMLElement {
  const { item } = a;
  const filhos = [
    el(doc, "div", { "data-campo": "nome", class: "sr-nome" }, item.marketHashName),
    linha(doc, "float", "Float", item.float === null ? "sem float" : floatBr(item.float)),
    linha(doc, "compra", "Compra", reais(item.priceCents)),
  ];
  if (item.stickers.length > 0) {
    filhos.push(
      el(doc, "ul", { "data-campo": "stickers" }, undefined, item.stickers.map((s) => el(doc, "li", {}, s))),
    );
  }
  return el(doc, "section", { "data-secao": "item" }, undefined, filhos);
}

function saida(doc: Document, id: string, titulo: string, r: ExitResult | null, motivo: string): HTMLElement {
  const filhos = [el(doc, "div", { "data-campo": "titulo", class: "sr-titulo" }, titulo)];
  if (r === null) {
    filhos.push(el(doc, "div", { "data-campo": "vazio", class: "sr-vazio" }, motivo));
  } else {
    filhos.push(
      linha(doc, "venda", "Venda estimada", reais(r.venda)),
      linha(doc, "taxa", "Taxa de venda", reais(r.taxa)),
      linha(doc, "lucro", "Lucro líquido", reais(r.lucro), { "data-sinal": r.lucro < 0 ? "negativo" : "positivo" }),
      linha(doc, "roi", "ROI", percentual(r.roiPct)),
    );
  }
  return el(doc, "section", { "data-saida": id }, undefined, filhos);
}

function motivoMercado(a: Analise): string {
  if (a.erros.vendas !== undefined) return "Sem dados: a fonte de vendas falhou.";
  if (a.item.float === null) return "Sem dados: o card não traz float.";
  if (a.vendas?.status === "insuficiente") {
    return `Sem dados: amostra insuficiente (${plural(a.vendas.n, "venda comparável", "vendas comparáveis")}).`;
  }
  return "Sem dados: nenhuma venda comparável.";
}

function motivoMenorAnuncio(a: Analise): string {
  if (a.erros.listings !== undefined) return "Sem dados: a fonte de anúncios falhou.";
  return "Sem dados: nenhum anúncio buy_now à venda.";
}

function motivoBuyOrder(a: Analise): string {
  if (a.erros.buyOrders !== undefined) return "Sem dados: a fonte de Buy Orders falhou.";
  if (a.erros.listings !== undefined) return "Sem dados: sem âncora, a fonte de anúncios falhou.";
  if (a.item.float === null) return "Sem dados: o card não traz float.";
  if (a.ancora === null) return "Sem dados: nenhum anúncio-âncora encontrado.";
  return "Sem dados: nenhuma Buy Order compatível.";
}

function textoVendas(a: Analise): string {
  const prefixo = "Vendas do CSFloat (US$, moeda inferida): ";
  const v = a.vendas;
  if (v === null) return `${prefixo}sem dados.`;
  if (v.status === "insuficiente") {
    return `${prefixo}amostra insuficiente (${plural(v.n, "venda comparável", "vendas comparáveis")}).`;
  }
  return `${prefixo}${plural(v.n, "venda comparável", "vendas comparáveis")} · mediana ${dolar(v.median)} · mín. ${dolar(v.min)} · máx. ${dolar(v.max)}`;
}

function textoBuyOrders(a: Analise): string {
  const prefixo = "Buy Orders do CSFloat (US$): ";
  const b = a.buyOrders;
  if (b === null) return `${prefixo}não analisadas.`;
  if (b.melhor === null) return `${prefixo}nenhuma ordem compatível.`;
  const partes = [`maior compatível ${dolar(b.melhor.price)} (${b.melhor.qty} un.)`, `${b.elegiveis} contam`];
  if (b.abaixoDoPiso > 0) partes.push(`${b.abaixoDoPiso} abaixo do piso`);
  if (b.foraDaFaixa > 0) partes.push(`${b.foraDaFaixa} fora da faixa de float`);
  if (b.deSticker > 0) partes.push(`${b.deSticker} exigem sticker (não cobertas)`);
  return `${prefixo}${partes.join(" · ")}`;
}

export function renderPainel(doc: Document, a: Analise, agora: number): HTMLElement {
  const filhos: Element[] = [
    secaoItem(doc, a),
    el(doc, "div", { "data-secao": "classificacao", class: "sr-classificacao" }, rotuloClassificacao(a.classificacao)),
    saida(doc, "mercado", "Revenda pelo preço de mercado (mediana das vendas)", a.saidas.mercado, motivoMercado(a)),
    saida(doc, "menor_anuncio", "Revenda pelo menor anúncio", a.saidas.menorAnuncio, motivoMenorAnuncio(a)),
    saida(doc, "buy_order", "Venda por Buy Order (não é saída garantida)", a.saidas.buyOrder, motivoBuyOrder(a)),
    el(doc, "div", { "data-secao": "vendas" }, textoVendas(a)),
    el(doc, "div", { "data-secao": "buy-orders" }, textoBuyOrders(a)),
  ];
  if (a.avisos.length > 0) filhos.push(lista(doc, "avisos", a.avisos.map(textoAviso)));

  const erros: string[] = [];
  if (a.erros.listings !== undefined) erros.push(textoErro("Anúncios", a.erros.listings));
  if (a.erros.vendas !== undefined) erros.push(textoErro("Vendas", a.erros.vendas));
  if (a.erros.buyOrders !== undefined) erros.push(textoErro("Buy Orders", a.erros.buyOrders));
  if (erros.length > 0) filhos.push(lista(doc, "erros", erros));

  filhos.push(
    el(doc, "footer", { "data-secao": "rodape" }, undefined, [
      el(
        doc,
        "span",
        { "data-campo": "idade" },
        `Dados do CSFloat de ${idade(agora, a.atualizadoEm)}${a.deCache ? " (cache)" : ""}`,
      ),
      el(doc, "button", { type: "button", "data-acao": "atualizar" }, "Atualizar"),
    ]),
  );
  return el(doc, "div", { class: "sr-painel", "data-classificacao": a.classificacao }, undefined, filhos);
}

function textoEstadoErro(erro: ErroResposta): string {
  switch (erro.kind) {
    case "config_invalida":
      return `Configuração incompleta: preencha nas opções da extensão: ${erro.campos.map(rotuloCampo).join(", ")}.`;
    case "sem_chave":
      return "Chave da API do CSFloat não configurada: abra as opções da extensão.";
    case "interno":
      return "Erro interno ao analisar. Tente de novo.";
  }
}

export function renderEstado(doc: Document, estado: Estado): HTMLElement {
  const texto = estado.tipo === "carregando" ? "Analisando…" : textoEstadoErro(estado.erro);
  return el(doc, "div", { class: "sr-painel", "data-estado": estado.tipo }, texto);
}

/** Estilo do painel; a casca o coloca num shadow root (as classes do site têm sufixo gerado). Sem rede. */
export const CSS = `
.sr-painel { font: 13px/1.4 system-ui, sans-serif; color: #e8e8ee; background: #14141a; border: 1px solid #34344a;
  border-radius: 8px; padding: 12px; max-width: 420px; }
.sr-painel section, .sr-painel [data-secao] { margin-bottom: 10px; }
.sr-nome { font-weight: 600; margin-bottom: 4px; }
.sr-classificacao { font-weight: 700; font-size: 15px; }
.sr-painel[data-classificacao="interessante"] .sr-classificacao { color: #4ade80; }
.sr-painel[data-classificacao="moderada"] .sr-classificacao { color: #facc15; }
.sr-painel[data-classificacao="referencia_inflacionada"] .sr-classificacao { color: #fb923c; }
.sr-painel[data-classificacao="margem_insuficiente"] .sr-classificacao,
.sr-painel[data-classificacao="baixa_liquidez"] .sr-classificacao,
.sr-painel[data-classificacao="dados_insuficientes"] .sr-classificacao { color: #f87171; }
.sr-titulo { font-weight: 600; margin-bottom: 2px; }
.sr-rotulo { color: #9a9ab0; margin-right: 6px; }
.sr-vazio { color: #9a9ab0; font-style: italic; }
[data-sinal="negativo"] .sr-valor { color: #f87171; }
[data-sinal="positivo"] .sr-valor { color: #4ade80; }
[data-secao="avisos"], [data-secao="erros"] { padding-left: 18px; }
[data-secao="erros"] { color: #f87171; }
[data-secao="rodape"] { display: flex; justify-content: space-between; align-items: center; color: #9a9ab0; }
`;
