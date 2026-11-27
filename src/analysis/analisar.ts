import { pickAnchor } from "../core/anchor.ts";
import { cacheKey } from "../core/cache-key.ts";
import { classify, type Classificacao } from "../core/classify.ts";
import { usdCentsToBrlCents } from "../core/money.ts";
import { splitOrders } from "../core/orders.ts";
import { evaluateExits, type Exits } from "../core/profit.ts";
import { summarizeSales, type SalesSummary } from "../core/sales.ts";
import type { BuyOrder, Cents, Listing, Sale } from "../core/types.ts";
import type { Client } from "../csfloat/client.ts";
import type { CsfloatError, Result } from "../csfloat/types.ts";
import { criarCache } from "./cache.ts";
import { validarConfig, type Config } from "./config.ts";

/** O que a análise precisa saber do item, venha ele de qual marketplace vier (PRD, seção 12). */
export interface ItemParaAnalise {
  marketHashName: string;
  /** Preço de compra em centavos de real. */
  priceCents: Cents;
  float: number | null;
  /** Nomes dos stickers. */
  stickers: string[];
  tradeLock: "livre" | { dias: number } | null;
}

export type Aviso =
  | { kind: "moeda_inferida" }
  | { kind: "bloqueio_troca"; dias: number }
  | { kind: "sem_float" }
  | { kind: "ancora_distante"; distancia: number }
  | { kind: "sticker_nao_coberto" };

export interface ResumoBuyOrders {
  melhor: { price: Cents; qty: number } | null;
  elegiveis: number;
  deSticker: number;
  foraDaFaixa: number;
  abaixoDoPiso: number;
}

export interface Analise {
  item: ItemParaAnalise;
  classificacao: Classificacao;
  /** As três saídas, em centavos de real, nunca misturadas em uma estimativa só. */
  saidas: Exits;
  vendas: SalesSummary | null;
  ancora: { listingId: string; distancia: number } | null;
  buyOrders: ResumoBuyOrders | null;
  avisos: Aviso[];
  erros: Partial<Record<"listings" | "vendas" | "buyOrders", CsfloatError>>;
  /** Quando os dados do CSFloat foram buscados (ms). */
  atualizadoEm: number;
  deCache: boolean;
}

export type ResultadoAnalise =
  | { ok: true; value: Analise }
  | { ok: false; error: { kind: "config_invalida"; campos: string[] } };

type Fonte<T> = { ok: true; value: T } | { ok: false; error: CsfloatError };

/** Dados do CSFloat, em dólar: é o que o cache guarda. `null` = não pedido (sem float). */
interface Dados {
  listings: Fonte<Listing[]>;
  vendas: Fonte<Sale[]> | null;
  buyOrders: Fonte<BuyOrder[]> | null;
}

/** Acima disto a âncora está longe do float do item e as Buy Orders podem faltar. */
const ANCORA_DISTANTE = 0.002;

function fonte<T>(r: Result<T>): Fonte<T> {
  return r.ok ? { ok: true, value: r.value } : { ok: false, error: r.error };
}

