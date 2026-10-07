import json, sys, urllib.request

BASE = "http://172.16.5.10"
KEY = "4b6b34517b9bd8c01bcd7ee2cf67d3c18c82cfc8155d805e0bbf4f1b2372e814"

def call(path, method="GET", body=None, raw=False):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("X-API-Key", KEY)
    data = None
    if body is not None:
        if isinstance(body, dict):
            data = json.dumps(body).encode()
            req.add_header("Content-Type", "application/json")
        else:
            data = body
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            text = r.read().decode("utf-8", "replace")
            ct = r.headers.get("Content-Type", "")
            return r.status, ct, text
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read().decode("utf-8", "replace")

def jcall(path, method="GET", body=None):
    status, ct, text = call(path, method, body)
    try:
        return status, json.loads(text)
    except Exception:
        return status, {"_raw": text[:500], "_ct": ct}

if __name__ == "__main__":
    for path in sys.argv[1:]:
        status, data = jcall(path)
        print(f"=== {path} -> {status}")
        print(json.dumps(data, indent=2)[:3000])
