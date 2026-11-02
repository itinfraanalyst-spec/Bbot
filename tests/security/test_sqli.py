import requests, sys, os, uuid, sqlite3, jwt
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
from src.config import settings

API_BASE = 'http://127.0.0.1:8000'

def get_token(username):
    conn = sqlite3.connect(settings.DATABASE_URL)
    conn.execute("INSERT OR IGNORE INTO users (id, username, password_hash, status, token_version) VALUES (?, ?, ?, 'approved', 0)", (str(uuid.uuid4()), username, 'fake'))
    conn.commit()
    conn.close()
    return jwt.encode({'sub': username, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': f'Bearer {get_token("sqli_user")}'}
payloads = [
    "' OR 1=1 --",
    "'; SELECT sqlite_version(); --",
    "' UNION SELECT 1,2,3 --"
]

print("--- SQL Injection Tests ---")
passed = True

endpoints = [
    ("GET", "/api/conversations/{payload}"),
    ("GET", "/api/conversations/{payload}/documents"),
    ("DELETE", "/api/conversations/{payload}"),
    ("PATCH", "/api/conversations/{payload}/title"),
    ("GET", "/api/documents/{payload}"),
    ("GET", "/api/documents/{payload}/download"),
    ("DELETE", "/api/documents/{payload}")
]

for payload in payloads:
    for method, route in endpoints:
        url = API_BASE + route.replace('{payload}', payload)
        if method == "GET": r = requests.get(url, headers=h)
        elif method == "DELETE": r = requests.delete(url, headers=h)
        elif method == "PATCH": r = requests.patch(url, json={'title': 'test'}, headers=h)
        
        if r.status_code == 500 or (r.status_code == 200 and method != "GET"):
            print(f"FAIL: {method} {url} returned {r.status_code}")
            passed = False
        else:
            print(f"PASS: {method} {route} with payload {payload} returned {r.status_code}")

if not passed: sys.exit(1)
print("ALL SQL INJECTION TESTS PASSED")
