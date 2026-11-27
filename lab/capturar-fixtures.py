"""Captura respostas reais do CSFloat e grava fixtures SANITIZADAS fora do repo.
Roda no PC do dono; nunca imprime a chave. Saída: ~/skinradar-medicao/fixtures/*.json
Gasta 3 das 200 chamadas de listings, 1 de vendas e 3 das 20 de Buy Orders por janela."""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

KEY = open(os.path.expanduser("~/.config/skinradar/csfloat.key")).read().strip()
BASE = "https://csfloat.com/api/v1"
NAME = "AK-47 | Redline (Field-Tested)"
OUT = os.path.expanduser("~/skinradar-medicao/fixtures")
os.makedirs(OUT, exist_ok=True)

# chaves removidas em qualquer nível (pessoas, imagens, textos longos, inspeção)
DROP = {"avatar", "steam_id", "username", "serialized_inspect", "gs_sig", "icon_url",
        "description", "obfuscated_buyer_id", "contract_id", "cs2_screenshot_id", "asset_id"}


def clean(o):
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            if k in DROP:
                continue
            if k == "seller":  # só as estatísticas, sem identidade
                out[k] = {"statistics": clean(v.get("statistics", {}))}
                continue
            out[k] = clean(v)
        return out
    if isinstance(o, list):
        return [clean(x) for x in o]
    return o


def get(path, params=None):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"User-Agent": "skinradar-medicao",
                                               "Authorization": KEY})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:200].decode("utf-8", "replace")


def items(d):
    return d["data"] if isinstance(d, dict) and "data" in d else d


def save(nome, dados):
    with open(os.path.join(OUT, nome), "w") as f:
        json.dump(clean(dados), f, indent=1, ensure_ascii=False, sort_keys=True)
    print("gravado", nome)


def sids(x):
    return {s["stickerId"] for s in x["item"].get("stickers") or []}


base = {"market_hash_name": NAME, "sort_by": "lowest_price"}

c, d = get("/listings", {**base, "limit": 5})
print("listings sem filtro de tipo:", c)
save("listings-misto.json", items(d))

c, d = get("/listings", {**base, "limit": 50, "type": "buy_now", "min_float": 0.15, "max_float": 0.38})
print("listings buy_now:", c)
buy_now = items(d)
save("listings-buy-now.json", buy_now[:8])

c, d = get(f"/history/{urllib.parse.quote(NAME)}/sales")
print("vendas:", c, "itens", len(items(d)))
vendas = items(d)
save("vendas.json", vendas[:15])

# âncoras: float baixo (0,15 a 0,20), float alto (0,30 a 0,38) e uma com sticker
ancoras = {}
for rotulo, (lo, hi) in {"baixo": (0.15, 0.20), "alto": (0.30, 0.38)}.items():
    c, d = get("/listings", {**base, "limit": 50, "type": "buy_now", "min_float": lo, "max_float": hi})
    ancoras[rotulo] = next((x for x in items(d) if not sids(x)), None)
ancoras["sticker"] = next((x for x in buy_now if sids(x)), None)

meta = {}
for rotulo, x in ancoras.items():
    if not x:
        print(rotulo, "NÃO ACHOU âncora")
        continue
    c, d = get(f"/listings/{x['id']}/buy-orders", {"limit": 30})
    print(rotulo, "buy-orders:", c, "ordens", len(d) if isinstance(d, list) else d)
    if isinstance(d, list):
        save(f"buy-orders-{rotulo}.json", d)
        meta[rotulo] = {"float": x["item"]["float_value"],
                        "stickers": sorted(sids(x)), "preco": x["price"]}
save("ancoras.json", meta)

print("== conferência: nenhum steam id nem chave nos arquivos (deve dar 0) ==")
texto = "".join(open(os.path.join(OUT, f)).read() for f in os.listdir(OUT))
print("steam ids:", len(re.findall(r"7656119\d{10}", texto)), "| chave:", texto.count(KEY))