export function criarAnalisador(deps: { client: Client; agora: () => number }) {
  const cache = criarCache<Dados>(deps.agora);

  async function buscar(item: ItemParaAnalise): Promise<{ valor: Dados; guardar: boolean }> {
    const { client } = deps;
    const listingsP = client.listings({
      marketHashName: item.marketHashName,
      type: "buy_now",
      limit: 200,
      sortBy: "lowest_price",
    });
    const vendasP = item.float === null ? null : client.sales(item.marketHashName);

    const listings = fonte(await listingsP);
    let buyOrders: Fonte<BuyOrder[]> | null = null;
    if (item.float !== null && listings.ok) {
      const ancora = pickAnchor(listings.value, item.float);
      if (ancora !== null) buyOrders = fonte(await client.buyOrders(ancora.listing.id));
    }
    const vendas = vendasP === null ? null : fonte(await vendasP);

    const guardar = listings.ok && (vendas === null || vendas.ok) && (buyOrders === null || buyOrders.ok);
    return { valor: { listings, vendas, buyOrders }, guardar };
  }

  /** Conta pura: dados do CSFloat + item + configuração. Roda de novo a cada clique, sem rede. */
  function calcular(
    item: ItemParaAnalise,
    config: Config,
    dados: Dados,
    meta: { em: number; deCache: boolean },
  ): Analise {
    const erros: Analise["erros"] = {};
    if (!dados.listings.ok) erros.listings = dados.listings.error;
    if (dados.vendas !== null && !dados.vendas.ok) erros.vendas = dados.vendas.error;
    if (dados.buyOrders !== null && !dados.buyOrders.ok) erros.buyOrders = dados.buyOrders.error;

    const anuncios = dados.listings.ok ? dados.listings.value : [];
    const baratos = anuncios.filter((l) => l.type === "buy_now" && l.state === "listed").map((l) => l.price);
    const menorAnuncioUsd = baratos.length === 0 ? null : Math.min(...baratos);

    const ancora =
      item.float !== null && dados.listings.ok ? pickAnchor(dados.listings.value, item.float) : null;

    const vendas =
      item.float !== null && dados.vendas !== null && dados.vendas.ok
        ? summarizeSales(dados.vendas.value, item.float, config.janelaFloat, config.minVendas, item.stickers.length > 0)
        : null;

    const divisao =
      item.float !== null && dados.buyOrders !== null && dados.buyOrders.ok
        ? splitOrders(dados.buyOrders.value, item.float, config.pisoBuyOrderCents)
        : null;

    const emReais = (usd: Cents | null): Cents | null =>
      usd === null ? null : usdCentsToBrlCents(usd, config.cotacaoUsdBrl);
    const saidas = evaluateExits(
      item.priceCents,
      {
        mercado: emReais(vendas !== null && vendas.status === "ok" ? vendas.median : null),
        menorAnuncio: emReais(menorAnuncioUsd),
        buyOrder: emReais(divisao?.best?.price ?? null),
      },
      config.taxaBp,
      config.custosCents,
    );

    const avisos: Aviso[] = [{ kind: "moeda_inferida" }];
    if (item.tradeLock !== null && item.tradeLock !== "livre") {
      avisos.push({ kind: "bloqueio_troca", dias: item.tradeLock.dias });
    }
    if (item.float === null) avisos.push({ kind: "sem_float" });
    if (ancora !== null && ancora.distance > ANCORA_DISTANTE) {
      avisos.push({ kind: "ancora_distante", distancia: ancora.distance });
    }
    if (item.stickers.length > 0) avisos.push({ kind: "sticker_nao_coberto" });

    return {
      item,
      classificacao: classify({
        vendas,
        mercado: saidas.mercado,
        menorAnuncio: saidas.menorAnuncio,
        roiMinPct: config.roiMinPct,
      }),
      saidas,
      vendas,
      ancora: ancora === null ? null : { listingId: ancora.listing.id, distancia: ancora.distance },
      buyOrders:
        divisao === null
          ? null
          : {
              melhor: divisao.best === null ? null : { price: divisao.best.price, qty: divisao.best.qty },
              elegiveis: divisao.eligible.length,
              deSticker: divisao.stickerOnly.length,
              foraDaFaixa: divisao.outOfRange.length,
              abaixoDoPiso: divisao.belowFloor.length,
            },
      avisos,
      erros,
      atualizadoEm: meta.em,
      deCache: meta.deCache,
    };
  }

  /**
   * Sem `async` na frente: a busca precisa ser registrada no cache no mesmo tick do clique,
   * senão dois cliques seguidos não dividiriam a busca em andamento.
   */
  function analisar(
    item: ItemParaAnalise,
    configBruta: unknown,
    opcoes: { forcar?: boolean } = {},
  ): Promise<ResultadoAnalise> {
    const c = validarConfig(configBruta);
    if (!c.ok) return Promise.resolve(c);
    const config = c.value;
    const chave =
      item.float === null
        ? `${item.marketHashName}|sem-float`
        : cacheKey({ marketHashName: item.marketHashName, float: item.float, stickers: item.stickers });
    return cache
      .obter(chave, config.validadeCacheSeg * 1000, opcoes.forcar === true, () => buscar(item))
      .then((e) => ({ ok: true as const, value: calcular(item, config, e.valor, e) }));
  }

  return analisar;
}