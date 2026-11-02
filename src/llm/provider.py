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
        temp = temperature if temperature is not None else 0.2
        # Use an optimal max_tokens to prevent exceeding Groq Free Tier OTPM (1000 tokens/min limit)
        max_tok = min(max_tokens, 750) if max_tokens is not None else 750

        # 1. Local Data Masking (Sanitizes sensitive entities locally)
        masked_prompt, reverse_map = self.masker.mask(prompt)
        stream_unmasker = self.masker.create_stream_unmasker(reverse_map)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        models_to_try = [self.model]
        if "qwen" in self.model:
            models_to_try.append("openai/gpt-oss-20b")
        elif "gpt-oss-20b" in self.model:
            models_to_try.append("qwen/qwen3.8-27b")

        response = None
        response_ctx = None
        last_error = ""

        try:
            with httpx.Client(timeout=45.0) as client:
                for attempt, current_model in enumerate(models_to_try):
                    current_max = min(max_tok, 500) if attempt > 0 else max_tok
                    payload = {
                        "model": current_model,
                        "messages": [
                            {"role": "user", "content": masked_prompt}
                        ],
                        "max_tokens": current_max,
                        "temperature": temp,
                        "stream": True,
                    }

                    if attempt > 0:
                        time.sleep(1.5)

                    ctx = client.stream("POST", self.endpoint, headers=headers, json=payload)
                    resp = ctx.__enter__()
                    if resp.status_code == 200:
                        response = resp
                        response_ctx = ctx
                        break
                    elif resp.status_code == 429:
                        last_error = resp.read().decode("utf-8", errors="ignore")
                        ctx.__exit__(None, None, None)
                        time.sleep(2.0)
                        continue
                    else:
                        last_error = resp.read().decode("utf-8", errors="ignore")
                        ctx.__exit__(None, None, None)
                        break

                if response is None:
                    yield {
                        "type": "error",
                        "error": "Groq model token limit reached momentarily. Please wait a few seconds and retry.",
                        "status": 429
                    }
                    return

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

                    yield {"type": "status", "status": "COMPLETED"}
                finally:
                    if response_ctx:
                        response_ctx.__exit__(None, None, None)
        except Exception as e:
            yield {"type": "error", "error": f"Groq connection error: {str(e)}", "status": 500}

    def health_check(self) -> bool:
        return bool(self.api_key)
