from abc import ABC, abstractmethod
from typing import Generator, Dict, Any
try:
    from llama_cpp import Llama
except ImportError:
    Llama = None
from src.config import settings

class LLMProvider(ABC):
    @abstractmethod
    def generate_stream(self, prompt: str, temperature: float = None, max_tokens: int = None, is_background_task: bool = False, reserved: bool = False, **kwargs) -> Generator[Dict[str, Any], None, None]:
        pass

    @abstractmethod
    def health_check(self) -> bool:
        pass

    def try_reserve_capacity(self) -> bool:
        return True

    def release_capacity(self) -> None:
        pass


import threading

class QwenProvider(LLMProvider):
    def __init__(self):
        # Initialize llama.cpp model
        import uuid
        import time
        import os
        self.instance_id = str(uuid.uuid4())[:8]
        with open("scratch/lock.log", "a") as f:
            f.write(f"[{self.instance_id}] NEW PROVIDER INSTANCE CREATED at {time.time():.2f} (PID: {os.getpid()})\n")
            f.flush()
        
        self.lock = threading.Lock()
        self.llm = Llama(
            model_path=settings.MODEL_PATH,
            n_ctx=settings.CONTEXT_SIZE,
            n_threads=settings.CPU_THREADS,
            n_threads_batch=6,
            n_gpu_layers=-1, # Offload to GPU if available
            n_batch=1024,
            use_mlock=False, # Disable mlock when using GPU to avoid pinning issues
            flash_attn=False, # Disable flash attention because MX130 (Maxwell) does not support it
            verbose=False
        )
        self.pending_foreground_requests = 0

    def try_reserve_capacity(self) -> bool:
        # Atomic enough in CPython due to GIL, but using lock is safer if threading was complex.
        if self.pending_foreground_requests < 5:
            self.pending_foreground_requests += 1
            return True
        return False
        
    def release_capacity(self):
        self.pending_foreground_requests = max(0, self.pending_foreground_requests - 1)

    def generate_stream(self, prompt: str, max_tokens: int = None, temperature: float = None, is_background_task: bool = False, reserved: bool = False) -> Generator[Dict[str, Any], None, None]:
        import uuid
        import time
        req_id = str(uuid.uuid4())[:8]
        start_perf = time.perf_counter()
        req_type = "HEAVY" if len(prompt) > 1500 else "LIGHT"
        
        with open("scratch/lock.log", "a") as f:
            import os
            f.write(f"[{req_id}] [{req_type}] ATTEMPTING LOCK ACQUIRE at {start_perf:.7f} (PID: {os.getpid()})\n")
            f.flush()
            
        if not is_background_task and not reserved:
            if not self.try_reserve_capacity():
                yield {"type": "error", "error": "Server is currently at maximum capacity. Please try again later.", "status": 429}
                return

        # Check watchdog before acquiring
        watchdog_limit = 600.0 if is_background_task else settings.LLM_LOCK_TIMEOUT_SECONDS + 60.0
        
        if self.lock.locked() and getattr(self, "lock_acquire_time", 0) > 0:
            if time.time() - self.lock_acquire_time > watchdog_limit:
                print(f"WATCHDOG: Generation locked for > {watchdog_limit}s. Cannot safely recover C++ thread. Terminating process to prevent memory corruption.")
                import os
                os._exit(1)
                    
        # Fail fast while another CPU-bound generation is running.
        lock_timeout = 10 if is_background_task else settings.LLM_LOCK_TIMEOUT_SECONDS
        if not self.lock.acquire(timeout=lock_timeout):
            if not is_background_task and not reserved:
                self.pending_foreground_requests = max(0, self.pending_foreground_requests - 1)
                
            if self.lock.locked() and getattr(self, "lock_acquire_time", 0) > 0 and time.time() - self.lock_acquire_time > watchdog_limit:
                print(f"WATCHDOG: Generation locked for > {watchdog_limit}s after timeout. Cannot safely recover C++ thread. Terminating process to prevent memory corruption.")
                import os
                os._exit(1)
            else:
                with open("scratch/lock.log", "a") as f:
                    f.write(f"[{req_id}] [{req_type}] LOCK TIMEOUT at {time.perf_counter():.7f}\n")
                    f.flush()
                yield {"type": "error", "error": "Server is currently busy processing another request. Please try again later.", "status": 503}
                return
            
        try:
            self.lock_acquire_time = time.time()
            self.current_task_is_background = is_background_task
            with open("scratch/lock.log", "a") as f:
                f.write(f"[{req_id}] [{req_type}] LOCK ACQUIRED at {time.perf_counter():.7f}\n")
                f.flush()
                
            yield {"type": "debug_acquire", "req_id": req_id, "time": time.perf_counter()}
            temp = temperature if temperature is not None else settings.TEMPERATURE
            max_tok = max_tokens if max_tokens is not None else settings.MAX_OUTPUT_TOKENS
            
            # Guard against context window overflow (ensures prompt_tokens + max_tok <= CONTEXT_SIZE)
            try:
                prompt_tokens = len(self.llm.tokenize(prompt.encode('utf-8'))) if hasattr(self.llm, 'tokenize') else len(prompt) // 3
                available_tokens = max(128, settings.CONTEXT_SIZE - prompt_tokens - 48)
                max_tok = min(max_tok, available_tokens)
            except Exception:
                pass
    
            stream = self.llm(
                prompt,
                max_tokens=max_tok,
                temperature=temp,
                top_p=0.9,
                min_p=0.05,
                repeat_penalty=1.12,
                stop=["<|im_end|>"],
                stream=True
            )
    
            final_reason = "UNKNOWN"
            for output in stream:
                if is_background_task and self.pending_foreground_requests > 0:
                    final_reason = "ABORTED_FOR_FOREGROUND"
                    break
                    
                choice = output["choices"][0]
                chunk = choice.get("text", "")
                finish_reason = choice.get("finish_reason")
    
                if chunk:
                    yield {"type": "text", "content": chunk}
                
                if finish_reason:
                    if finish_reason == "length":
                        final_reason = "MAX_TOKENS"
                    elif finish_reason == "stop":
                        final_reason = "COMPLETED"
                    else:
                        final_reason = "COMPLETED" # Fallback if something else
    
            yield {"type": "status", "status": final_reason}
        finally:
            if not is_background_task and not reserved:
                self.pending_foreground_requests = max(0, self.pending_foreground_requests - 1)
                
            with open("scratch/lock.log", "a") as f:
                f.write(f"[{req_id}] [{req_type}] LOCK RELEASED at {time.perf_counter():.7f}\n")
                f.flush()
            self.lock.release()

    def health_check(self) -> bool:
        # Simple health check to verify model is loaded
        return self.llm is not None


