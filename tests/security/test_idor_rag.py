import requests, jwt, time, sys, os
from datetime import datetime, timedelta, timezone
import json
sys.path.append(os.getcwd())
from src.config import settings

API_BASE = 'http://127.0.0.1:8000'

def token(user):
    return jwt.encode({'sub': user, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

user_a = token('user_a')
user_b = token('user_b')

print('--- RAG IDOR Test ---')
print('1. User B uploads a unique document')

# Create PDF
from reportlab.pdfgen import canvas
c = canvas.Canvas("b_doc.pdf")
c.drawString(100, 750, "The secret phrase is XYZ123998.")
c.save()

with open('b_doc.pdf', 'rb') as f:
    pdf_bytes = f.read()

r_up = requests.post(f'{API_BASE}/api/documents', files={'file': ('b_doc.pdf', pdf_bytes, 'application/pdf')}, headers={'Authorization': f'Bearer {user_b}'})
doc_id = r_up.json().get('document', {}).get('id', '')
print(f'User B uploaded: {doc_id}')

while True:
    time.sleep(1)
    r_stat = requests.get(f'{API_BASE}/api/documents', headers={'Authorization': f'Bearer {user_b}'})
    docs = r_stat.json().get('documents', [])
    target = next((d for d in docs if d['id'] == doc_id), None)
    if target and target['status'] in ['COMPLETED', 'READY', 'INDEXED']:
        break

print('2. User A tries to associate User B doc with their conversation')
r_conv = requests.post(f'{API_BASE}/api/conversations', json={'title': 'IDOR'}, headers={'Authorization': f'Bearer {user_a}'})
conv_a = r_conv.json().get('id')
r_assoc = requests.post(f'{API_BASE}/api/conversations/{conv_a}/documents', json={'document_id': doc_id}, headers={'Authorization': f'Bearer {user_a}'})
print(f'Assoc Status: {r_assoc.status_code} - {r_assoc.text}')

print('3. User A asks about the secret phrase in the conversation')
q_chat = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_a, 'message': 'what is the secret phrase?'}, headers={'Authorization': f'Bearer {user_a}'})
full_ans = ''
for line in q_chat.iter_lines():
    if line.startswith(b'data: '):
        try:
            data = json.loads(line[6:].decode())
            if 'chunk' in data: full_ans += data['chunk']
        except: pass
print(f'User A Answer: {full_ans}')

if 'XYZ' in full_ans or 'xyz' in full_ans:
    print('FAIL: User A saw User B data')
    sys.exit(1)
print('PASS: User A could not see User B data')
