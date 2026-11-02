import requests, jwt, sys, os, time
from datetime import datetime, timedelta, timezone

API_BASE = 'http://127.0.0.1:8000'
sys.path.append(os.getcwd())
from src.config import settings
import fitz

def token(u):
    return jwt.encode({'sub': u, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h_a = {'Authorization': 'Bearer ' + token('userA')}
h_b = {'Authorization': 'Bearer ' + token('userB')}

print('--- IDOR Documents Test ---')
# User B creates a document
doc = fitz.open()
page = doc.new_page()
page.insert_text((0,0), "The secret vault code is 49201")
pdf_bytes = doc.write()
doc.close()

r_b_upload = requests.post(f'{API_BASE}/api/documents', files={'file': ('vault.pdf', pdf_bytes, 'application/pdf')}, headers=h_b)
doc_id = r_b_upload.json().get('document', {}).get('id', '')
if not doc_id:
    print(f'Failed to upload doc as B: {r_b_upload.status_code} {r_b_upload.text}')
    sys.exit(1)
print(f'User B uploaded document: {doc_id}')

# Wait for processing
time.sleep(2)

# User A tries to read/delete it
r_a_list = requests.get(f'{API_BASE}/api/documents', headers=h_a)
print(f'User A lists docs, sees B\'s doc? {doc_id in r_a_list.text}')

r_a_download = requests.get(f'{API_BASE}/api/documents/{doc_id}/download', headers=h_a)
print(f'User A downloads B\'s doc: {r_a_download.status_code}')

r_a_reindex = requests.post(f'{API_BASE}/api/documents/{doc_id}/reindex', headers=h_a)
print(f'User A reindexes B\'s doc: {r_a_reindex.status_code}')

r_a_delete = requests.delete(f'{API_BASE}/api/documents/{doc_id}', headers=h_a)
print(f'User A deletes B\'s doc: {r_a_delete.status_code}')

# User A tries retrieval
r_a_chat = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': None, 'message': 'What is the secret vault code?'}, headers=h_a)
res_text = ''
for line in r_a_chat.iter_lines(): res_text += line.decode()
print(f"User A retrieved secret code? {'49201' in res_text}")

if r_a_download.status_code == 200 or '49201' in res_text:
    print('FAIL: IDOR detected')
    sys.exit(1)

print('PASS')
