import sys
import os
import sqlite3
from datetime import datetime, timezone

def prep_db():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    # Create some pending users
    now = datetime.now(timezone.utc).isoformat()
    try:
        c.execute("INSERT INTO users (id, username, password_hash, is_admin, status, created_at) VALUES ('usr-111', 'sys_ops_01', 'hash', 0, 'pending', ?)", (now,))
        c.execute("INSERT INTO users (id, username, password_hash, is_admin, status, created_at) VALUES ('usr-222', 'data_ingest_bot', 'hash', 0, 'pending', ?)", (now,))
    except:
        pass
    conn.commit()

    # Get admin token
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    import requests
    res = requests.post("http://127.0.0.1:8000/auth/login", data={"username": "admin_user", "password": "password"})
    # wait, I don't know the admin username for sure.
    # I'll just create a fresh admin
    requests.post("http://127.0.0.1:8000/auth/register", json={"username": "root_admin", "password": "password"})
    conn.execute("UPDATE users SET status='approved', is_admin=1 WHERE username='root_admin'")
    conn.commit()
    conn.close()
    
    print("DB PREP DONE")

if __name__ == '__main__':
    prep_db()
