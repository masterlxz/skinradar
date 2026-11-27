"""Mutação planejada, conferida pelo NOME do teste (roda só no CI; nada disto roda na VM).

Para cada mutação: troca UM trecho do código, confere que o typecheck ainda passa (mutação que
quebra o compilador não conta), roda os testes e compara os nomes que falharam com os previstos.
Sai com código 1 se alguma mutação não derrubar o teste previsto ou for inválida.
"""
import pathlib
import re
import subprocess
import sys

# (id, arquivo, trecho antigo (deve aparecer 1 vez), trecho novo, [prefixos dos testes que DEVEM falhar])
MUTACOES = [
    ("M01 ROI 15%: >= vira >", "src/core/classify.ts",
     'if (mercado.roiPct >= roiMinPct) return "interessante";',
     'if (mercado.roiPct > roiMinPct) return "interessante";',
     ["ROI de exatamente 15% é interessante"]),
    ("M02 ROI metade: >= vira >", "src/core/classify.ts",
     'if (mercado.roiPct >= roiMinPct / 2) return "moderada";',
     'if (mercado.roiPct > roiMinPct / 2) return "moderada";',
     ["ROI de exatamente 7,5%"]),
    ("M03 inflacionada nunca dispara", "src/core/classify.ts",
     "menorAnuncio.roiPct >= roiMinPct &&", "false &&",
     ["lucro só contra o menor anúncio"]),
    ("M04 baixa liquidez some", "src/core/classify.ts",
     'return vendas.n === 0 ? "dados_insuficientes" : "baixa_liquidez";',
     'return "dados_insuficientes";',
     ["3 vendas na janela com mínimo 5"]),
    ("M05 faixa de float: max inclusivo vira exclusivo", "src/core/orders.ts",
     "itemFloat > o.maxFloat", "itemFloat >= o.maxFloat",
     ["ordem com float no limite da faixa entra", "limites da faixa são inclusivos"]),
    ("M06 faixa de float: min inclusivo vira exclusivo", "src/core/orders.ts",
     "itemFloat < o.minFloat", "itemFloat <= o.minFloat",
     ["limites da faixa são inclusivos"]),
    ("M07 ordem de sticker entra como saída", "src/core/orders.ts",
     "if (o.stickers.length > 0) {", "if (o.stickers.length < 0) {",
     ["ordem de sticker não conta como saída"]),
    ("M08 piso das ordens-lixo invertido", "src/core/orders.ts",
     "} else if (o.price < floorCents) {", "} else if (o.price > floorCents) {",
     ["piso 1000 descarta as ordens-lixo"]),
    ("M09 leilão vira âncora", "src/core/anchor.ts",
     'listing.type !== "buy_now" || listing.state !== "listed"',
     'listing.state !== "listed"',
     ["leilão nunca é âncora", "só leilões: não há âncora"]),
    ("M10 desempate pega o mais caro", "src/core/anchor.ts",
     "listing.price < best.listing.price", "listing.price > best.listing.price",
     ["empate de distância fica com o mais barato"]),
    ("M11 janela de float: inclusiva vira exclusiva", "src/core/sales.ts",
     "<= window", "< window",
     ["a janela é inclusiva nos dois lados"]),
    ("M12 mínimo de vendas: < vira <=", "src/core/sales.ts",
     "n === 0 || n < minSamples", "n === 0 || n <= minSamples",
     ["alvo 0,20 e janela 0,03: 5 vendas"]),
    ("M13 mediana par: arredonda para baixo", "src/core/sales.ts",
     "Math.round((prices[meio - 1]! + prices[meio]!) / 2)",
     "Math.floor((prices[meio - 1]! + prices[meio]!) / 2)",
     ["mediana de n par arredonda", "mediana não é a média"]),
    ("M14 média no lugar da mediana", "src/core/sales.ts",
     "n % 2 === 1 ? prices[meio]! :",
     "true ? Math.round(prices.reduce((a, b) => a + b, 0) / n) :",
     ["alvo 0,20 e janela 0,03: 5 vendas", "mediana não é a média"]),
    ("M15 taxa: arredonda para baixo", "src/core/profit.ts",
     "Math.round((venda * taxaBp) / 10000)", "Math.floor((venda * taxaBp) / 10000)",
     ["compra 1500, venda 2712, taxa 5%", "taxa com meio centavo arredonda para cima"]),
    ("M16 ROI sobre a venda em vez da compra", "src/core/profit.ts",
     "(lucro * 100) / compra", "(lucro * 100) / venda",
     ["compra 1500, venda 2712, taxa 5%", "venda abaixo da compra dá lucro e ROI negativos"]),
    ("M17 custos ignorados no lucro", "src/core/profit.ts",
     "const lucro = venda - taxa - custos - compra;", "const lucro = venda - taxa - compra;",
     ["custos adicionais reduzem o lucro"]),
    ("M18 compra zero deixa de ser erro", "src/core/profit.ts",
     "if (!Number.isInteger(compra) || compra <= 0) {",
     "if (!Number.isInteger(compra) || compra < 0) {",
     ["compra zero é erro"]),
    ("M19 cotação: arredonda para baixo", "src/core/money.ts",
     "Math.round(usdCents * rate)", "Math.floor(usdCents * rate)",
     ["US$ 20,81 a 5,65", "meio centavo arredonda para cima"]),
    ("M20 chave de cache ignora a posição do sticker", "src/core/cache-key.ts",
     '.map((s) => `${s.id}@${s.slot ?? "*"}`)', ".map((s) => `${s.id}`)",
     ["sticker diferente, ou na posição diferente"]),
    ("M21 chave de cache no décimo de milésimo", "src/core/cache-key.ts",
     "toFixed(3)", "toFixed(4)",
     ["floats no mesmo milésimo"]),
    ("M22 chave de cache depende da ordem dos stickers", "src/core/cache-key.ts",
     '.sort()\n    .join(",")', '.join(",")',
     ["a ordem dos stickers não muda a chave"]),
    ("M23 403 deixa de ser erro de autenticação", "src/csfloat/client.ts",
     "if (status === 401 || status === 403) {", "if (status === 401) {",
     ["401 e 403 viram erro de autenticação"]),
    ("M24 cabeçalho retry-after errado", "src/csfloat/client.ts",
     '"retry-after"', '"retry_after"',
     ["429 vira 'limite'"]),
    ("M25 chave com prefixo Bearer", "src/csfloat/client.ts",
     "Authorization: options.apiKey,", "Authorization: `Bearer ${options.apiKey}`,",
     ["listings: monta a URL"]),
    ("M26 nome sem codificar no caminho das vendas", "src/csfloat/client.ts",
     "encodeURIComponent(marketHashName)", "marketHashName",
     ["vendas: o nome vai codificado no caminho"]),
    ("M27 posição do sticker da ordem perdida", "src/csfloat/parse.ts",
     'stickers.push(num(s["s"]) ? { id: s["sId"], slot: s["s"] } : { id: s["sId"] });',
     'stickers.push({ id: s["sId"] });',
     ["buy orders: ordem de sticker traz id e posição"]),
    ("M28 faixa mínima de float da ordem perdida", "src/csfloat/parse.ts",
     'if (num(props["min_float"])) ordem.minFloat = props["min_float"];', "",
     ["buy orders: faixa de float vem em minFloat"]),
]

