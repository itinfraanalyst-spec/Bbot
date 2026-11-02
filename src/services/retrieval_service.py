import re
import math
from collections import Counter
import threading
from typing import List, Dict, Any, Optional
import traceback
from src.core.embeddings import EmbeddingProvider, NomicEmbeddingProvider
from src.core.vector_store import VectorStore, ChromaVectorStore
from src.config import settings
from src.database.document_repository import DocumentRepository

_shared_service = None
_shared_service_lock = threading.Lock()

class RetrievalService:
    def __init__(self):
        self.doc_repo = DocumentRepository()
        self.embedding_provider: Optional[EmbeddingProvider] = None
        self.vector_store: Optional[VectorStore] = None
        self._retrieval_cache = {}

        
        if settings.RAG_ENABLED:
            try:
                self.embedding_provider = NomicEmbeddingProvider()
                self.vector_store = ChromaVectorStore(
                    persist_directory=settings.CHROMA_DB_PATH
                )
            except Exception as e:
                print(f"Failed to initialize RAG components: {e}")
                traceback.print_exc()
                # Continue without RAG if initialization fails
                self.embedding_provider = None
                self.vector_store = None

    def embed_and_store_chunks(self, doc_id: str, chunks: List[Dict[str, Any]]):
        """Generates embeddings for chunks and stores them in the vector db."""
        if not self.embedding_provider or not self.vector_store:
            return

        self._retrieval_cache.clear()


        # Prepare text list
        texts = [chunk['text'] for chunk in chunks]
        
        try:
            embeddings = self.embedding_provider.embed_texts(texts)
            
            # Enrich chunks with doc_id for vector store insertion
            for chunk in chunks:
                chunk['doc_id'] = doc_id

            self.vector_store.add_chunks(chunks, embeddings)
        except Exception as e:
            print(f"Error embedding and storing chunks for doc {doc_id}: {e}")
            traceback.print_exc()

    def delete_document_vectors(self, doc_id: str):
        """Deletes document vectors from the vector store."""
        if not self.vector_store:
            return
        self._retrieval_cache.clear()
        try:
            self.vector_store.delete_document(doc_id)
        except Exception as e:
            print(f"Error deleting document vectors for doc {doc_id}: {e}")
            traceback.print_exc()

    def _extract_requested_pages(self, query: str) -> List[int]:
        """
        Parses query for page numbers, e.g., 'page 12', 'pages 3 and 4', 'page 5-7', 'third page'.
        """
        query_lower = query.lower()
        pages = set()
        
        # Match 'page 5' or 'pages 3 and 4' or 'page 5-7'
        for match in re.finditer(r'\bpages?\s+(\d+(?:\s*(?:and|&|-|to|,)\s*\d+)*)\b', query_lower):
            nums_str = match.group(1)
            # Find all standalone numbers
            for num_match in re.finditer(r'\b(\d+)\b', nums_str):
                pages.add(int(num_match.group(1)))
            
            # Handle simple ranges like 5-7
            for range_match in re.finditer(r'\b(\d+)\s*-\s*(\d+)\b', nums_str):
                start, end = int(range_match.group(1)), int(range_match.group(2))
                if start <= end and end - start < 50: # prevent insane ranges
                    for p in range(start, end + 1):
                        pages.add(p)
                        
        # Match ordinals: first, second, third, etc. up to fifth
        ordinals = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5}
        for word, num in ordinals.items():
            if re.search(fr'\b{word}\s+page\b', query_lower):
                pages.add(num)
                
        return sorted(list(pages))

    def _keyword_overlap_score(self, query: str, text: str) -> int:
        """Counts how many meaningful query terms appear in the candidate text."""
        query_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
        if not query_tokens:
            return 0

        text_tokens = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
        if not text_tokens:
            return 0

        stop_words = {
            "the", "a", "an", "and", "or", "of", "to", "for", "in", "on",
            "with", "by", "is", "at", "from", "what", "when", "where", "why",
            "how", "who", "which", "this", "that", "these", "those", "please",
            "tell", "me", "about", "it", "its", "be", "are", "was", "were"
        }
        meaningful_query_tokens = {token for token in query_tokens if len(token) > 2 and token not in stop_words}
        if not meaningful_query_tokens:
            return 0

        return len(meaningful_query_tokens & text_tokens)

    def _compute_bm25_scores(self, query: str, candidate_texts: List[str], k1: float = 1.5, b: float = 0.75) -> List[float]:
        """
        Computes BM25 lexical similarity scores for a set of candidate document texts.
        Uses pure Python standard library for ultra-fast, robust keyword re-ranking.
        """
        if not candidate_texts or not query:
            return [0.0] * len(candidate_texts)

        stop_words = {
            "the", "a", "an", "and", "or", "of", "to", "for", "in", "on",
            "with", "by", "is", "at", "from", "what", "when", "where", "why",
            "how", "who", "which", "this", "that", "these", "those", "please",
            "tell", "me", "about", "it", "its", "be", "are", "was", "were"
        }
        query_tokens = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2 and w not in stop_words]
        if not query_tokens:
            return [0.0] * len(candidate_texts)

        # Tokenize candidate texts
        tokenized_docs = [re.findall(r"[a-z0-9]+", (t or "").lower()) for t in candidate_texts]
        doc_lens = [len(doc) for doc in tokenized_docs]
        total_docs = len(candidate_texts)
        avg_doc_len = (sum(doc_lens) / total_docs) if total_docs > 0 else 1.0

        # Compute document frequency for query terms
        df = Counter()
        for doc in tokenized_docs:
            unique_terms = set(doc)
            for t in query_tokens:
                if t in unique_terms:
                    df[t] += 1

        # BM25 scores
        scores = []
        for i, doc in enumerate(tokenized_docs):
            d_len = doc_lens[i]
            tf = Counter(doc)
            score = 0.0
            for term in query_tokens:
                if term not in tf:
                    continue
                term_tf = tf[term]
                # Standard Robertson-Spärck Jones IDF with smoothing
                n_term = df[term]
                idf = math.log(1.0 + (total_docs - n_term + 0.5) / (n_term + 0.5))
                # BM25 term weighting
                numerator = term_tf * (k1 + 1.0)
                denominator = term_tf + k1 * (1.0 - b + b * (d_len / (avg_doc_len or 1.0)))
                score += idf * (numerator / denominator)
            scores.append(score)

        return scores

    def _fuzzy_align_query(self, query: str, document_texts: List[str]) -> str:
        """
        Extracts vocabulary from candidate document texts and performs fast fuzzy spelling
        correction on query words using difflib. This makes the retrieval immune to typos
        such as 'devlopment' -> 'development', 'managemet' -> 'management', 'subprocess' -> 'process'.
        """
        if not query or not document_texts:
            return query

        import difflib
        all_doc_words = set()
        for dt in document_texts:
            all_doc_words.update(re.findall(r"[a-zA-Z]{3,}", (dt or "").lower()))

        if not all_doc_words:
            return query

        tokens = re.findall(r"[a-zA-Z0-9]+", query.lower())
        corrected = []
        changed = False

        for t in tokens:
            if t in all_doc_words or len(t) <= 3 or t.isdigit():
                corrected.append(t)
            else:
                matches = difflib.get_close_matches(t, all_doc_words, n=1, cutoff=0.72)
                if matches:
                    corrected.append(matches[0])
                    changed = True
                else:
                    corrected.append(t)

        return " ".join(corrected) if changed else query

    def align_query(self, query: str, conversation_id: str) -> str:
        """Aligns query typos against document vocabulary for LLM prompt comprehension."""
        try:
            associated_docs = self.doc_repo.get_conversation_documents(conversation_id)
            if not associated_docs:
                return query
            all_chunks = []
            for d in associated_docs:
                all_chunks.extend(self.doc_repo.get_chunks(d['id']))
            sample_texts = [c.get('text', '') for c in all_chunks]
            return self._fuzzy_align_query(query, sample_texts)
        except Exception:
            return query

    def retrieve_context(self, query: str, conversation_id: str) -> str:
        """
        Retrieves relevant context for a given query, restricted to documents
        associated with the specified conversation.
        """
        if not self.embedding_provider or not self.vector_store or not query:
            return ""

        cache_key = f"{conversation_id}:::{query}"
        if cache_key in self._retrieval_cache:
            return self._retrieval_cache[cache_key]

        try:
            # 1. Determine associated documents for scope filtering
            associated_docs = self.doc_repo.get_conversation_documents(conversation_id)
            if not associated_docs:
                # No documents to retrieve from
                return ""
            
            doc_ids = [doc['id'] for doc in associated_docs]
            
            # Check for summary/broad queries to bypass similarity search
            # Only trigger global summary if the query specifically asks for document-wide overview
            # and does not ask about specific subjects/topics (e.g. "bullets points on training" is specific).
            query_lower = query.lower()
            global_summary_phrases = [
                "summary of document", "summary of the document", "summarize document", 
                "summarize the document", "summarize this", "doc summary", 
                "overview of document", "brief overview of the document", "entire document",
                "all documents", "all docs", "document outline", "executive summary"
            ]
            broad_words = ["summary", "summarize", "overview", "outline", "table of contents"]
            has_broad_intent = any(p in query_lower for p in global_summary_phrases) or (
                any(w in query_lower.split() for w in broad_words) and len(query_lower.split()) <= 4
            )
            is_summary_query = has_broad_intent
            
            if is_summary_query:
                context_pieces = []
                total_chars = 0
                max_chars_per_doc = settings.RAG_MAX_CHARS // len(doc_ids) if doc_ids else settings.RAG_MAX_CHARS
                
                for doc in associated_docs:
                    d_id = doc['id']
                    if hasattr(self.doc_repo, 'get_document'):
                        full_doc = self.doc_repo.get_document(d_id)
                        if full_doc:
                            doc = {**full_doc, **doc}
                    filename = doc.get('filename') or doc.get('id') or 'Unknown Document'
                    doc_chars = 0
                    
                    # Try to use pre-computed global summary first
                    if doc and doc.get('summary'):
                        piece = f"[Document: {filename} | Pre-computed Global Summary]\n{doc['summary']}\n"
                        if doc_chars + len(piece) <= max_chars_per_doc:
                            context_pieces.append(piece)
                            doc_chars += len(piece)
                            total_chars += len(piece)
                        continue
                        
                    # Fallback if no summary exists
                    all_chunks = self.doc_repo.get_chunks(d_id)
                    for chunk in all_chunks:
                        pg_num = chunk.get('page_number', chunk.get('page_start', '?'))
                        piece = f"[Document: {filename} | Page {pg_num}]\n{chunk['text']}\n"
                        if doc_chars + len(piece) <= max_chars_per_doc:
                            context_pieces.append(piece)
                            doc_chars += len(piece)
                            total_chars += len(piece)
                        else:
                            break
                            
                if total_chars >= settings.RAG_MAX_CHARS - 1000 and len(context_pieces) > 1:
                    context_pieces.append("\n[SYSTEM NOTE: The documents exceeded maximum context limits. The summaries are based only on the available context window distributed evenly across documents.]")
                        
                if context_pieces:
                    return "\n".join(context_pieces)
            
            # 2. Check for page-specific requests
            requested_pages = self._extract_requested_pages(query)
            if requested_pages:
                context_pieces = []
                total_chars = 0
                max_page_available = 0
                older_docs_present = False
                
                for doc in associated_docs:
                    d_id = doc['id']
                    filename = doc.get('filename', 'Unknown Document')
                    all_doc_chunks = self.doc_repo.get_chunks(d_id)
                    if not all_doc_chunks:
                        continue
                        
                    # Check if older document by checking page_number existence
                    # dict.get will return None if missing, but SQLite row might have NULL or missing column if migration failed.
                    if 'page_number' not in all_doc_chunks[0] or all_doc_chunks[0].get('page_number') is None:
                        older_docs_present = True
                        break
                        
                    for chunk in all_doc_chunks:
                        pg_num = chunk.get('page_number')
                        if pg_num and pg_num > max_page_available:
                            max_page_available = pg_num
                            
                    for chunk in all_doc_chunks:
                        pg_num = chunk.get('page_number')
                        if pg_num in requested_pages:
                            piece = f"[Document: {filename} | Page {pg_num}]\n{chunk['text']}\n"
                            if total_chars + len(piece) <= settings.RAG_MAX_CHARS:
                                context_pieces.append(piece)
                                total_chars += len(piece)
                                
                if older_docs_present:
                    return "One or more of the provided documents do not support page-specific queries because they were ingested before this feature was added. Please re-upload the document."
                    
                if not context_pieces:
                    # Requested pages exceed the document length
                    if max_page_available > 0:
                        return f"The requested document(s) only have up to {max_page_available} pages."
                    return ""
                
                # Check for partial out of bounds
                out_of_bounds = sorted([p for p in requested_pages if p > max_page_available])
                if out_of_bounds and max_page_available > 0:
                    note = f"\n[SYSTEM NOTE: Page(s) {', '.join(map(str, out_of_bounds))} were requested, but the document(s) only have up to {max_page_available} pages.]"
                    if total_chars + len(note) <= settings.RAG_MAX_CHARS:
                        context_pieces.append(note)
                    
                return "\n".join(context_pieces)
            
            # 3. Fuzzy align query with document vocabulary to recover from user typos (e.g. devlopment -> development)
            all_associated_chunks = []
            for d in associated_docs:
                all_associated_chunks.extend(self.doc_repo.get_chunks(d['id']))

            sample_doc_texts = [c.get('text', '') for c in all_associated_chunks]
            aligned_query = self._fuzzy_align_query(query, sample_doc_texts)

            # 4. Generate query embedding
            query_embedding = self.embedding_provider.embed_query(aligned_query)
            
            # 5. Search vector database with scope filtering
            filter_metadata = {"doc_id": {"$in": doc_ids}}
            results = self.vector_store.search(
                query_embedding=query_embedding,
                filter_metadata=filter_metadata,
                top_k=settings.RAG_TOP_K
            )
            
            # Combine Chroma vector results with direct lexical matches from the doc repository.
            # When queries have typos or specific terms that embeddings place just outside top-k,
            # this guarantees the exact section chunk is never missed.
            existing_chunk_ids = {r.get('id') for r in (results or [])}
            lexical_chunks_by_score = []
            for c in all_associated_chunks:
                c_text = c.get('text', '')
                score = self._keyword_overlap_score(aligned_query, c_text)
                if score > 0:
                    lexical_chunks_by_score.append((score, c))
            lexical_chunks_by_score.sort(key=lambda x: x[0], reverse=True)

            merged_results = list(results or [])
            for score, c in lexical_chunks_by_score[:5]:
                cid = f"{c.get('document_id') or c.get('doc_id')}_{c.get('chunk_index')}"
                if cid not in existing_chunk_ids:
                    merged_results.append({
                        "id": cid,
                        "text": c.get('text', ''),
                        "metadata": {
                            "doc_id": c.get('document_id') or c.get('doc_id'),
                            "chunk_index": c.get('chunk_index'),
                            "page_start": c.get('page_start'),
                            "page_end": c.get('page_end'),
                        },
                        "distance": 0.50, # assign favorable baseline distance
                    })
                    existing_chunk_ids.add(cid)

            results = merged_results

            if not results:
                return ""

            # 4. Apply similarity threshold and prefer exact keyword matches when
            # vectors land close together. This keeps valid factual chunks from being
            # dropped just because a different-but-generic passage was slightly closer.
            filtered_results = [
                res for res in results
                if res.get('distance') is not None and res['distance'] <= settings.RAG_SIMILARITY_THRESHOLD
            ]
            if not filtered_results and results:
                filtered_results = results[:min(settings.RAG_TOP_K, len(results))]

            def result_text(res: Dict[str, Any]) -> str:
                return " ".join([
                    str(res.get("text") or res.get("document") or ""),
                    str((res.get("metadata") or {}).get("text") or ""),
                    str((res.get("metadata") or {}).get("page_text") or ""),
                ])

            # Note: We rely entirely on the vector embedding's semantic similarity here.
            # We do not override with lexical keyword searches, as semantic embeddings 
            # correctly handle synonymous or re-worded concepts that lack exact keyword overlaps.

            # 4. Hybrid Re-ranking: Combine Vector Semantic Rank + BM25 Lexical Rank
            # using Reciprocal Rank Fusion (RRF). This ensures exact entities/numbers/codes
            # are prioritized while preserving deep conceptual/semantic matching.
            candidate_texts = [result_text(res) for res in filtered_results]
            bm25_scores = self._compute_bm25_scores(query, candidate_texts)

            # Sort by vector similarity (lower distance is better)
            vector_sorted_indices = sorted(
                range(len(filtered_results)),
                key=lambda idx: filtered_results[idx].get("distance", 1.0)
            )
            vector_rank_map = {idx: rank for rank, idx in enumerate(vector_sorted_indices)}

            # Sort by BM25 score (higher score is better)
            bm25_sorted_indices = sorted(
                range(len(filtered_results)),
                key=lambda idx: bm25_scores[idx],
                reverse=True
            )
            bm25_rank_map = {idx: rank for rank, idx in enumerate(bm25_sorted_indices)}

            # Standard RRF formula: RRF_score = 1/(60 + r_dense) + 1/(60 + r_sparse)
            def compute_rrf_score(idx: int) -> float:
                v_rank = vector_rank_map.get(idx, len(filtered_results))
                b_rank = bm25_rank_map.get(idx, len(filtered_results))
                overlap = self._keyword_overlap_score(query, candidate_texts[idx])
                rrf = (1.0 / (60.0 + v_rank)) + (1.0 / (60.0 + b_rank))
                # Slight tie-breaker bonus for raw keyword overlap
                return rrf + (overlap * 0.001)

            sorted_indices = sorted(range(len(filtered_results)), key=compute_rrf_score, reverse=True)
            relevant_results = [filtered_results[i] for i in sorted_indices]

            relevance_by_doc_and_chunk = {}
            # Keep track of chunk priority order as ranked by RRF
            chunk_priority_rank = {}
            needed_chunks_by_doc = {}
            
            for rank_order, res in enumerate(relevant_results):
                meta = res['metadata']
                d_id = meta.get('doc_id') or meta.get('document_id')
                c_idx = meta.get('chunk_index', 0)
                if not d_id or c_idx is None:
                    continue

                if d_id not in relevance_by_doc_and_chunk:
                    relevance_by_doc_and_chunk[d_id] = {}
                if d_id not in chunk_priority_rank:
                    chunk_priority_rank[d_id] = {}

                text = result_text(res)
                score = self._keyword_overlap_score(query, text)
                relevance_by_doc_and_chunk[d_id][c_idx] = max(
                    relevance_by_doc_and_chunk[d_id].get(c_idx, 0),
                    score
                )
                if c_idx not in chunk_priority_rank[d_id]:
                    chunk_priority_rank[d_id][c_idx] = rank_order
                
                if d_id not in needed_chunks_by_doc:
                    needed_chunks_by_doc[d_id] = set()
                    
                needed_chunks_by_doc[d_id].add(c_idx)
                # Expand adjacent chunk context ONLY for the top 2 highest-ranking hits
                # (instead of 5), preventing massive context bloating while preserving needed local context.
                if rank_order < 2:
                    if c_idx > 0:
                        needed_chunks_by_doc[d_id].add(c_idx - 1)
                        if (c_idx - 1) not in chunk_priority_rank[d_id]:
                            chunk_priority_rank[d_id][c_idx - 1] = rank_order + 0.5
                    needed_chunks_by_doc[d_id].add(c_idx + 1)
                    if (c_idx + 1) not in chunk_priority_rank[d_id]:
                        chunk_priority_rank[d_id][c_idx + 1] = rank_order + 0.5
            
            if not needed_chunks_by_doc:
                return ""
                
            # 5. Build focused context window centered around the top retrieved hits
            # Instead of greedily merging large sequences from 0..N, we pack discrete focused blocks
            # centered on each top hit (hit +/- 1 adjacent chunk) strictly in rank order.
            context_pieces = []
            total_chars = 0

            # Dynamic Context Budgeting (Option D):
            # For targeted/specific queries (<= 12 words), limit context to min(3500, settings.RAG_MAX_CHARS)
            # so CPU prompt processing is fast while respecting any custom/test limits on RAG_MAX_CHARS.
            query_word_count = len(query.strip().split())
            if query_word_count <= 12:
                context_char_budget = min(3500, settings.RAG_MAX_CHARS)
            else:
                context_char_budget = settings.RAG_MAX_CHARS

            def append_block(doc_id, filename, start_page, end_page, chunk_texts):
                nonlocal total_chars

                if total_chars >= context_char_budget:
                    return True

                page_info = f"Page {start_page}"
                if start_page != end_page:
                    page_info += f"-{end_page}"
                header = f"[Document: {filename} | {page_info}]\n"
                body = "\n".join(chunk_texts)
                piece = header + body + "\n"
                remaining = context_char_budget - total_chars

                if len(piece) <= remaining:
                    context_pieces.append(piece)
                    total_chars += len(piece)
                    return total_chars >= context_char_budget

                marker = "\n[...truncated]"
                body_budget = remaining - len(header) - len(marker)
                if body_budget <= 0:
                    return True

                candidate = body[:body_budget]
                boundaries = [
                    candidate.rfind("\n\n"),
                    candidate.rfind(". "),
                    candidate.rfind("? "),
                    candidate.rfind("! "),
                    candidate.rfind("\n"),
                ]
                boundary = max(boundaries)
                if boundary >= body_budget // 2:
                    candidate = candidate[:boundary + 1].rstrip()
                else:
                    candidate = candidate.rsplit(" ", 1)[0].rstrip()

                truncated_piece = header + candidate + marker
                context_pieces.append(truncated_piece)
                total_chars += len(truncated_piece)
                return True

                marker = "\n[...truncated]"
                body_budget = remaining - len(header) - len(marker)
                if body_budget <= 0:
                    return True

                candidate = body[:body_budget]
                boundaries = [
                    candidate.rfind("\n\n"),
                    candidate.rfind(". "),
                    candidate.rfind("? "),
                    candidate.rfind("! "),
                    candidate.rfind("\n"),
                ]
                boundary = max(boundaries)
                if boundary >= body_budget // 2:
                    candidate = candidate[:boundary + 1].rstrip()
                else:
                    candidate = candidate.rsplit(" ", 1)[0].rstrip()

                truncated_piece = header + candidate + marker
                context_pieces.append(truncated_piece)
                total_chars += len(truncated_piece)
                return True

            # Group chunks by document to avoid redundant DB queries
            for d_id in needed_chunks_by_doc.keys():
                all_doc_chunks = {c.get("chunk_index"): c for c in self.doc_repo.get_chunks(d_id)}
                filename_for_block = next((d.get('filename') or d.get('id') or 'Unknown Document' for d in associated_docs if d['id'] == d_id), d_id)
                
                # Iterate through top-ranked results in exact order of relevance
                processed_chunk_indices = set()
                
                for res in relevant_results:
                    meta = res.get('metadata') or {}
                    if (meta.get('doc_id') or meta.get('document_id')) != d_id:
                        continue
                    hit_c_idx = meta.get('chunk_index')
                    if hit_c_idx is None or hit_c_idx in processed_chunk_indices:
                        continue
                    
                    # Form a localized window: [hit - 1, hit, hit + 1] if available and not yet included
                    window_indices = [idx for idx in [hit_c_idx - 1, hit_c_idx, hit_c_idx + 1] if idx in all_doc_chunks and idx not in processed_chunk_indices]
                    window_indices.sort()
                    if not window_indices:
                        continue

                    block_chunks = [all_doc_chunks[idx] for idx in window_indices]
                    start_page = block_chunks[0]['page_start']
                    end_page = block_chunks[-1]['page_end']
                    texts = [c['text'] for c in block_chunks]

                    if append_block(d_id, filename_for_block, start_page, end_page, texts):
                        break
                    
                    processed_chunk_indices.update(window_indices)
                    if total_chars >= context_char_budget:
                        break

                if total_chars >= context_char_budget:
                    break
            
            if not context_pieces:
                self._retrieval_cache[cache_key] = ""
                return ""
                
            final_context = "\n".join(context_pieces)
            
            self._retrieval_cache[cache_key] = final_context
            if len(self._retrieval_cache) > 1000:
                self._retrieval_cache.clear()
                
            return final_context

        except Exception as e:
            print(f"Error during retrieval: {e}")
            traceback.print_exc()
            return ""


def get_retrieval_service() -> RetrievalService:
    global _shared_service
    if _shared_service is None:
        with _shared_service_lock:
            if _shared_service is None:
                _shared_service = RetrievalService()
    return _shared_service
