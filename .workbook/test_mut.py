import json, urllib.request, urllib.error, urllib.parse

BASE = 'http://172.16.5.10'
KEY = '4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814'

def call(path, method='GET', body=None, key=KEY, form=False):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header('X-API-Key', key)
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
    msg = d.get('message')
    extra = ''
    if d.get('data') and isinstance(d['data'], dict):
        extra = ' | ' + json.dumps({k: v for k, v in list(d['data'].items())[:4]})[:200]
    print(f'{label}: HTTP {s} success={d.get("success")} msg={msg}{extra}')

# --- notes round trip on order 1 (draft)
show('set public note', *call('/commande/fapi/notes.php', 'POST', {'id': 1, 'note_public': 'API test note'}))
show('read notes', *call('/commande/fapi/notes.php?id=1'))
show('clear public note', *call('/commande/fapi/notes.php', 'POST', {'id': 1, 'note_public': ''}))

# --- field setter round trip
show('setref_client', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'setref_client', 'ref_client': 'TEST-REF-1'}))
show('setref_client revert', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'setref_client', 'ref_client': ''}))
show('setwarehouse', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'setwarehouse', 'warehouse_id': 1}))
show('setmode', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'setmode', 'mode_reglement_id': 1}))
show('setconditions', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'setconditions', 'cond_reglement_id': 1}))

# --- line ops on draft order 1
show('addline', *call('/commande/fapi/lines.php', 'POST', {'id': 1, 'action': 'addline', 'product_id': 1, 'qty': 2}))
# grab the new line id
s, d = call('/commande/fapi/get.php?id=1')
if d.get('success'):
    lines = d['data']['lines']
    lastid = lines[-1]['id'] if lines else 0
    print('new line id:', lastid, 'total_ht:', d['data']['total_ht'])
    show('updateline qty', *call('/commande/fapi/lines.php', 'POST', {'id': 1, 'action': 'updateline', 'lineid': lastid, 'qty': 3}))
    show('deleteline', *call('/commande/fapi/lines.php', 'POST', {'id': 1, 'action': 'deleteline', 'lineid': lastid}))

# --- unknown action
show('bad action', *call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'bogus'}))

# --- clone order 1 (creates a draft clone we can delete)
s, d = call('/commande/fapi/actions.php', 'POST', {'id': 1, 'action': 'clone', 'socid': 1964})
show('clone', s, d)
if d.get('success'):
    clone_id = d['data']['id']
    show('delete clone', *call('/commande/fapi/actions.php', 'POST', {'id': clone_id, 'action': 'delete'}))