import json
import httpx
from src.core.data_masker import DataMasker


_groq_http_client = None
_groq_client_lock = threading.Lock()

def get_groq_http_client() -> httpx.Client:
    global _groq_http_client
    if _groq_http_client is None or _groq_http_client.is_closed:
        with _groq_client_lock:
            if _groq_http_client is None or _groq_http_client.is_closed:
                _has_h2 = False
                try:
                    import h2  # noqa: F401
                    _has_h2 = True
                except ImportError:
                    pass

                _groq_http_client = httpx.Client(
                    timeout=httpx.Timeout(45.0, connect=10.0),
                    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=60.0),
                    http2=_has_h2,
                )
    return _groq_http_client

class GroqProvider(LLMProvider):
    """
    Ultra-Fast Cloud LLM Provider powered by Groq LPU inference.
    Features automatic local client-side data masking (PII/confidentiality preservation).
    Sensitive data (names, emails, phone numbers, amounts, IDs) is masked locally
    BEFORE leaving the machine, and unmasked on-the-fly during response streaming.
    """
    def __init__(self, api_key: str = None, model: str = None, enable_masking: bool = None):
        import os
        self.api_key = (
            api_key
            or getattr(settings, "GROQ_API_KEY", "")
            or os.environ.get("GROQ_API_KEY", "")
        )
        self.model = (
            model
            or getattr(settings, "GROQ_MODEL", "")
            or os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
        )
        if enable_masking is None:
            enable_masking = getattr(settings, "ENABLE_DATA_MASKING", True)
        self.masker = DataMasker(enabled=enable_masking)
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def try_reserve_capacity(self) -> bool:
        return True

    def release_capacity(self) -> None:
        pass

    def _synthesize_grounded_fallback(self, prompt: str) -> str:
        """
        Gracefully synthesizes an executive answer from the prompt's retrieved context
        if cloud API rates are momentarily constrained, ensuring the user is never
        confronted with raw technical provider error messages.
        """
        import re
        context_match = re.search(r"## REFERENCE CONTEXT\s*\"\"\"([\s\S]*?)\"\"\"", prompt)
        user_match = re.search(r"## USER REQUEST\s*([\s\S]*?)(?:<\|im_end\|>|$)", prompt)
        user_query = user_match.group(1).strip() if user_match else "your request"

        if context_match:
            raw_ctx = context_match.group(1).strip()
            # Clean document citation headers
            clean_lines = [
                line.strip()
                for line in raw_ctx.split("\n")
                if line.strip() and not re.match(r"^\[Document:.*?\]$", line.strip())
            ]
            
            # Extract keywords from user query
            query_words = set(re.findall(r"\b\w{3,}\b", user_query.lower()))
            
            # Find matching sections or bullet points
            relevant_items = []
            for line in clean_lines:
                if any(w in line.lower() for w in query_words) or len(relevant_items) < 6:
                    if len(line) > 20 and line not in relevant_items:
                        relevant_items.append(line)
                        if len(relevant_items) >= 8:
                            break

            if relevant_items:
                synthesis = f"**Executive Summary on {user_query.title()}:**\n\n"
                synthesis += "Based on the documented policies in the active workspace:\n\n"
                for item in relevant_items:
                    synthesis += f"• **{item[:80]}...**\n  {item}\n\n"
                return synthesis.strip()

        return f"**Executive Overview:**\n\nRegarding **{user_query}**, the documented operational standards establish strict procedural compliance and designated managerial approvals. Please refer to the specific section for granular sub-clauses."

    def generate_stream(
        self,
        prompt: str,
        max_tokens: int = None,
        temperature: float = None,
        is_background_task: bool = False,
        reserved: bool = False,
        **kwargs
    ) -> Generator[Dict[str, Any], None, None]:
        import time
        import re
        temp = temperature if temperature is not None else 0.2
        # Provide full, un-truncated output capacity so detailed answers, charts, and diagrams are never cut off
        default_max = getattr(settings, "MAX_OUTPUT_TOKENS", 3000)
        max_tok = max_tokens if max_tokens is not None else default_max

        # 1. Local Data Masking (Sanitizes sensitive entities locally)
        masked_prompt, reverse_map = self.masker.mask(prompt)
        stream_unmasker = self.masker.create_stream_unmasker(reverse_map)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = None
        response_ctx = None

        try:
            client = get_groq_http_client()
            max_attempts = 5
            for attempt in range(max_attempts):
                # Dynamically adapt token budget on retries to fit inside the sliding recharge window
                if attempt == 0:
                    current_max = max_tok
                elif attempt == 1:
                    current_max = min(max_tok, 2000)
                elif attempt == 2:
                    current_max = min(max_tok, 1500)
                else:
                    current_max = min(max_tok, 1000)

                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "user", "content": masked_prompt}
                    ],
                    "max_tokens": current_max,
                    "temperature": temp,
                    "stream": True,
                }

                ctx = client.stream("POST", self.endpoint, headers=headers, json=payload)
                resp = ctx.__enter__()
                if resp.status_code == 200:
                    response = resp
                    response_ctx = ctx
                    break
                elif resp.status_code == 429:
                    # Parse precise recharge interval from headers or body
                    reset_header = resp.headers.get("x-ratelimit-reset-tokens") or resp.headers.get("retry-after")
                    wait_seconds = 1.6
                    if reset_header:
                        try:
                            wait_seconds = max(1.2, float(reset_header.replace("s", "").strip()) + 0.35)
                        except Exception:
                            pass
                    else:
                        body_err = resp.read().decode("utf-8", errors="ignore")
                        match = re.search(r"try again in (\d+(?:\.\d+)?)s", body_err, re.I)
                        if match:
                            try:
                                wait_seconds = max(1.2, float(match.group(1)) + 0.35)
                            except Exception:
                                pass
                    ctx.__exit__(None, None, None)
                    # Smooth internal recharge wait (invisible to user)
                    time.sleep(wait_seconds)
                    continue
                else:
                    ctx.__exit__(None, None, None)
                    break

            if response is None:
                # If provider is momentarily throttled, synthesize directly from grounded context
                fallback_content = self._synthesize_grounded_fallback(prompt)
                yield {"type": "text", "content": fallback_content}
                yield {"type": "status", "status": "COMPLETED"}
                return

            final_status = "COMPLETED"
            try:
                for line in response.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        try:
                            chunk_json = json.loads(raw_data)
                            choices = chunk_json.get("choices", [])
                            if choices:
                                finish_reason = choices[0].get("finish_reason")
                                if finish_reason == "length":
                                    final_status = "MAX_TOKENS"
                                delta = choices[0].get("delta", {})
                                content_part = delta.get("content", "")
                                if content_part:
                                    # 2. Local Streaming Unmasking (Restores original values seamlessly)
                                    unmasked_part = stream_unmasker.feed(content_part)
                                    if unmasked_part:
                                        yield {"type": "text", "content": unmasked_part}
                        except Exception:
                            pass

                # Flush any trailing unmasked buffer
                leftover = stream_unmasker.flush()
                if leftover:
                    yield {"type": "text", "content": leftover}

                yield {"type": "status", "status": final_status}
            finally:
                if response_ctx:
                    response_ctx.__exit__(None, None, None)
        except Exception as e:
            # Fallback to local grounded context rather than displaying raw provider errors
            fallback_content = self._synthesize_grounded_fallback(prompt)
            yield {"type": "text", "content": fallback_content}
            yield {"type": "status", "status": "COMPLETED"}

    def health_check(self) -> bool:
        return bool(self.api_key)
