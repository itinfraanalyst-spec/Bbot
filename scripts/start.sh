#!/bin/sh
set -e

# Initialize DB tables
python -c "from src.database.connection import init_db; from src.auth.db import init_users_table; init_db(); init_users_table()"

# Automatically ensure default admin user is initialized and approved
python -c "
from src.auth import db, security
try:
    with db.get_db_connection() as conn:
        conn.execute(
            'INSERT OR REPLACE INTO users (id, username, password_hash, is_admin, status, failed_login_attempts, locked_until) VALUES (?, ?, ?, ?, ?, 0, NULL)',
            ('admin-default-id', 'bhavya12@mail.com', security.get_password_hash('bhavya@12345'), 1, 'approved')
        )
        # Always wipe lockouts and reset attempts for admin on startup
        conn.execute(
            'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, status = \'approved\' WHERE LOWER(username) = \'bhavya12@mail.com\'',
            (security.get_password_hash('bhavya@12345'),)
        )
        conn.commit()
    print('SUCCESS: Admin account initialized & unlocked: bhavya12@mail.com / bhavya@12345 (also supports Bhavya@12345)')
except Exception as e:
    print('Admin init notice:', e)
"

# Start uvicorn server
exec uvicorn src.api.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1

