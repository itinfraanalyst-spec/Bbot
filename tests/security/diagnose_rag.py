import requests, jwt, time, sys, os
from datetime import datetime, timedelta, timezone
import json
sys.path.append(os.getcwd())
from src.config import settings

API_BASE = 'http://127.0.0.1:8000'

def token():
    return jwt.encode({'sub': 'raguser', 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': 'Bearer ' + token()}
print('--- RAG Diagnostics ---')

with open('constitution.pdf', 'rb') as f:
    pdf_bytes = f.read()

# Upload
r_up = requests.post(f'{API_BASE}/api/documents', files={'file': ('constitution.pdf', pdf_bytes, 'application/pdf')}, headers=h)
doc_data = r_up.json().get('document', {})
doc_id = doc_data.get('id', '')
if not doc_id:
    print('Failed upload:', r_up.text)
    sys.exit(1)
print(f'Uploaded: {doc_id}')

# Poll status
while True:
    time.sleep(1)
    r_stat = requests.get(f'{API_BASE}/api/documents', headers=h)
    docs = r_stat.json().get('documents', [])
    target = next((d for d in docs if d['id'] == doc_id), None)
    if not target:
        print('Doc not found in list!')
        sys.exit(1)
    print(f"Status: {target['status']}, Progress: {target['progress']}")
    if target['status'] in ['COMPLETED', 'READY', 'INDEXED']:
        break
    if target['status'] in ['FAILED', 'ERROR']:
        print('Doc processing failed!')
        sys.exit(1)

# Wait 1s just to be sure
time.sleep(1)

# Create conversation
r_conv = requests.post(f'{API_BASE}/api/conversations', json={'title': 'RAG Test'}, headers=h)
conv_id = r_conv.json().get('id')
if not conv_id:
    print('Failed to create conversation', r_conv.text)
    sys.exit(1)

# Associate document
r_assoc = requests.post(f'{API_BASE}/api/conversations/{conv_id}/documents', json={'document_id': doc_id}, headers=h)
if r_assoc.status_code != 200:
    print('Failed to associate doc', r_assoc.text)
    sys.exit(1)
print(f'Associated doc {doc_id} with conv {conv_id}')

query = "explain article 3"

# We need to query chroma directly for chunk count and top chunks
try:
    from src.core.embeddings import NomicEmbeddingProvider
    from src.core.chroma_store import get_collection
    collection = get_collection()
    res = collection.get(where={"doc_id": doc_id})
    print(f'Stored chunks: {len(res["ids"])}')

    provider = NomicEmbeddingProvider()
    qe = provider.embed_query(query)
    # RAG search logic uses doc_id in where clause
    results = collection.query(query_embeddings=[qe], n_results=3, where={"doc_id": {"$in": [doc_id]}})
    print('--- Top retrieved chunks via chroma ---')
    if len(results['documents']) > 0 and len(results['documents'][0]) > 0:
        for i, d in enumerate(results['documents'][0]):
            dist = results['distances'][0][i]
            meta = results['metadatas'][0][i]
            print(f"Dist: {dist:.4f} | File: {meta.get('filename', 'N/A')} | Page: {meta.get('page_start')} | Text: {d[:100]}...")
    else:
        print("No chunks retrieved.")
except Exception as e:
    print("Error querying Chroma:", type(e).__name__, e)

# Query via chat endpoint
print('--- Chat Response via API ---')
q_chat = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_id, 'message': query}, headers=h)
full_ans = ''
for line in q_chat.iter_lines():
    if line.startswith(b'data: '):
        try:
            data = json.loads(line[6:].decode())
            if 'chunk' in data: full_ans += data['chunk']
        except: pass
print(full_ans)
