import sys
from src.auth.security import get_password_hash
from src.database.connection import get_connection

def create_admin():
    username = "bhavya12@mail.com"
    password = "12345"
    password_hash = get_password_hash(password)

    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if user:
            print("User exists, updating to admin...")
            cursor.execute("UPDATE users SET password_hash = ?, is_admin = 1, status = 'approved' WHERE username = ?", (password_hash, username))
        else:
            print("Creating new admin user...")
            import uuid
            user_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO users (id, username, password_hash, is_admin, status)
                VALUES (?, ?, ?, 1, 'approved')
            """, (user_id, username, password_hash))
            
        conn.commit()
        print("Done.")

if __name__ == "__main__":
    create_admin()