NOME_FALHA = re.compile(r"^\s*✖ (.+?) \(\d+(?:\.\d+)?ms\)\s*$", re.MULTILINE)


def rodar(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def testes():
    r = rodar(["npm", "test", "--", "--test-reporter=spec"])
    saida = r.stdout + r.stderr
    total = re.search(r"ℹ tests (\d+)", saida)
    falhas = {m.group(1) for m in NOME_FALHA.finditer(saida)}
    return (int(total.group(1)) if total else -1), falhas, r.returncode


def main():
    total0, falhas0, rc0 = testes()
    print(f"base: {total0} testes, {len(falhas0)} falhas, código {rc0}")
    if rc0 != 0 or falhas0 or total0 <= 0:
        print("a base já falha: mutação não faz sentido")
        return 1

    linhas = ["| Mutação | Previsto | Falharam (nomes) | Veredito |", "|---|---|---|---|"]
    ruins = 0
    for ident, arquivo, antigo, novo, previstos in MUTACOES:
        caminho = pathlib.Path(arquivo)
        original = caminho.read_text(encoding="utf-8")
        if original.count(antigo) != 1:
            linhas.append(f"| {ident} | | trecho aparece {original.count(antigo)}x | INVÁLIDA |")
            ruins += 1
            continue
        try:
            caminho.write_text(original.replace(antigo, novo), encoding="utf-8")
            if rodar(["npm", "run", "typecheck"]).returncode != 0:
                linhas.append(f"| {ident} | | typecheck quebrou | INVÁLIDA (não conta) |")
                ruins += 1
                continue
            total, falhas, _ = testes()
        finally:
            caminho.write_text(original, encoding="utf-8")

        faltou = [p for p in previstos if not any(n.startswith(p) for n in falhas)]
        extras = sorted(n for n in falhas if not any(n.startswith(p) for p in previstos))
        if total != total0:
            veredito = f"INVÁLIDA (rodaram {total} de {total0} testes)"
        elif faltou:
            veredito = "SOBREVIVEU: não caiu " + "; ".join(faltou)
        else:
            veredito = "ok" + (f" (+{len(extras)} extra)" if extras else "")
        if veredito != "ok" and not veredito.startswith("ok ("):
            ruins += 1
        nomes = "<br>".join(sorted(falhas)) or "(nenhum)"
        linhas.append(f"| {ident} | {'<br>'.join(previstos)} | {nomes} | {veredito} |")

    relatorio = "\n".join(linhas)
    print(relatorio)
    resumo = pathlib.Path(__import__("os").environ.get("GITHUB_STEP_SUMMARY", "/dev/null"))
    with resumo.open("a", encoding="utf-8") as f:
        f.write("## Mutação planejada\n\n" + relatorio + "\n")
    print(f"\n{len(MUTACOES)} mutações, {ruins} com problema")
    return 1 if ruins else 0


if __name__ == "__main__":
    sys.exit(main())
