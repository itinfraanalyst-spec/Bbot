import requests, time, sys, os, uuid
import sqlite3, jwt
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
API_BASE = 'http://127.0.0.1:8000'
from reportlab.pdfgen import canvas
from src.config import settings

u_a = f'user_a_{uuid.uuid4().hex[:6]}'
u_b = f'user_b_{uuid.uuid4().hex[:6]}'

def create_user_get_token(username):
    # Direct DB insertion to bypass approval
    conn = sqlite3.connect(settings.DATABASE_URL)
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    cursor.execute("INSERT INTO users (id, username, password_hash, status, token_version) VALUES (?, ?, ?, 'approved', 0)", (user_id, username, 'fake_hash'))
    conn.commit()
    conn.close()
    
    return jwt.encode({'sub': username, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

tok_a = create_user_get_token(u_a)
tok_b = create_user_get_token(u_b)

s_a = requests.Session()
s_a.headers.update({'Authorization': f'Bearer {tok_a}'})
s_b = requests.Session()
s_b.headers.update({'Authorization': f'Bearer {tok_b}'})

print('--- Document IDOR Tests ---')
c = canvas.Canvas("b_doc.pdf")
c.drawString(100, 750, "User B secret data.")
c.save()
with open('b_doc.pdf', 'rb') as f: pdf_bytes = f.read()

r_up = s_b.post(f'{API_BASE}/api/documents', files={'file': ('b_doc.pdf', pdf_bytes, 'application/pdf')})
doc_id = r_up.json()['document']['id']
print(f'User B uploaded doc: {doc_id}')

while True:
    time.sleep(1)
    r_stat = s_b.get(f'{API_BASE}/api/documents')
    target = next((d for d in r_stat.json()['documents'] if d['id'] == doc_id), None)
    if target and target['status'] in ['COMPLETED', 'READY', 'INDEXED']: break

# 1. User A lists docs
r_list = s_a.get(f'{API_BASE}/api/documents')
if any(d['id'] == doc_id for d in r_list.json()['documents']):
    print('FAIL: User A saw User B doc in list')
    sys.exit(1)
print('PASS: User A cannot list User B doc')

# 2. User A downloads doc
r_dl = s_a.get(f'{API_BASE}/api/documents/{doc_id}/download')
if r_dl.status_code == 200:
    print('FAIL: User A downloaded User B doc')
    sys.exit(1)
print('PASS: User A cannot download User B doc')

# 3. User A deletes doc
r_del = s_a.delete(f'{API_BASE}/api/documents/{doc_id}')
if r_del.status_code == 200:
    print('FAIL: User A deleted User B doc')
    sys.exit(1)
print('PASS: User A cannot delete User B doc')

# 4. User A associates doc with their conversation (RAG retrieval IDOR)
r_conv = s_a.post(f'{API_BASE}/api/conversations', json={'title': 'IDOR'})
conv_a = r_conv.json()['id']
r_assoc = s_a.post(f'{API_BASE}/api/conversations/{conv_a}/documents', json={'document_id': doc_id})
if r_assoc.status_code == 200:
    print('FAIL: User A associated User B doc with their conversation')
    sys.exit(1)
print('PASS: User A cannot associate User B doc with their conversation')

# 5. User A tries to retrieve from User B doc by passing conversation_id of User B (Message IDOR)
r_conv_b = s_b.post(f'{API_BASE}/api/conversations', json={'title': 'IDOR_B'})
conv_b = r_conv_b.json()['id']
s_b.post(f'{API_BASE}/api/conversations/{conv_b}/documents', json={'document_id': doc_id})

# User A asks about secret phrase in User B's conversation
q_chat = s_a.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_b, 'message': 'what is the secret data?'})
if q_chat.status_code == 200:
    full_ans = ''
    for line in q_chat.iter_lines():
        if line.startswith(b'data: '):
            try:
                import json
                data = json.loads(line[6:].decode())
                if 'chunk' in data: full_ans += data['chunk']
            except: pass
    if 'secret' in full_ans.lower():
        print('FAIL: User A retrieved User B data via chat')
        sys.exit(1)
print('PASS: User A cannot query User B conversation')

print('--- Message IDOR Tests ---')

# 1. User A reads User B conversation
r_read = s_a.get(f'{API_BASE}/api/conversations/{conv_b}')
if r_read.status_code == 200:
    print('FAIL: User A read User B conversation')
    sys.exit(1)
print('PASS: User A cannot read User B conversation')

# 2. User A writes to User B conversation
r_write = s_a.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_b, 'message': 'hello'})
if r_write.status_code == 200:
    print('FAIL: User A wrote to User B conversation')
    sys.exit(1)
print('PASS: User A cannot write to User B conversation')

print('\nALL IDOR TESTS PASSED')
