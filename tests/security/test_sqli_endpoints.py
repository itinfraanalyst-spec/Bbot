import requests, jwt, os, sys
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
from src.config import settings

def token():
    return jwt.encode({'sub': 'sqliuser', 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': 'Bearer ' + token()}
API_BASE = 'http://127.0.0.1:8000'

payloads = ["' OR 1=1 --", "'; SELECT sqlite_version(); --", "' UNION SELECT 1,2,3 --"]

print('--- SQL Injection Tests ---')
endpoints = [
    ('GET', f'{API_BASE}/api/conversations/{{}}'),
    ('DELETE', f'{API_BASE}/api/conversations/{{}}'),
    ('PATCH', f'{API_BASE}/api/conversations/{{}}/title', {'title': '{}'}),
    ('GET', f'{API_BASE}/api/documents/{{}}/download'),
    ('POST', f'{API_BASE}/api/chat', {'conversation_id': '{}', 'message': '{}'})
]

for method, url, *body in endpoints:
    for p in payloads:
        try:
            req_url = url.format(p)
            req_body = None
            if body:
                req_body = {k: v.format(p) if isinstance(v, str) else v for k, v in body[0].items()}
            
            if method == 'GET': r = requests.get(req_url, headers=h)
            elif method == 'POST': r = requests.post(req_url, json=req_body, headers=h)
            elif method == 'PATCH': r = requests.patch(req_url, json=req_body, headers=h)
            elif method == 'DELETE': r = requests.delete(req_url, headers=h)
            
            print(f'{method} {req_url} -> {r.status_code}')
            if r.status_code == 200 and 'UNION' in r.text:
                print('FAIL: SQLi might be possible')
                sys.exit(1)
        except Exception as e:
            pass

print('PASS')
