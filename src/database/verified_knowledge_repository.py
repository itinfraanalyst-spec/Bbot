import re
import uuid
import time
from typing import Dict, List, Optional

from src.database.connection import get_connection

_vk_cache: Optional[List[Dict]] = None
_vk_cache_timestamp: float = 0.0
_VK_CACHE_TTL: float = 30.0


def _get_active_verified_knowledge() -> List[Dict]:
    global _vk_cache, _vk_cache_timestamp
    now = time.time()
    if _vk_cache is not None and (now - _vk_cache_timestamp < _VK_CACHE_TTL):
        return _vk_cache
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM verified_knowledge WHERE is_active = TRUE ORDER BY created_at DESC"
        ).fetchall()
        _vk_cache = [dict(r) for r in rows]
        _vk_cache_timestamp = now
    return _vk_cache


def invalidate_verified_knowledge_cache() -> None:
    global _vk_cache
    _vk_cache = None


class VerifiedKnowledgeRepository:
    """Stores admin-approved corrections without changing model weights."""

    @staticmethod
    def _terms(text: str) -> set[str]:
        return {
            term for term in re.findall(r"\b[a-z0-9]{3,}\b", text.lower())
            if term not in {"the", "and", "for", "with", "that", "this", "what", "how", "are", "you"}
        }

    def save(self, user_id: str, source_feedback_message_id: str, question: str, correction: str, created_by: str) -> Dict:
        knowledge_id = str(uuid.uuid4())
        invalidate_verified_knowledge_cache()
        with get_connection() as conn:
            conn.execute("""
                INSERT INTO verified_knowledge
                    (id, user_id, source_feedback_message_id, question, correction, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_feedback_message_id) DO UPDATE SET
                    question = excluded.question,
                    correction = excluded.correction,
                    created_by = excluded.created_by,
                    is_active = TRUE
            """, (knowledge_id, user_id, source_feedback_message_id, question[:2000], correction[:4000], created_by))
            conn.commit()
            row = conn.execute(
                "SELECT * FROM verified_knowledge WHERE source_feedback_message_id = ?",
                (source_feedback_message_id,),
            ).fetchone()
            return dict(row)

    def find_relevant(self, user_id: Optional[str], query: str, limit: int = 3) -> List[Dict]:
        if not user_id:
            return []
        query_terms = self._terms(query)
        if not query_terms:
            return []
        rows = _get_active_verified_knowledge()
        ranked = []
        global_rules = []
        for item in rows:
            if item.get('question') == 'GLOBAL_AI_RULE':
                global_rules.append(item)
            else:
                overlap = len(query_terms & self._terms(f"{item.get('question', '')} {item.get('correction', '')}"))
                if overlap:
                    ranked.append((overlap, item))
        ranked.sort(key=lambda item: (-item[0], item[1].get("created_at", "")))
        return global_rules + [item for _, item in ranked[:limit]]
