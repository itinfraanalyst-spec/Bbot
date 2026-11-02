import re
import hashlib
import sqlite3
import logging
from typing import Optional, Tuple
from src.config import settings

logger = logging.getLogger(__name__)

def _normalize_text(text: str) -> str:
    """Strip punctuation and whitespace for normalized matching."""
    t = text.lower().strip()
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return " ".join(t.split())

def _ensure_cache_table():
    try:
        conn = sqlite3.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS semantic_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT,
                query_normalized TEXT,
                context_hash TEXT,
                response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cache_query ON semantic_cache(query_normalized, context_hash)')
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Failed to ensure semantic_cache table: {e}")

_ensure_cache_table()

def get_cached_response(query: str, context_str: str) -> Optional[str]:
    """
    Checks persistent database cache for an exact or semantically normalized match
    against the same document context hash.
    """
    try:
        q_norm = _normalize_text(query)
        if len(q_norm) < 3:
            return None
            
        c_hash = hashlib.sha256(context_str.encode('utf-8')).hexdigest()[:16]
        
        conn = sqlite3.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT response FROM semantic_cache WHERE query_normalized = ? AND context_hash = ? ORDER BY id DESC LIMIT 1",
            (q_norm, c_hash)
        )
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return row[0]
    except Exception as e:
        logger.warning(f"Error reading semantic cache: {e}")
    return None

def set_cached_response(query: str, context_str: str, response: str, conversation_id: str = ""):
    """Stores completed response in persistent SQLite cache."""
    try:
        if not response or not response.strip():
            return
        q_norm = _normalize_text(query)
        if len(q_norm) < 3:
            return
            
        c_hash = hashlib.sha256(context_str.encode('utf-8')).hexdigest()[:16]
        
        conn = sqlite3.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO semantic_cache (conversation_id, query_normalized, context_hash, response) VALUES (?, ?, ?, ?)",
            (conversation_id, q_norm, c_hash, response)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Error writing semantic cache: {e}")
