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

    def execute(self, sql, params=None):
        clean_sql = sql.strip()
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
        translated_sql = sql.replace("?", "%s")
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

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
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
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
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
        
        # Connect to Supabase / PostgreSQL
        raw_conn = psycopg2.connect(clean_url, connect_timeout=15)
        raw_conn.autocommit = False
        return PostgresConnectionWrapper(raw_conn)
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
