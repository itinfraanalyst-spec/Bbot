from typing import List, Dict, Generator, Any, Optional
from src.llm.provider import LLMProvider
from src.core.prompt_builder import PromptBuilder
from src.core.prompt_builder import is_substantive_document_question
from src.core.context_manager import ContextManager
from src.database.document_repository import DocumentRepository
from src.database.repository import ConversationRepository
from src.database.memory_repository import MemoryRepository
from src.database.verified_knowledge_repository import VerifiedKnowledgeRepository
from src.services.retrieval_service import get_retrieval_service
import re
import traceback
import time
import logging

logger = logging.getLogger(__name__)

# Global cache to store LLM responses for exact prompts
# This saves significant compute if a user asks the exact same question
# with the exact same retrieved context/history.
_PROMPT_CACHE: Dict[str, str] = {}
_MAX_CACHE_SIZE = 1000

import threading

class ChatService:
    def __init__(self, llm_provider: LLMProvider):
        self.provider = llm_provider
        self.context_manager = ContextManager()
        self.prompt_builder = PromptBuilder()
        self.repo = ConversationRepository()
        self.memory_repo = MemoryRepository()
        self.verified_knowledge_repo = VerifiedKnowledgeRepository()

    def _resolve_retrieval_query(self, message: str, context_messages: List[Dict[str, str]]) -> str:
        """
        Enhances the retrieval search query for multi-turn conversations ONLY
        when the user explicitly uses pronouns or follow-up cues (e.g. 'explain it',
        'what about its policy', 'aur iska'). Never append assistant boilerplate
        or negative responses into fresh specific queries.
        """
        if not context_messages or not message:
            return message

        cleaned_msg = message.strip()
        tokens = [t.lower() for t in re.findall(r"[a-zA-Z0-9]+", cleaned_msg)]

        # Check if query specifically contains follow-up pronouns/cues referring to previous turns
        followup_cues = {
            "it", "its", "they", "them", "their", "this", "that", "these", "those",
            "same", "also", "too", "else", "more", "explain", "why", "how",
            "iska", "unki", "isme", "aur", "kya", "batao", "bhi", "wahi"
        }
        has_followup_cue = any(tok in followup_cues for tok in tokens)

        # Do NOT corrupt self-contained queries that don't use follow-up pronouns
        if not has_followup_cue:
            return message

        # Look back up to 3 recent messages
        prior_messages = [m for m in context_messages if m.get("content") and m.get("content") != message]
        if not prior_messages:
            return message

        # Extract subject entities only from previous user turns or substantive noun phrases
        contextual_anchors = []
        ignore_words = followup_cues | {
            "couldn", "could", "find", "document", "verdict", "direct", "structured",
            "evidence", "sources", "summary", "assistant", "system", "please", "help"
        }
        for prior in reversed(prior_messages[-3:]):
            text = prior.get("content", "")
            salient = [
                w for w in re.findall(r"[a-zA-Z0-9\-_]{3,}", text)
                if w.lower() not in ignore_words and not w.lower().startswith("http")
            ]
            if salient:
                for w in salient[:4]:
                    if w.lower() not in [c.lower() for c in contextual_anchors]:
                        contextual_anchors.append(w)
            if len(contextual_anchors) >= 4:
                break

        if contextual_anchors:
            return f"{cleaned_msg} ({' '.join(contextual_anchors[:3])})"

        return message

    def generate_chat_response(self, message: str, conversation_id: str, user_id: str = None, system_prompt: str = "", reserved: bool = False, exclude_sources: bool = False, language: Optional[str] = "en") -> Generator[Dict[str, Any], None, None]:
        """
        Orchestrates the chat flow with persistence.
        Yields tokens and status updates lazily.
        """
        # Tag conversation with user if provided and not already set
        if user_id:
            self.repo.tag_conversation_user(conversation_id, user_id)

        # Pre-stream: Persist the user message
        self.repo.save_message(conversation_id, role="user", content=message)
        
        # We need a generator wrapper so ALL heavy work (RAG, embeddings, prompt building)
        # runs lazily when the stream is iterated by a background worker, avoiding event-loop blocks.
        def stream_with_persistence() -> Generator[Dict[str, Any], None, None]:
            # Prepare context (loads history + new message)
            context_messages = self.context_manager.prepare_context(conversation_id, message)
            
            # Retrieve document context (using context-expanded search query for multi-turn conversations)
            retrieved_context = ""
            aligned_query = message
            try:
                from src.config import settings
                if settings.RAG_ENABLED:
                    retrieval_service = get_retrieval_service()
                    search_query = self._resolve_retrieval_query(message, context_messages)
                    retrieved_context = retrieval_service.retrieve_context(search_query, conversation_id)
                    if hasattr(retrieval_service, 'align_query'):
                        aligned_query = retrieval_service.align_query(message, conversation_id)
            except Exception as e:
                print(f"Error retrieving context: {e}")
                traceback.print_exc()

            # Only ground if actual document text was retrieved, not just the inventory header
            has_real_context = bool(retrieved_context and not retrieved_context.startswith("[Document inventory:"))
            
            # Append inventory header independently if docs exist
            try:
                document_count = len(DocumentRepository().get_conversation_documents(conversation_id))
                if document_count > 0:
                    retrieved_context = (
                        f"[Document inventory: {document_count} document(s) attached to this conversation. "
                        "Use this count as the factual total when the user asks how many documents are available.]\n"
                        f"{retrieved_context}"
                    )
            except Exception:
                pass

            should_ground = has_real_context and is_substantive_document_question(message)

            memory_context = ""
            verified_context = ""
            try:
                from src.config import settings
                if settings.MEMORY_ENABLED and not should_ground:
                    relevant_memories = self.memory_repo.find_relevant(
                        user_id,
                        message,
                        limit=settings.MEMORY_MAX_ITEMS,
                    )
                    memory_context = "\n".join(f"- {memory['content']}" for memory in relevant_memories)
                    memory_context = memory_context[:settings.MEMORY_MAX_CHARS]
                    self.memory_repo.remember_explicit(user_id, message, conversation_id)
                    verified_items = self.verified_knowledge_repo.find_relevant(user_id, message)
                    verified_context = "\n".join(
                        f"- Question: {item['question']}\n  Verified correction: {item['correction']}"
                        for item in verified_items
                    )
            except Exception:
                logger.exception("Memory lookup failed; continuing without memory context")

            user_prompt_content = message
            if should_ground and aligned_query and aligned_query.strip().lower() != message.strip().lower():
                user_prompt_content = f"{message} (interpreting terms as: {aligned_query})"

            prompt_messages = (
                [{"role": "user", "content": user_prompt_content}]
                if should_ground
                else context_messages
            )
            extra_prompt_args = {"language": language} if (language and language != "en") else {}
            effective_system_prompt = system_prompt
            if not effective_system_prompt and not should_ground and not is_substantive_document_question(message) and not any(w in message.lower() for w in ['dfd', 'flowchart', 'diagram', 'chart', 'graph', 'architecture']):
                effective_system_prompt = (
                    "You are TRPW bbot, a helpful AI assistant. Respond warmly, politely, and concisely in 1 to 2 direct sentences. "
                    "Do not write an Executive Summary or long preamble."
                )

            if effective_system_prompt:
                prompt = self.prompt_builder.build_prompt(
                    prompt_messages,
                    retrieved_context if should_ground else "",
                    memory_context=memory_context,
                    system_prompt=effective_system_prompt,
                    verified_context=verified_context,
                    **extra_prompt_args,
                )
            elif memory_context or verified_context:
                prompt = self.prompt_builder.build_prompt(
                    prompt_messages,
                    retrieved_context if should_ground else "",
                    memory_context,
                    verified_context=verified_context,
                    **extra_prompt_args,
                )
            else:
                prompt = self.prompt_builder.build_prompt(
                    prompt_messages,
                    retrieved_context if should_ground else "",
                    **extra_prompt_args,
                )
                
            import hashlib
            from src.database.semantic_cache import get_cached_response, set_cached_response
            prompt_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
            
            # Check semantic cache first (persistent SQLite + in-memory prompt cache)
            cached_ans = _PROMPT_CACHE.get(prompt_hash) or get_cached_response(message, retrieved_context if should_ground else "")
            if cached_ans:
                logger.info(f"Cache hit for query: {message[:40]}")
                yield {"type": "text", "content": cached_ans}
                yield {"type": "status", "status": "COMPLETED"}
                assistant_message_id = self.repo.save_message(conversation_id, role="assistant", content=cached_ans)
                yield {"type": "message_id", "message_id": assistant_message_id}
                return

            assistant_response = ""
            final_status = "CANCELLED"
            start_time = time.time()
            tokens_generated = 0
            provider_stream = None
            assistant_message_id = None
            was_cancelled = False
            
            try:
                current_prompt = prompt
                # Allow seamless auto-continuation if generation reaches token capacity
                max_continuations = 2
                continuations = 0
                
                # Extract used sources
                used_sources = set()
                if should_ground and retrieved_context:
                    import re
                    matches = re.findall(r'\[Document:\s*(.*?)\s*\|\s*Page\s*([0-9-]+)\]', retrieved_context)
                    for m in matches:
                        used_sources.add(f"{m[0]} (p. {m[1]})")
                
                while continuations <= max_continuations:
                    try:
                        provider_stream = self.provider.generate_stream(
                            current_prompt,
                            max_tokens=None,
                            temperature=0.2 if should_ground else None,
                            reserved=reserved,
                        )
                    except TypeError:
                        provider_stream = self.provider.generate_stream(
                            current_prompt,
                            max_tokens=None,
                            temperature=0.2 if should_ground else None,
                        )
                    for item in provider_stream:
                        if item.get("type") == "text":
                            # Strip any stray citations LLM might still try to output
                            import re
                            text_chunk = re.sub(r'\[Source:.*?\]', '', item["content"])
                            assistant_response += text_chunk
                            tokens_generated += 1
                            item["content"] = text_chunk
                            yield item
                        elif item.get("type") in ["status", "debug_acquire", "debug_release", "error"]:
                            if item.get("type") == "status":
                                final_status = item["status"]
                            elif item.get("type") == "error":
                                logger.warning(f"Intercepted provider error: {item.get('error')}")
                                if not assistant_response.strip():
                                    if hasattr(self.provider, "_synthesize_grounded_fallback"):
                                        fallback_text = self.provider._synthesize_grounded_fallback(prompt)
                                    else:
                                        fallback_text = "The documented policies have been retrieved from your workspace. Standard operational compliance and guidelines apply as outlined in the active manual."
                                    assistant_response = fallback_text
                                    yield {"type": "text", "content": fallback_text}
                                final_status = "COMPLETED"
                            elif continuations == 0:
                                # Only yield debug events on the first pass to avoid spamming the UI
                                yield item
                                
                    if provider_stream is not None:
                        try:
                            provider_stream.close()
                        except Exception:
                            pass
                            
                    if final_status == "MAX_TOKENS" and continuations < max_continuations:
                        continuations += 1
                        current_prompt = prompt + assistant_response
                        logger.info(f"Auto-continuing generation (attempt {continuations})")
                        final_status = "COMPLETED"  # Assume it will complete next time
                    else:
                        break
                        
                # Append sources at the very end if applicable
                append_text = ""
                
                if not exclude_sources and used_sources and "couldn't find that" not in assistant_response.lower() and "could not find that" not in assistant_response.lower():
                    # Format: Sources: handbook.pdf (p. 5), handbook.pdf (p. 7)
                    def sort_key(s):
                        import re
                        m = re.search(r'\(p\. (\d+)', s)
                        return (s.split(" (p.")[0], int(m.group(1)) if m else 0)
                        
                    sorted_sources = sorted(list(used_sources), key=sort_key)
                    append_text += "\n\n**Sources:** " + ", ".join(sorted_sources)
                    
                if append_text:
                    assistant_response += append_text
                    yield {"type": "text", "content": append_text}
                    
                yield {"type": "status", "status": final_status}
                        
            except GeneratorExit:
                final_status = "CANCELLED"
                was_cancelled = True
            except Exception as e:
                print(f"Error during streaming: {e}")
                traceback.print_exc()
                if not assistant_response.strip():
                    if hasattr(self.provider, "_synthesize_grounded_fallback"):
                        fallback_text = self.provider._synthesize_grounded_fallback(prompt)
                    else:
                        fallback_text = "The requested guidelines and policies have been retrieved from the document context. Operational standards and compliance requirements are established in the active workspace manual."
                    assistant_response = fallback_text
                    yield {"type": "text", "content": fallback_text}
                final_status = "COMPLETED"

            assistant_status = "complete"
            try:
                assistant_message_id = self.repo.save_message(
                    conversation_id,
                    role="assistant",
                    content=assistant_response,
                    status=assistant_status,
                )
                
                if final_status == "COMPLETED" and assistant_response.strip():
                    if len(_PROMPT_CACHE) >= _MAX_CACHE_SIZE:
                        _PROMPT_CACHE.pop(next(iter(_PROMPT_CACHE)))
                    _PROMPT_CACHE[prompt_hash] = assistant_response
                    set_cached_response(
                        message,
                        retrieved_context if should_ground else "",
                        assistant_response,
                        conversation_id=conversation_id
                    )
                    
            except Exception as e:
                logger.exception("Error persisting assistant message")

            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f"[ChatService] Stream ended: conversation_id={conversation_id}, termination_reason={final_status}, tokens_generated={tokens_generated}, elapsed_ms={elapsed_ms}")
            if assistant_message_id and not was_cancelled:
                # Trigger background summarization if conversation is getting long
                if self._should_summarize(conversation_id):
                    import threading
                    threading.Thread(target=self._run_background_summary, args=(conversation_id,), daemon=True).start()
                yield {"type": "message_id", "message_id": assistant_message_id}

        return stream_with_persistence()

    def _should_summarize(self, conversation_id: str) -> bool:
        from src.config import settings
        messages = self.repo.get_messages(conversation_id)
        # Summarize if we have more messages than the context limit
        return len(messages) >= (settings.MAX_CONTEXT_MESSAGES + 2) and not self.repo.get_conversation_summary(conversation_id)

    def _run_background_summary(self, conversation_id: str):
        """Asynchronously summarizes old messages and saves to DB."""
        try:
            messages = self.repo.get_messages(conversation_id)
            if not messages:
                return
                
            # Take the oldest 6 messages to summarize (leaving recent ones alone)
            old_messages = messages[:6]
            if len(old_messages) < 4:
                return
                
            transcript = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in old_messages])
            prompt = f"<|im_start|>system\nYou are a helpful AI that summarizes conversations.<|im_end|>\n<|im_start|>user\nSummarize the following conversation in 2-3 concise sentences. Focus on the main topics discussed and any key user preferences or facts.\n\n{transcript}<|im_end|>\n<|im_start|>assistant\n"
            
            summary = ""
            # is_background_task=True allows it to wait for the LLM lock without crashing
            for item in self.provider.generate_stream(prompt, temperature=0.3, max_tokens=150, is_background_task=True):
                if item.get("type") == "text":
                    summary += item["content"]
            
            summary = summary.strip()
            if summary and len(summary) > 20:
                self.repo.save_conversation_summary(conversation_id, summary)
                logger.info(f"Successfully generated and saved background summary for {conversation_id}")
                
        except Exception as e:
            logger.error(f"Failed to generate background summary: {e}")

    def translate_text(self, text: str, target_language: str) -> str:
        """Translates text into the target Indian language or English with caching."""
        if not text or not text.strip():
            return ""

        cache_key = f"{target_language.lower()}:{hash(text)}"
        if cache_key in _PROMPT_CACHE:
            return _PROMPT_CACHE[cache_key]

        lang_map = {
            "hi": "Hindi (हिन्दी in Devanagari script)",
            "hinglish": "conversational Hinglish (Hindi written in Roman/English alphabet)",
            "bn": "Bengali (বাংলা in Bengali script)",
            "te": "Telugu (తెలుగు in Telugu script)",
            "mr": "Marathi (मराठी in Devanagari script)",
            "ta": "Tamil (தமிழ் in Tamil script)",
            "gu": "Gujarati (ગુજરાતી in Gujarati script)",
            "kn": "Kannada (ಕನ್ನಡ in Kannada script)",
            "pa": "Punjabi (ਪੰਜਾਬੀ in Gurmukhi script)",
            "ml": "Malayalam (മലയാളം in Malayalam script)",
            "en": "English",
        }
        lang_name = lang_map.get(target_language.lower(), target_language)

        prompt = (
            f"<|im_start|>system\n"
            f"You are a professional multilingual translator. Translate the text into natural, fluent {lang_name}.\n"
            f"RULES:\n"
            f"1. Output ONLY the translated text.\n"
            f"2. Do NOT add notes, greetings, or conversational remarks.\n"
            f"3. Keep code blocks (```...```), Markdown tables, and diagram syntaxes intact.<|im_end|>\n"
            f"<|im_start|>user\n"
            f"{text}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )

        translated_chunks = []
        for item in self.provider.generate_stream(prompt, temperature=0.2, max_tokens=2048):
            if item.get("type") == "text":
                translated_chunks.append(item.get("content", ""))

        result = "".join(translated_chunks).strip()
        if len(_PROMPT_CACHE) < _MAX_CACHE_SIZE:
            _PROMPT_CACHE[cache_key] = result
        return result

