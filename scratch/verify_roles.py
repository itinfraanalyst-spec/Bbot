import requests
import uuid
import sys
import os

# Ensure src can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.auth.db import get_db_connection

BASE_URL = "http://127.0.0.1:8000"

def log(msg):
    print(f"[*] {msg}")

def register(username, password):
    res = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password})
    return res.json()

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    return None

def test_regular_endpoint(token):
    res = requests.get(f"{BASE_URL}/api/conversations", headers={"Authorization": f"Bearer {token}"})
    return res.status_code

def test_admin_endpoint(token):
    res = requests.get(f"{BASE_URL}/auth/admin/pending", headers={"Authorization": f"Bearer {token}"})
    return res.status_code

def promote_to_admin(username):
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET status = 'approved', is_admin = 1 WHERE username = ?", (username,))
        conn.commit()

def approve_user(username):
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET status = 'approved' WHERE username = ?", (username,))
        conn.commit()

def run_tests():
    admin_user = f"admin_{uuid.uuid4().hex[:6]}"
    reg_user = f"user_{uuid.uuid4().hex[:6]}"
    pend_user = f"pend_{uuid.uuid4().hex[:6]}"
    
    register(admin_user, "password")
    promote_to_admin(admin_user)
    admin_token = login(admin_user, "password")
    
    register(reg_user, "password")
    approve_user(reg_user)
    reg_token = login(reg_user, "password")

    log("--- CHECK 1: Admin on Regular Endpoints ---")
    status = test_regular_endpoint(admin_token)
    log(f"  GET /api/conversations -> {status} (Expected 200)")
    
    chat_res = requests.post(f"{BASE_URL}/api/chat", json={"message": "hello", "conversation_id": None}, headers={"Authorization": f"Bearer {admin_token}"})
    log(f"  POST /api/chat as admin -> {chat_res.status_code} (Expected 200)")

    log("--- CHECK 2: Non-Admin on Admin Endpoints ---")
    status = test_admin_endpoint(reg_token)
    log(f"  GET /auth/admin/pending -> {status} (Expected 403)")
    
    res_approve = requests.post(f"{BASE_URL}/auth/admin/approve/1", headers={"Authorization": f"Bearer {reg_token}"})
    log(f"  POST /auth/admin/approve/1 -> {res_approve.status_code} (Expected 403)")

    log("--- CHECK 3: Browser UI logic (Simulated) ---")
    log(f"  Admin can chat: {chat_res.status_code == 200}")
    admin_res = test_admin_endpoint(admin_token)
    log(f"  Admin can fetch admin page data: {admin_res == 200}")

    log("--- CHECK 4: Pending User Verification ---")
    register(pend_user, "password")
    pend_login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": pend_user, "password": "password"})
    log(f"  POST /auth/login for pending user -> {pend_login_res.status_code}")
    if pend_login_res.status_code == 200:
        p_token = pend_login_res.json()["access_token"]
        p_reg_status = test_regular_endpoint(p_token)
        p_adm_status = test_admin_endpoint(p_token)
        log(f"  GET /api/conversations as pending -> {p_reg_status}")
        log(f"  GET /auth/admin/pending as pending -> {p_adm_status}")
    else:
        log("  Pending user is blocked at login (cannot get token). Thus they are completely blocked from all endpoints.")

if __name__ == '__main__':
    run_tests()
