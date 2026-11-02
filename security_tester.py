import os
import sys
import time
import requests
import sqlite3
import jwt
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.config import settings

API_BASE = "http://127.0.0.1:8000"

def create_token(username):
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        "token_version": 0
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def run_tests():
    # Setup test users
    conn = sqlite3.connect('data/chatbot.db')
    conn.execute('INSERT OR IGNORE INTO users (id, username, password_hash, status, is_admin) VALUES ("user_a", "usera", "hash", "approved", 0), ("user_b", "userb", "hash", "approved", 0)')
    conn.execute('INSERT OR IGNORE INTO conversations (id, user_id, title) VALUES ("conv_b", "user_b", "User B Secret")')
    conn.execute('INSERT OR IGNORE INTO documents (id, user_id, filename, sha256, size, page_count, status, progress) VALUES ("doc_b", "user_b", "secret.pdf", "hash", 100, 1, "READY", 100)')
    conn.commit()
    conn.close()
    
    token_a = create_token("usera")
    token_b = create_token("userb")
    headers_a = {"Authorization": f"Bearer {token_a}", "Origin": "http://localhost:5173"}
    headers_b = {"Authorization": f"Bearer {token_b}", "Origin": "http://localhost:5173"}
    
    print("--- 1. AUTHORIZATION (IDOR) ---")
    res = requests.get(f"{API_BASE}/api/conversations/conv_b", headers=headers_a)
    print(f"Read B's conversation as A: [{res.status_code}] {res.text}")
    
    res = requests.delete(f"{API_BASE}/api/conversations/conv_b", headers=headers_a)
    print(f"Delete B's conversation as A: [{res.status_code}] {res.text}")
    
    print("\n--- 3. ORIGIN / CSRF ---")
    res = requests.post(f"{API_BASE}/api/conversations", headers={"Authorization": f"Bearer {token_a}"})
    print(f"POST without Origin: [{res.status_code}] {res.text}")
    
    res = requests.post(f"{API_BASE}/api/conversations", headers={"Authorization": f"Bearer {token_a}", "Origin": "null"})
    print(f"POST with 'null' Origin: [{res.status_code}] {res.text}")
    
    res = requests.post(f"{API_BASE}/api/conversations", headers={"Authorization": f"Bearer {token_a}", "Origin": "https://allowed.com.evil.com"})
    print(f"POST with fake Origin: [{res.status_code}] {res.text}")
    
    print("\n--- 6. FILE UPLOAD ---")
    files = {'file': ('fake.exe', b'MZ\x90\x00', 'application/pdf')}
    res = requests.post(f"{API_BASE}/api/documents", headers=headers_a, files=files)
    print(f"Upload .exe as .pdf: [{res.status_code}] {res.text}")
    
    files = {'file': ('null\x00byte.pdf', b'fake', 'application/pdf')}
    res = requests.post(f"{API_BASE}/api/documents", headers=headers_a, files=files)
    print(f"Upload null byte filename: [{res.status_code}] {res.text}")
    
    files = {'file': ('empty.pdf', b'', 'application/pdf')}
    res = requests.post(f"{API_BASE}/api/documents", headers=headers_a, files=files)
    print(f"Upload 0-byte file: [{res.status_code}] {res.text}")
    
    print("\n--- 7. RATE LIMITING ---")
    responses = []
    for _ in range(7):
        res = requests.post(f"{API_BASE}/api/documents", headers=headers_a, files={'file': ('test.pdf', b'fake', 'application/pdf')})
        responses.append(res.status_code)
    print(f"Rate limit on 7 fast uploads (limit 5/min): {responses}")

if __name__ == "__main__":
    run_tests()
