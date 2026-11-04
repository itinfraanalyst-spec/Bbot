import re
import hashlib
import sqlite3
from src.database.adapter import connect_db
import logging
from typing import Optional, Tuple, Dict
from src.config import settings

logger = logging.getLogger(__name__)

# Fast in-memory cache layer: (canonical_query, context_hash) -> response
_MEM_CACHE: Dict[Tuple[str, str], str] = {}
_MAX_MEM_CACHE_SIZE = 500

# Canonical intent mapping for common query patterns
_SUMMARY_PHRASES = {
    "brief of the doc", "brief of doc", "brief the doc", "brief this doc",
    "brief the document", "brief of document", "brief of this document",
    "give me a brief", "give a brief", "doc brief", "document brief",
    "brief summary", "summary of document", "summary of the document",
    "summarize document", "summarize the document", "summarize this doc",
    "summarize this document", "doc summary", "document summary",
    "overview of document", "document overview", "overview of the document",
    "what is this document about", "what is this doc about",
    "tell me about this document", "explain the document", "document outline",
    "executive summary"
}

_GREETING_WORDS = {
    "hello", "hi", "hey", "good morning", "good afternoon",
    "good evening", "namaste", "hello bbot", "hi bbot"
}


def _normalize_text(text: str) -> str:
    """Strip punctuation and whitespace for normalized matching."""
    t = text.lower().strip()
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return " ".join(t.split())


def _resolve_canonical_key(raw_query: str) -> str:
    """
    Maps conversational query variations to high-hit canonical tokens.
    For example: 'brief of the doc', 'summarize this doc', 'document summary'
    all map to '__DOC_SUMMARY__', providing instant sub-millisecond responses.
    """
    q_norm = _normalize_text(raw_query)
    if not q_norm:
        return ""

    if q_norm in _GREETING_WORDS:
        return "__GREETING__"

    if q_norm in _SUMMARY_PHRASES:
        return "__DOC_SUMMARY__"

    words = q_norm.split()
    if len(words) <= 8 and any(w in ["brief", "summarize", "summary", "overview", "synopsis"] for w in words):
        if any(w in ["doc", "document", "this", "manual", "sop", "policy", "file"] for w in words):
            return "__DOC_SUMMARY__"

    return q_norm


def _ensure_cache_table():
    try:
        conn = connect_db(settings.DATABASE_URL)
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
    Checks persistent database & in-memory cache for an exact or semantically
    canonical match against the document context hash.
    Yields instant (<1ms) response with 0 Groq tokens consumed.
    """
    try:
        canonical_key = _resolve_canonical_key(query)
        if len(canonical_key) < 2:
            return None

        c_hash = hashlib.sha256(context_str.encode('utf-8')).hexdigest()[:16]
        cache_tuple = (canonical_key, c_hash)

        # 1. Fast sub-millisecond in-memory lookup
        if cache_tuple in _MEM_CACHE:
            logger.info(f"[CACHE HIT (RAM)] Canonical key='{canonical_key}' matched context_hash={c_hash}")
            return _MEM_CACHE[cache_tuple]

        # 2. SQLite lookup
        conn = connect_db(settings.DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT response FROM semantic_cache WHERE query_normalized = ? AND context_hash = ? ORDER BY id DESC LIMIT 1",
            (canonical_key, c_hash)
        )
        row = cursor.fetchone()
        conn.close()

        if row and row[0]:
            ans = row[0]
            # Populate in-memory cache for subsequent instant hits
            if len(_MEM_CACHE) >= _MAX_MEM_CACHE_SIZE:
                _MEM_CACHE.pop(next(iter(_MEM_CACHE)))
            _MEM_CACHE[cache_tuple] = ans
            logger.info(f"[CACHE HIT (SQLite)] Canonical key='{canonical_key}' matched context_hash={c_hash}")
            return ans

    except Exception as e:
        logger.warning(f"Error reading semantic cache: {e}")
    return None


def set_cached_response(query: str, context_str: str, response: str, conversation_id: str = ""):
    """Stores completed response in both in-memory and persistent SQLite cache."""
    try:
        if not response or not response.strip():
            return
        canonical_key = _resolve_canonical_key(query)
        if len(canonical_key) < 2:
            return

        c_hash = hashlib.sha256(context_str.encode('utf-8')).hexdigest()[:16]
        cache_tuple = (canonical_key, c_hash)

        # 1. Store in RAM cache
        if len(_MEM_CACHE) >= _MAX_MEM_CACHE_SIZE:
            _MEM_CACHE.pop(next(iter(_MEM_CACHE)))
        _MEM_CACHE[cache_tuple] = response

        # 2. Store in persistent SQLite table
        conn = connect_db(settings.DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO semantic_cache (conversation_id, query_normalized, context_hash, response) VALUES (?, ?, ?, ?)",
            (conversation_id, canonical_key, c_hash, response)
        )
        conn.commit()
        conn.close()
        logger.info(f"[CACHE STORED] Canonical key='{canonical_key}' saved with context_hash={c_hash}")

    except Exception as e:
        logger.warning(f"Error writing semantic cache: {e}")
