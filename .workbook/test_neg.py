import json, urllib.request, urllib.error

def call(path, key=None, method='GET', body=None):
    req = urllib.request.Request('http://172.16.5.10' + path, method=method)
    if key: req.add_header('X-API-Key', key)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, data=data, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

KEY = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'

for label, path, key in [
    ('no-key',  '/commande/fapi/get.php?id=103', None),
    ('bad-key', '/commande/fapi/get.php?id=103', 'deadbeefdeadbeef'),
    ('no-key actions', '/commande/fapi/actions.php', None),
    ('no-key warehouses', '/product/stock/fapi/warehouses.php', None),
]:
    s, t = call(path, key, 'POST' if 'actions' in path else 'GET')
    try: msg = json.loads(t).get('message')
    except Exception: msg = t[:200]
    print(f'{label}: HTTP {s} -> {msg}')

# geno key: authenticated but likely no commande rights
# look up geno's api_key from DB? fetch via mysql earlier failed to print.
# print('geno:', call('/commande/fapi/get.php?id=103', GENO_KEY))
