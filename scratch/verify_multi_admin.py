import requests
import uuid
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def register(username, password):
    res = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password})
    return res.json()

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    return None

def get_me(token):
    res = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
    return res.json()

def approve_user(admin_token, user_id):
    res = requests.post(f"{BASE_URL}/auth/admin/approve/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    return res.status_code

def make_admin(admin_token, user_id):
    res = requests.post(f"{BASE_URL}/auth/admin/make-admin/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    return res.status_code

def force_approve(username):
    import sqlite3
    conn = sqlite3.connect("users.db")
    # Actually the DB path is in settings. Let's just use src.auth.db
    pass

# We should import src.auth.db
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.auth.db import get_db_connection, get_user_by_username

def make_db_admin(username):
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET status='approved', is_admin=1 WHERE username=?", (username,))
        conn.commit()

def run_tests():
    # 1. Setup Admin
    admin_user = f"admin_{uuid.uuid4().hex[:6]}"
    reg_user = f"user_{uuid.uuid4().hex[:6]}"
    
    register(admin_user, "password")
    make_db_admin(admin_user)
    admin_token = login(admin_user, "password")
    admin_id = get_user_by_username(admin_user)["id"]
    
    # 2. Setup Regular User
    reg_data = register(reg_user, "password")
    reg_id = reg_data["id"]
    
    # Approve regular user
    approve_user(admin_token, reg_id)
    reg_token = login(reg_user, "password")

    print("\n--- Step 1: Admin Redirect Condition ---")
    me_admin = get_me(admin_token)
    print("me_admin response:", me_admin)
    print(f"Admin 'is_admin': {me_admin.get('is_admin')} (Frontend will redirect to /admin.html)")

    print("\n--- Step 2: Regular User Redirect Condition ---")
    me_reg = get_me(reg_token)
    print(f"Regular User 'is_admin': {me_reg['is_admin']} (Frontend will redirect to /?v=2)")

    print("\n--- Step 3: Admin Promotes Regular User ---")
    status = make_admin(admin_token, reg_id)
    print(f"POST /auth/admin/make-admin/{reg_id} -> {status} (Expected 200)")

    print("\n--- Step 4: Promoted User Redirect Condition ---")
    me_promoted = get_me(reg_token)
    print(f"Promoted User 'is_admin': {me_promoted['is_admin']} (Frontend will now redirect to /admin.html)")

if __name__ == '__main__':
    run_tests()
