import requests, jwt, time, sys, os
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
from src.config import settings
import sqlite3

API_BASE = 'http://127.0.0.1:8000'

def get_token(username):
    conn = sqlite3.connect(settings.DATABASE_URL)
    conn.execute("INSERT OR IGNORE INTO users (id, username, password_hash, status, token_version) VALUES (?, ?, ?, 'approved', 0)", (username, username, 'fake'))
    conn.commit()
    conn.close()
    return jwt.encode({'sub': username, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': f'Bearer {get_token("opt_user")}'}

print('--- Testing Optimizations ---')

def ask(msg, conv_id):
    start = time.time()
    r = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_id, 'message': msg}, headers=h, stream=True)
    ans = ''
    for line in r.iter_lines():
        if line.startswith(b'data: '):
            data = line[6:].decode()
            if data == '[DONE]': break
            if '"chunk"' in data: ans += 'x'
    return time.time() - start

# Test 1: Cache
print('\n1. Testing Semantic Cache')
print('Asking question 1...')
r1 = requests.post(f'{API_BASE}/api/conversations', json={'title': 'Cache 1'}, headers=h)
c1 = r1.json().get('id')
t1 = ask('What is 3+3? Answer in one word.', c1)

print('Asking exact same question in new conversation...')
r2 = requests.post(f'{API_BASE}/api/conversations', json={'title': 'Cache 2'}, headers=h)
c2 = r2.json().get('id')
t2 = ask('What is 3+3? Answer in one word.', c2)

print(f'First request took: {t1:.2f}s')
print(f'Second request took: {t2:.2f}s')
if t2 < 0.5:
    print('PASS: Semantic Cache is working!')
else:
    print('FAIL: Cache did not seem to hit.')


# Test 2: Background Summarization
print('\n2. Testing Background Summarization')
r3 = requests.post(f'{API_BASE}/api/conversations', json={'title': 'Summ Test'}, headers=h)
c3 = r3.json().get('id')

print('Sending 12 short messages to trigger summary (MAX_CONTEXT_MESSAGES is 20, 12 rounds = 24 messages)...')
for i in range(12):
    ask(f'Hello {i}', c3)
    sys.stdout.write('.')
    sys.stdout.flush()

print('\nWaiting 15 seconds for background thread to generate summary...')
time.sleep(15)

conn = sqlite3.connect(settings.DATABASE_URL)
conn.row_factory = sqlite3.Row
summary_row = conn.execute("SELECT summary FROM conversations WHERE id = ?", (c3,)).fetchone()
conn.close()

if summary_row and summary_row['summary']:
    print(f'PASS: Summary was generated: "{summary_row["summary"][:50]}..."')
else:
    print('FAIL: Summary was not generated.')

