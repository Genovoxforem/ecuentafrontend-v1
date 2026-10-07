import json, urllib.request, urllib.error

KEY = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'
BASE = 'http://172.16.5.10'
OID = 111

def get(path):
    req = urllib.request.Request(BASE + path)
    req.add_header('X-API-Key', KEY)
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=20).read().decode())
        return r
    except urllib.error.HTTPError as e:
        return {'success': False, 'http': e.code, 'body': e.read().decode()[:400]}

for name, path in [
    ('detail',    f'/commande/fapi/get.php?id={OID}'),
    ('notes',     f'/commande/fapi/notes.php?id={OID}'),
    ('documents', f'/commande/fapi/documents.php?id={OID}'),
    ('contacts',  f'/commande/fapi/contacts.php?id={OID}'),
    ('shipments', f'/commande/fapi/shipments.php?id={OID}'),
    ('consumption', f'/commande/fapi/consumption.php?id={OID}'),
    ('agenda',    f'/commande/fapi/agenda.php?id={OID}'),
    ('email',     f'/commande/fapi/email.php?id={OID}'),
    ('list',      '/commande/fapi/list.php?limit=2'),
    ('stats',     '/commande/fapi/stats.php?year=2026'),
    ('meta',      '/commande/fapi/meta.php'),
    ('warehouses','/product/stock/fapi/warehouses.php?limit=3'),
]:
    r = get(path)
    ok = r.get('success')
    d = r.get('data') or {}
    keys = list(d.keys()) if isinstance(d, dict) else type(d).__name__
    print(f'{name:12} success={ok} keys={keys[:12]}')

# negative: no api key
try:
    urllib.request.urlopen(BASE + f'/commande/fapi/get.php?id={OID}', timeout=10)
except urllib.error.HTTPError as e:
    print('no-key get.php ->', e.code)

# negative: bad id
r = get('/commande/fapi/get.php?id=999999')
print('bad id ->', r.get('success'), r.get('message'))
