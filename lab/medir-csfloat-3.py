"""Rodada 3 da medição do CSFloat (P7a): a lista de Buy Orders depende do anúncio-âncora?
Roda no PC do dono, nunca imprime a chave. Gasta até 3 das 20 chamadas de Buy Orders."""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

KEY = open(os.path.expanduser("~/.config/skinradar/csfloat.key")).read().strip()
BASE = "https://csfloat.com/api/v1"
NAME = "AK-47 | Redline (Field-Tested)"


def get(path, params=None):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"User-Agent": "skinradar-medicao",
                                               "Authorization": KEY})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        code, headers, body = r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        code, headers, body = e.code, e.headers, e.read()
    try:
        data = json.loads(body)
    except ValueError:
        data = None
    return code, headers, data


def items(data):
    return data["data"] if isinstance(data, dict) and "data" in data else (data or [])


def sids(x):
    return {s["stickerId"] for s in x["item"].get("stickers") or []}


def listings(min_f, max_f):
    code, h, data = get("/listings", {"market_hash_name": NAME, "limit": 50,
                                      "sort_by": "lowest_price", "type": "buy_now",
                                      "min_float": min_f, "max_float": max_f})
    print(f"  listings {min_f}-{max_f}: HTTP {code}, {len(items(data))} anúncios")
    return items(data)


def first(lst, pred):
    return next((x for x in lst if pred(x)), None)


print("== Escolha das âncoras (Field-Tested: float de 0,15 a 0,38) ==")
baixo = listings(0.15, 0.20)
alto = listings(0.30, 0.38)
meio = listings(0.15, 0.38)
ancoras = {
    "baixo_limpo": first(baixo, lambda x: not sids(x)),
    "alto_limpo": first(alto, lambda x: not sids(x)),
    "com_sticker": first(meio, lambda x: 77 in sids(x)) or first(meio, lambda x: sids(x)),
}

ordens = {}
for rotulo, x in ancoras.items():
    if not x:
        print(f"{rotulo}: NÃO ACHOU anúncio")
        continue
    print(f"{rotulo}: id={x['id']} float={x['item']['float_value']:.4f} "
          f"preço={x['price']} stickers={sorted(sids(x))}")
    code, h, data = get(f"/listings/{x['id']}/buy-orders", {"limit": 20})
    lst = data or []
    ordens[rotulo] = {json.dumps([o["price"], o["qty"], o["hybrid_properties"]], sort_keys=True)
                      for o in lst}
    print(f"   buy-orders HTTP {code}: {len(lst)} ordens; "
          f"restam={h.get('x-ratelimit-remaining')}/{h.get('x-ratelimit-limit')} "
          f"zera_em={int(h.get('x-ratelimit-reset', 0)) - int(time.time())}s")
    for o in lst:
        if o["hybrid_properties"]:
            print("     com requisito:", o["price"], "qty", o["qty"], o["hybrid_properties"])
    genericas = [o["price"] for o in lst if not o["hybrid_properties"]]
    print("     maior genérica:", max(genericas) if genericas else None)

print("== Diferenças entre âncoras ==")
nomes = list(ordens)
for i in range(len(nomes)):
    for j in range(i + 1, len(nomes)):
        a, b = nomes[i], nomes[j]
        print(f"{a} x {b}: {'IDÊNTICAS' if ordens[a] == ordens[b] else 'DIFERENTES'}")
        for o in sorted(ordens[a] - ordens[b]):
            print(f"   só em {a}: {o}")
        for o in sorted(ordens[b] - ordens[a]):
            print(f"   só em {b}: {o}")
