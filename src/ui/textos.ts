import type { Aviso } from "../analysis/analisar.ts";
import type { Classificacao } from "../core/classify.ts";
import type { CsfloatError } from "../csfloat/types.ts";
import { floatBr } from "./formatar.ts";

const CLASSIFICACOES: Record<Classificacao, string> = {
  interessante: "Oportunidade interessante",
  moderada: "Oportunidade moderada",
  margem_insuficiente: "Margem insuficiente",
  referencia_inflacionada: "Preço de referência inflacionado",
  baixa_liquidez: "Baixa liquidez",
  dados_insuficientes: "Dados insuficientes",
};

export function rotuloClassificacao(c: Classificacao): string {
  return CLASSIFICACOES[c];
}

export function textoAviso(aviso: Aviso): string {
  switch (aviso.kind) {
    case "moeda_inferida":
      return "Moeda do CSFloat inferida como dólar (US$): a API não informa a moeda.";
    case "bloqueio_troca":
      return `Bloqueio de troca: libera em ${aviso.dias} ${aviso.dias === 1 ? "dia" : "dias"}.`;
    case "sem_float":
      return "Item sem float no card: vendas e Buy Orders por float não foram analisadas.";
    case "ancora_distante":
      return `Anúncio-âncora a ${floatBr(aviso.distancia)} de float do item: Buy Orders de faixa estreita podem faltar.`;
    case "sticker_nao_coberto":
      return "Item com stickers: Buy Orders que exigem sticker não são cobertas, e as vendas comparam só itens com sticker.";
  }
}

/** Frase para o painel. O `detalhe` técnico do erro não entra: pode conter dados que o usuário não precisa ver. */
export function textoErro(fonte: string, erro: CsfloatError): string {
  switch (erro.kind) {
    case "auth":
      return `${fonte}: o CSFloat recusou a chave (HTTP ${erro.status}); confira a chave nas opções.`;
    case "nao_encontrado":
      return `${fonte}: item não encontrado no CSFloat.`;
    case "limite":
      return `${fonte}: limite de requisições do CSFloat atingido; tente de novo em ${
        erro.retryAfterSeg === undefined ? "instantes" : `${erro.retryAfterSeg} s`
      }.`;
    case "rede":
      return `${fonte}: sem conexão com o CSFloat.`;
    case "resposta_invalida":
      return `${fonte}: resposta inesperada do CSFloat.`;
    case "http":
      return `${fonte}: o CSFloat respondeu HTTP ${erro.status}.`;
  }
}

const CAMPOS: Record<string, string> = {
  cotacaoUsdBrl: "cotação USD→BRL",
  taxaBp: "taxa de venda",
  custosCents: "custos",
  roiMinPct: "ROI mínimo",
  janelaFloat: "janela de float das vendas",
  minVendas: "mínimo de vendas",
  pisoBuyOrderCents: "piso de Buy Order",
  validadeCacheSeg: "validade do cache",
};

export function rotuloCampo(campo: string): string {
  return CAMPOS[campo] ?? campo;
}
