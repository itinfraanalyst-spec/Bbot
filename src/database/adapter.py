import re
import os
import sqlite3
from contextlib import contextmanager

try:
    import psycopg2
    import psycopg2.extras
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

def is_postgres(url: str) -> bool:
    return url.startswith("postgres://") or url.startswith("postgresql://")

class PostgresRowWrapper:
    """Wrapper around psycopg2 RealDictRow to allow both dict key access and index access."""
    def __init__(self, row_dict, values_tuple):
        self._dict = row_dict
        self._tuple = values_tuple

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._tuple[key]
        return self._dict[key]

    def get(self, key, default=None):
        return self._dict.get(key, default)

    def keys(self):
        return self._dict.keys()

    def values(self):
        return self._dict.values()

    def items(self):
        return self._dict.items()

    def __contains__(self, key):
        return key in self._dict

    def __repr__(self):
        return repr(self._dict)

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor

    @property
    def description(self):
        return self._cursor.description

    @property
    def rowcount(self):
        return self._cursor.rowcount

    @property
    def lastrowid(self):
        return getattr(self._cursor, "lastrowid", None)

    def _translate_sql(self, sql: str) -> str:
        clean_sql = sql.strip()
        # Translate SQLite boolean integer syntax to PostgreSQL boolean syntax
        clean_sql = re.sub(
            r"\b(is_active|is_pinned|is_admin|reset_requested|is_public|enabled|is_default)\s*=\s*1\b",
            r"\1 = TRUE",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"\b(is_active|is_pinned|is_admin|reset_requested|is_public|enabled|is_default)\s*=\s*0\b",
            r"\1 = FALSE",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(r"\s+COLLATE\s+NOCASE\b", "", clean_sql, flags=re.IGNORECASE)

        # Translate SQLite 'INSERT OR IGNORE INTO table ...' -> PostgreSQL 'INSERT INTO table ... ON CONFLICT DO NOTHING'
        if re.search(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", clean_sql, re.IGNORECASE):
            clean_sql = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT INTO", clean_sql, flags=re.IGNORECASE)
            if "ON CONFLICT" not in clean_sql.upper():
                clean_sql = clean_sql.rstrip("; \t\n\r") + " ON CONFLICT DO NOTHING"

        # Translate SQLite datetime/date modifiers to PostgreSQL intervals
        clean_sql = re.sub(
            r"datetime\(\s*'now'\s*,\s*'-?(\d+)\s*hours?'\s*\)",
            r"(CURRENT_TIMESTAMP - INTERVAL '\1 hours')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"datetime\(\s*'now'\s*,\s*'-?(\d+)\s*days?'\s*\)",
            r"(CURRENT_TIMESTAMP - INTERVAL '\1 days')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"date\(\s*'now'\s*,\s*'-?(\d+)\s*(days?|months?|years?)'\s*\)",
            r"(CURRENT_DATE - INTERVAL '\1 \2')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"DATE\(\s*'now'\s*,\s*'-?(\d+)\s*(days?|months?|years?)'\s*\)",
            r"(CURRENT_DATE - INTERVAL '\1 \2')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"DATE\(\s*'now'\s*\)",
            r"CURRENT_DATE",
            clean_sql,
            flags=re.IGNORECASE,
        )

        # Translate SQLite strftime to PostgreSQL TO_CHAR
        clean_sql = re.sub(
            r"strftime\(\s*'%Y-%m-%d %H:00'\s*,\s*([^)]+)\)",
            r"TO_CHAR(\1, 'YYYY-MM-DD HH24:00')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"strftime\(\s*'%Y-%W'\s*,\s*([^)]+)\)",
            r"TO_CHAR(\1, 'YYYY-WW')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"strftime\(\s*'%Y-%m'\s*,\s*([^)]+)\)",
            r"TO_CHAR(\1, 'YYYY-MM')",
            clean_sql,
            flags=re.IGNORECASE,
        )
        clean_sql = re.sub(
            r"strftime\(\s*'%Y'\s*,\s*([^)]+)\)",
            r"TO_CHAR(\1, 'YYYY')",
            clean_sql,
            flags=re.IGNORECASE,
        )

        return clean_sql

    def execute(self, sql, params=None):
        clean_sql = sql.strip()
        clean_sql = self._translate_sql(clean_sql)
        # Ignore SQLite PRAGMAs in PostgreSQL
        if clean_sql.upper().startswith("PRAGMA "):
            return self

        # PostgreSQL transaction control: ignore BEGIN IMMEDIATE (psycopg2 handles transactions)
        if clean_sql.upper() in ("BEGIN IMMEDIATE", "BEGIN IMMEDIATE;"):
            return self

        # Translate ? parameter placeholders to %s for PostgreSQL
        if params is not None:
            # Replace ? with %s
            translated_sql = clean_sql.replace("?", "%s")
            self._cursor.execute(translated_sql, params)
        else:
            self._cursor.execute(clean_sql)
        return self

    def executemany(self, sql, seq_of_params):
        clean_sql = self._translate_sql(sql)
        translated_sql = clean_sql.replace("?", "%s")
        self._cursor.executemany(translated_sql, seq_of_params)
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        # row is a RealDictRow
        return PostgresRowWrapper(row, tuple(row.values()))

    def fetchall(self):
        rows = self._cursor.fetchall()
        return [PostgresRowWrapper(r, tuple(r.values())) for r in rows]

    def fetchmany(self, size=None):
        rows = self._cursor.fetchmany(size) if size is not None else self._cursor.fetchmany()
        return [PostgresRowWrapper(r, tuple(r.values())) for r in rows]

    def close(self):
        self._cursor.close()

    def __iter__(self):
        return iter(self.fetchall())

