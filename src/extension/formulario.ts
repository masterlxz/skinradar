import { validarConfig, type Config } from "../analysis/config.ts";

/** Campos de texto da página de opções, nas unidades que o dono digita. */
export type CamposFormulario = Record<string, string>;

export type ResultadoFormulario =
  | { ok: true; chave: string | null; config: Config }
  | { ok: false; campos: string[] };

interface Campo {
  /** Nome do campo no formulário. */
  campo: string;
  /** Nome do campo em `Config`. */
  config: keyof Config;
  obrigatorio: boolean;
  /** Máximo de casas decimais aceitas (`null`: sem limite). Dinheiro e taxa não têm fração de centavo. */
  casas: number | null;
  /** Da unidade que o dono digita para a da configuração. */
  converter: (x: number) => number;
}

const cem = (x: number) => Math.round(x * 100);

// A ordem daqui é a ordem de `campos` no erro (a da página).
const CAMPOS: Campo[] = [
  { campo: "cotacaoUsdBrl", config: "cotacaoUsdBrl", obrigatorio: true, casas: null, converter: (x) => x },
  { campo: "taxaPct", config: "taxaBp", obrigatorio: true, casas: 2, converter: cem },
  { campo: "custosReais", config: "custosCents", obrigatorio: false, casas: 2, converter: cem },
  { campo: "roiMinPct", config: "roiMinPct", obrigatorio: false, casas: null, converter: (x) => x },
  { campo: "janelaFloat", config: "janelaFloat", obrigatorio: true, casas: null, converter: (x) => x },
  { campo: "minVendas", config: "minVendas", obrigatorio: false, casas: null, converter: (x) => x },
  { campo: "pisoBuyOrderUsd", config: "pisoBuyOrderCents", obrigatorio: true, casas: 2, converter: cem },
  { campo: "validadeMin", config: "validadeCacheSeg", obrigatorio: true, casas: null, converter: (x) => Math.round(x * 60) },
];
const ORDEM = ["chave", ...CAMPOS.map((c) => c.campo)];
const DO_CONFIG_PARA_CAMPO = new Map<string, string>(CAMPOS.map((c) => [c.config, c.campo]));

/** Um número, com `,` ou `.` como separador decimal e sem milhar nem sinal ("1.234,56" é recusado). */
function lerDecimal(texto: string, casas: number | null): number | null {
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(texto);
  if (m === null) return null;
  if (casas !== null && (m[2]?.length ?? 0) > casas) return null;
  return Number(m[2] === undefined ? m[1]! : `${m[1]}.${m[2]}`);
}

export function lerFormulario(campos: CamposFormulario, jaTemChave: boolean): ResultadoFormulario {
  const invalidos = new Set<string>();

  const textoChave = (campos["chave"] ?? "").trim();
  let chave: string | null = null;
  if (textoChave === "") {
    if (!jaTemChave) invalidos.add("chave");
  } else if (/^\S{1,200}$/.test(textoChave)) {
    chave = textoChave;
  } else {
    invalidos.add("chave");
  }

  const bruto: Record<string, number> = {};
  for (const c of CAMPOS) {
    const texto = (campos[c.campo] ?? "").trim();
    if (texto === "") {
      if (c.obrigatorio) invalidos.add(c.campo);
      continue;
    }
    const x = lerDecimal(texto, c.casas);
    if (x === null) invalidos.add(c.campo);
    else bruto[c.config] = c.converter(x);
  }

  // O que leu como número ainda pode ser inválido para a configuração (zero, taxa de 100%, fração).
  const validada = validarConfig(bruto);
  if (!validada.ok) {
    for (const nome of validada.error.campos) invalidos.add(DO_CONFIG_PARA_CAMPO.get(nome) ?? nome);
  }
  if (invalidos.size > 0 || !validada.ok) {
    return { ok: false, campos: ORDEM.filter((c) => invalidos.has(c)) };
  }
  return { ok: true, chave, config: validada.value };
}

const virgula = (n: number) => String(n).replace(".", ",");
const dinheiro = (centavos: number) => `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

/** Inverso de `lerFormulario` para preencher a página; a chave nunca volta para a tela. */
export function paraFormulario(config: Config): CamposFormulario {
  return {
    cotacaoUsdBrl: virgula(config.cotacaoUsdBrl),
    taxaPct: virgula(config.taxaBp / 100),
    custosReais: dinheiro(config.custosCents),
    roiMinPct: virgula(config.roiMinPct),
    janelaFloat: virgula(config.janelaFloat),
    minVendas: String(config.minVendas),
    pisoBuyOrderUsd: dinheiro(config.pisoBuyOrderCents),
    validadeMin: virgula(config.validadeCacheSeg / 60),
  };
}
