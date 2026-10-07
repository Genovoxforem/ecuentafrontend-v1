import json, urllib.request, urllib.error, urllib.parse

BASE = 'http://172.16.5.10'
KEY = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'

def call(path, method='GET', body=None, form=False):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header('X-API-Key', KEY)
    data = None
    if body is not None:
        if form:
            data = urllib.parse.urlencode(body).encode()
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        else:
            data = json.dumps(body).encode()
            req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def show(label, s, d):
    extra = ''
    if isinstance(d.get('data'), dict):
        extra = ' | ' + json.dumps({k: v for k, v in list(d['data'].items())[:3]})[:220]
    print(f'{label}: HTTP {s} success={d.get("success")} msg={d.get("message")}{extra}')

# contact add + swap + delete round-trip
s, d = call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'add', 'source': 'internal', 'userid': 14, 'type': 91})
show('add internal contact', s, d)
if d.get('success'):
    linkid = d['data']['rows']['internal'][-1]['linkid']
    show('swap status', *call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'swap', 'lineid': linkid}))
    show('swap back', *call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'swap', 'lineid': linkid}))
    show('delete contact', *call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'delete', 'lineid': linkid}))

# consumption: declare with label containing order ref (SEARCHMODE=1 matches by label)
show('declare consumption', *call('/commande/fapi/consumption.php', 'POST', {'id': 103, 'product': 138, 'id_entrepot': 1, 'nbpiece': 1, 'label': 'OrderConsumption (CO2607-0094)'}))
s, d = call('/commande/fapi/consumption.php?id=103')
rows = d['data']['rows'] if d.get('success') else []
print(f'consumption rows now: {len(rows)}', rows[-1] if rows else '')

# link round-trip (with objecttype/objectid now)
s, d = call('/commande/fapi/documents.php', 'POST', {'id': 103, 'action': 'link', 'link': 'https://example.com/spec.pdf', 'label': 'Spec'})
show('add link', s, d)
if d.get('success'):
    links = d['data']['links']
    if links:
        show('delete link', *call('/commande/fapi/documents.php', 'POST', {'id': 103, 'action': 'deletelink', 'linkid': links[-1]['id']}))

# unauthorized-ish check: unknown order id
show('404 check', *call('/commande/fapi/contacts.php?id=999999'))
