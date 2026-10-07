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

# contact add + delete round-trip on order 103 (add internal user id=14, type 91)
s, d = call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'add', 'source': 'internal', 'userid': 14, 'type': 91})
show('add internal contact', s, d)
linkid = None
if d.get('success'):
    rows = d['data']['rows']['internal']
    linkid = rows[-1]['linkid'] if rows else None
    print('  linkid:', linkid)
    s, d = call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'swap', 'lineid': linkid})
    show('swap contact status', s, d)
    s, d = call('/commande/fapi/contacts.php', 'POST', {'id': 103, 'action': 'delete', 'lineid': linkid})
    show('delete contact', s, d)

# consumption: declare 1 unit of product 138 from warehouse 1 on order 103
show('declare consumption', *call('/commande/fapi/consumption.php', 'POST', {'id': 103, 'product': 138, 'id_entrepot': 1, 'nbpiece': 1, 'label': 'fapi test'}))
s, d = call('/commande/fapi/consumption.php?id=103')
rows = d['data']['rows'] if d.get('success') else []
print(f'consumption rows now: {len(rows)}', rows[-1] if rows else '')

# agenda: create event on order 103
show('create event', *call('/commande/fapi/agenda.php', 'POST', {
    'id': 103, 'label': 'FAPI test event', 'note': 'created via fapi',
    'start': '2026-09-20T10:00', 'end': '2026-09-20T11:00', 'complete': '0'}))
s, d = call('/commande/fapi/agenda.php?id=103')
evs = d['data']['events'] if d.get('success') else []
print(f'events now: {len(evs)}', [e['label'] for e in evs[:3]])

# document link add + delete
s, d = call('/commande/fapi/documents.php', 'POST', {'id': 103, 'action': 'link', 'link': 'https://example.com/test-doc', 'label': 'Test link'})
show('add link', s, d)
linkid = None
if d.get('success'):
    links = d['data']['links']
    linkid = links[-1]['id'] if links else None
    print('  linkid:', linkid)
    if linkid:
        show('delete link', *call('/commande/fapi/documents.php', 'POST', {'id': 103, 'action': 'deletelink', 'linkid': linkid}))

# shipment create on order 103: line 111, qty 1, warehouse 1
show('create shipment', *call('/commande/fapi/shipments.php', 'POST', {'id': 103, 'warehouse_id': 1, 'lines': [{'line_id': 111, 'qty': 1}]}))
s, d = call('/commande/fapi/shipments.php?id=103')
sh = d['data']['shipments'] if d.get('success') else []
print(f'shipments now: {len(sh)}', sh)
