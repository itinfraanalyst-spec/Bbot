import requests, jwt, time, sys, os
import threading
import sqlite3
from datetime import datetime, timedelta, timezone
sys.path.append(os.getcwd())
from src.config import settings

API_BASE = 'http://127.0.0.1:8000'

def get_token(username):
    conn = sqlite3.connect(settings.DATABASE_URL)
    conn.execute("INSERT OR IGNORE INTO users (id, username, password_hash, status, token_version) VALUES (?, ?, ?, 'approved', 0)", (username, username, 'fake'))
    conn.commit()
    conn.close()
    return jwt.encode({'sub': username, 'exp': datetime.now(timezone.utc) + timedelta(minutes=30), 'token_version': 0}, settings.JWT_SECRET, algorithm='HS256')

h = {'Authorization': f'Bearer {get_token("opt_user")}'}

print('--- Testing System Consistency & Concurrency ---')

def ask_bot(question, name):
    r1 = requests.post(f'{API_BASE}/api/conversations', json={'title': f'Consistency {name}'}, headers=h)
    conv_id = r1.json().get('id')
    
    start = time.time()
    r = requests.post(f'{API_BASE}/api/chat', json={'conversation_id': conv_id, 'message': question}, headers=h, stream=True)
    
    ans = ''
    for line in r.iter_lines():
        if line.startswith(b'data: '):
            data = line[6:].decode()
            if data == '[DONE]': break
            if '"chunk"' in data:
                import json
                try:
                    j = json.loads(data)
                    ans += j['chunk']
                except:
                    pass
    
    elapsed = time.time() - start
    print(f'[{name}] Finished in {elapsed:.2f}s. Response: "{ans[:100]}..."')
    return ans

questions = [
    ("What is the capital of France? Name just the city.", "Q1_France"),
    ("What color is the clear sky on a sunny day? One word.", "Q2_Sky"),
    ("Name the largest planet in our solar system. One word.", "Q3_Space")
]

threads = []
results = {}

def worker(q, name):
    res = ask_bot(q, name)
    results[name] = res

print("Spawning 3 concurrent requests to test the queue and lock consistency...")
for q, name in questions:
    t = threading.Thread(target=worker, args=(q, name))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print("\n--- Results Analysis ---")
errors = 0
if "paris" not in results["Q1_France"].lower():
    print("FAIL: Q1 mixed up or failed.")
    errors += 1
if "blue" not in results["Q2_Sky"].lower():
    print("FAIL: Q2 mixed up or failed.")
    errors += 1
if "jupiter" not in results["Q3_Space"].lower():
    print("FAIL: Q3 mixed up or failed.")
    errors += 1

if errors == 0:
    print("PASS: System is perfectly consistent! Responses did not mix, and queue handled concurrency beautifully.")
else:
    print(f"FAIL: {errors} inconsistency errors found.")

