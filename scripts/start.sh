#!/bin/sh
set -e

# Initialize DB tables
python -c "from src.database.connection import init_db; from src.auth.db import init_users_table; init_db(); init_users_table()"

# Automatically ensure admin user is initialized, approved, and preserves existing conversations
python -c "
from src.auth import db, security
from src.database.connection import get_connection
try:
    with db.get_db_connection() as conn:
        existing = conn.execute('SELECT id FROM users WHERE LOWER(username) = \'bhavya12@mail.com\'').fetchone()
        if existing and existing[0]:
            admin_id = existing[0]
            conn.execute(
                'UPDATE users SET password_hash = ?, is_admin = 1, status = \'approved\', failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
                (security.get_password_hash('bhavya@12345'), admin_id)
            )
        else:
            admin_id = 'admin-default-id'
            conn.execute(
                'INSERT INTO users (id, username, password_hash, is_admin, status, failed_login_attempts, locked_until) VALUES (?, \'bhavya12@mail.com\', ?, 1, \'approved\', 0, NULL)',
                (admin_id, security.get_password_hash('bhavya@12345'))
            )
        conn.commit()

    # Ensure all conversations belong to admin so chat history persists across logins
    with get_connection() as c_conn:
        c_conn.execute(
            'UPDATE conversations SET user_id = ? WHERE user_id IS NULL OR user_id = \'admin-default-id\' OR user_id = ?',
            (admin_id, admin_id)
        )
        c_conn.commit()
    print(f'SUCCESS: Admin account ready (id={admin_id}) and chat history linked.')
except Exception as e:
    print('Admin init notice:', e)
"

# Start uvicorn server
exec uvicorn src.api.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
