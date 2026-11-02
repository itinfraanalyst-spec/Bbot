import requests, jwt, time, sys, os
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
from src.config import settings
import json

API_BASE = 'http://127.0.0.1:8000'

def token():
    return jwt.encode({'sub': 'userA', 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': 'Bearer ' + token()}

print('--- RAG Test on Upgraded Env ---')
text_content = b"Article 3: The judicial power of the United States shall be vested in one supreme Court. Article 7: The ratification of the conventions of nine states, shall be sufficient for the establishment of this Constitution."

r_up = requests.post(f'{API_BASE}/api/documents', files={'file': ('constitution.txt', text_content, 'text/plain')}, headers=h)
doc_id = r_up.json().get('document', {}).get('id', '')
if not doc_id:
    print(r_up.text)
    sys.exit(1)
time.sleep(3)

q = "explain article 3 and article 7"
r_chat = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': None, 'message': q}, headers=h)
res_text = ''
for line in r_chat.iter_lines():
    if line.startswith(b'data: '):
        try:
            data = json.loads(line[6:].decode())
            if 'chunk' in data: res_text += data['chunk']
        except: pass

print("Answer:", res_text)
if "supreme Court" in res_text and "nine states" in res_text:
    print("PASS: RAG works correctly with upgraded dependencies")
else:
    print("FAIL: RAG failed")
    sys.exit(1)
