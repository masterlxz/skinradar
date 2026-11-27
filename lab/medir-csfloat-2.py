"""Rodada 2 da medição do CSFloat (P7). Roda no PC do dono, nunca imprime a chave."""
import json
import os
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request

KEY = open(os.path.expanduser("~/.config/skinradar/csfloat.key")).read().strip()
BASE = "https://csfloat.com/api/v1"
NAME = "AK-47 | Redline (Field-Tested)"


def get(path, params=None, key=True):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"User-Agent": "skinradar-medicao"})
    if key:
        req.add_header("Authorization", KEY)
    try:
        r = urllib.request.urlopen(req, timeout=30)
        code, headers, body = r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        code, headers, body = e.code, e.headers, e.read()
    try:
        data = json.loads(body)
    except ValueError:
        data = None
    return code, headers, data, body


def rate(label, headers):
    reset = headers.get("x-ratelimit-reset")
    em = int(reset) - int(time.time()) if reset else None
    print(f"   [{label}] limite={headers.get('x-ratelimit-limit')} "
          f"restam={headers.get('x-ratelimit-remaining')} zera_em={em}s")


def items(data):
    return data["data"] if isinstance(data, dict) and "data" in data else (data or [])


print("== A. filtro type=buy_now ==")
code, h, data, _ = get("/listings", {"market_hash_name": NAME, "limit": 5,
                                     "sort_by": "lowest_price", "type": "buy_now"})
print("HTTP", code)
for x in items(data):
    print("  ", x.get("type"), x.get("price"), "float", round(x["item"]["float_value"], 4))
rate("listings", h)

print("== B. dois anúncios com floats diferentes ==")
ids = {}
for rotulo, extra in (("baixo", {"max_float": 0.12}), ("alto", {"min_float": 0.30})):
    code, h, data, _ = get("/listings", {"market_hash_name": NAME, "limit": 1,
                                         "sort_by": "lowest_price", "type": "buy_now", **extra})
    lst = items(data)
    print(rotulo, "HTTP", code, "achou", len(lst))
    if lst:
        x = lst[0]
        ids[rotulo] = x["id"]
        print("  ", x["id"], x.get("type"), x.get("price"), "float",
              round(x["item"]["float_value"], 4), "stickers", len(x["item"].get("stickers") or []))

print("== C. Buy Orders por anúncio ==")
listas = {}
for rotulo, lid in ids.items():
    code, h, data, _ = get(f"/listings/{lid}/buy-orders", {"limit": 20})
    print(rotulo, "HTTP", code, "ordens", len(data or []))
    listas[rotulo] = data or []
    for o in listas[rotulo][:8]:
        print("  ", o.get("price"), "qty", o.get("qty"), o.get("hybrid_properties"))
    rate("buy-orders", h)
if len(listas) == 2:
    print("IDÊNTICAS?", listas["baixo"] == listas["alto"])

print("== D. vendas (preço de topo) ==")
code, h, data, _ = get(f"/history/{urllib.parse.quote(NAME)}/sales")
vendas = items(data)
print("HTTP", code, "itens", len(vendas))
for v in vendas[:10]:
    print("  ", v.get("price"), v.get("type"), v.get("sold_at"),
          "float", round(v["item"]["float_value"], 4))
precos = [v["price"] for v in vendas if "price" in v]
if precos:
    print("   min", min(precos), "mediana", statistics.median(precos), "max", max(precos))
rate("sales", h)

print("== E. sem chave ==")
if ids:
    lid = next(iter(ids.values()))
    print("buy-orders sem chave: HTTP", get(f"/listings/{lid}/buy-orders", {"limit": 1}, key=False)[0])
print("sales sem chave: HTTP", get(f"/history/{urllib.parse.quote(NAME)}/sales", key=False)[0])
