import requests, jwt, time, sys, os, threading
from datetime import datetime, timedelta, timezone

API_BASE = 'http://127.0.0.1:8000'
sys.path.append(os.getcwd())
from src.config import settings
import urllib.request, json

def token():
    return jwt.encode({'sub': 'discuser', 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

headers = {'Authorization': 'Bearer ' + token(), 'Origin': 'http://localhost:5173', 'Content-Type': 'application/json'}
payload = json.dumps({'conversation_id': None, 'message': 'Write a very long story'}).encode('utf-8')

print('--- Disconnect Leak Test ---')
import socket

def raw_post():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('127.0.0.1', 8000))
    req = f"POST /api/chat HTTP/1.1\r\nHost: 127.0.0.1:8000\r\nAuthorization: Bearer {token()}\r\nContent-Type: application/json\r\nContent-Length: {len(payload)}\r\n\r\n"
    s.sendall(req.encode('utf-8') + payload)
    s.recv(1024)
    s.close() # Abruptly close

threads = []
for i in range(6):
    t = threading.Thread(target=raw_post)
    t.start()
    threads.append(t)
    time.sleep(0.1)

for t in threads: t.join()

time.sleep(2)
r = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': None, 'message': 'hi'}, headers={'Authorization': 'Bearer ' + token()})
if r.status_code == 200:
    print(f'7th request after 6 abrupt closes: 200 OK. PASS')
else:
    print(f'7th request: {r.status_code} FAIL')
    sys.exit(1)