import threading

_pg_pool = None
_pg_pool_lock = threading.Lock()

def get_pg_pool(clean_url: str):
    global _pg_pool
    if _pg_pool is None:
        with _pg_pool_lock:
            if _pg_pool is None:
                import psycopg2.pool
                _pg_pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=3,
                    maxconn=20,
                    dsn=clean_url,
                    connect_timeout=15,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5,
                )
    return _pg_pool

class PostgresConnectionWrapper:
    def __init__(self, conn, pool=None):
        self._conn = conn
        self._pool = pool
        self._closed = False
        self.row_factory = None

    def cursor(self):
        raw_cursor = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PostgresCursorWrapper(raw_cursor)

    def execute(self, sql, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def executemany(self, sql, params):
        cur = self.cursor()
        cur.executemany(sql, params)
        return cur

    def commit(self):
        try:
            self._conn.commit()
        except Exception:
            pass

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self._pool is not None:
            try:
                self._pool.putconn(self._conn)
            except Exception:
                try:
                    self._conn.close()
                except Exception:
                    pass
        else:
            try:
                self._conn.close()
            except Exception:
                pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                self.rollback()
            else:
                self.commit()
        finally:
            self.close()

def connect_db(url: str):
    """Universal connection factory that seamlessly connects to PostgreSQL or SQLite."""
    if is_postgres(url):
        if not HAS_POSTGRES:
            raise RuntimeError("psycopg2 is required for PostgreSQL / Supabase connections. Run 'pip install psycopg2-binary'.")
        # Ensure postgresql:// prefix (some providers use postgres://)
        clean_url = url
        if clean_url.startswith("postgres://"):
            clean_url = clean_url.replace("postgres://", "postgresql://", 1)
        
        # Connect to Supabase / PostgreSQL via pool
        pool = get_pg_pool(clean_url)
        try:
            raw_conn = pool.getconn()
            if raw_conn.closed != 0:
                pool.putconn(raw_conn, close=True)
                raw_conn = pool.getconn()
            raw_conn.autocommit = False
            return PostgresConnectionWrapper(raw_conn, pool=pool)
        except Exception:
            raw_conn = psycopg2.connect(
                clean_url,
                connect_timeout=15,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
            )
            raw_conn.autocommit = False
            return PostgresConnectionWrapper(raw_conn, pool=None)
    else:
        # SQLite
        os.makedirs(os.path.dirname(os.path.abspath(url)) if os.path.dirname(url) else ".", exist_ok=True)
        conn = sqlite3.connect(url, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA busy_timeout = 15000;")
            conn.execute("PRAGMA synchronous = NORMAL;")
        except Exception:
            pass
        return conn

