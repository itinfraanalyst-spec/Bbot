import re
from typing import Dict, Tuple, Generator, Any


class StreamUnmasker:
    """
    Handles streaming token unmasking.
    Buffers incomplete tokens (e.g., "[SALARY" before "_1]" arrives)
    so that tokens are unmasked seamlessly as they are streamed.
    """
    def __init__(self, reverse_map: Dict[str, str]):
        self.reverse_map = reverse_map
        self.buffer = ""

    def feed(self, chunk: str) -> str:
        if not self.reverse_map or not chunk:
            return chunk

        self.buffer += chunk

        # If there's an unclosed '[' near the end of the buffer, hold onto it
        # because a token like "[COMPENSATION_1]" might be split across chunks.
        last_open_bracket = self.buffer.rfind("[")
        last_close_bracket = self.buffer.rfind("]")

        if last_open_bracket != -1 and last_open_bracket > last_close_bracket:
            possible_tag = self.buffer[last_open_bracket:]
            # Maximum placeholder length is ~30 chars
            if len(possible_tag) < 30:
                ready_text = self.buffer[:last_open_bracket]
                self.buffer = possible_tag
            else:
                ready_text = self.buffer
                self.buffer = ""
        else:
            ready_text = self.buffer
            self.buffer = ""

        if ready_text:
            for placeholder, original in self.reverse_map.items():
                if placeholder in ready_text:
                    ready_text = ready_text.replace(placeholder, original)
            return ready_text
        return ""

    def flush(self) -> str:
        """Flushes any remaining characters in the buffer, unmasking if possible."""
        if not self.buffer:
            return ""
        ready_text = self.buffer
        self.buffer = ""
        for placeholder, original in self.reverse_map.items():
            if placeholder in ready_text:
                ready_text = ready_text.replace(placeholder, original)
        return ready_text


class DataMasker:
    """
    Local privacy-preserving data masking engine with Indian Enterprise & Salary Protection.
    Scans prompts/document chunks locally on CPU and replaces sensitive PII
    (emails, phone numbers, salary packages, CTC, financial amounts, employee IDs,
     PAN cards, Aadhaar, bank accounts, IFSC, GSTIN, IP addresses)
    with consistent anonymous tokens (e.g. [SALARY_1], [PAN_1], [AADHAAR_1]).

    When the remote LLM responds with streaming or full text, DataMasker restores
    the original data so the user sees real numbers/names seamlessly, but the cloud
    provider never receives the raw sensitive data.
    """

    PATTERNS = [
        # Email addresses
        ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")),
        # Indian GSTIN (15 characters)
        ("GST", re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b")),
        # Indian PAN Cards (5 letters, 4 digits, 1 letter)
        ("PAN", re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")),
        # Aadhaar Numbers (12 digits with spaces or hyphens)
        ("AADHAAR", re.compile(r"\b[2-9]\d{3}[-\s]\d{4}[-\s]\d{4}\b")),
        # Indian Bank IFSC Codes
        ("IFSC", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
        # Bank Account Numbers with context keyword
        ("ACCOUNT", re.compile(r"(?i)\b(?:A/C|Account(?:\s+No\.?|\s+Number)?|Acc(?:\.|\s+No\.?)?)\s*[:#\-]?\s*(\d{9,18})\b")),
        # Salary LPA packages (e.g. 15 LPA, 8.5 LPA, 24 Lakhs Per Annum)
        ("SALARY", re.compile(r"(?i)\b\d+(?:\.\d+)?\s*(?:LPA|lakhs?\s*(?:per\s*annum|p\.?a\.?))\b")),
        # CTC / Detailed Compensation terms (e.g. CTC: 18,00,000, Basic Pay: Rs. 65,000)
        ("COMPENSATION", re.compile(r"(?i)\b(?:CTC|Gross\s*Salary|Net\s*Salary|In-hand|Basic\s*Pay|Stipend)\s*[:\-=]?\s*(?:₹|Rs\.?|INR)?\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:lakhs?|crores?|k|m))?\b")),
        # Employee / Badge IDs
        ("EMP_ID", re.compile(r"\b(?:EMP|EMPLOYEE|BADGE)[\-_#:]\s*[A-Z0-9]{3,10}\b", re.IGNORECASE)),
        # Phone numbers (Indian + international)
        ("PHONE", re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b|\b(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b")),
        # Credit / Debit Cards
        ("CARD", re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")),
        # Financial / Currency amounts (e.g. ₹50,000, Rs. 20,000, $15,000, 50,000 INR)
        ("AMOUNT", re.compile(r"(?:₹|Rs\.?|INR|\$|USD|EUR|€)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:lakhs?|crores?|k|m|million|billion))?\b", re.IGNORECASE)),
        # IPv4 Addresses
        ("IP", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
    ]

    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def mask(self, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Masks sensitive PII entities in the input text.
        Returns:
            masked_text (str): The sanitized prompt/context text.
            reverse_map (dict): Mapping from placeholder -> original value.
        """
        if not self.enabled or not text:
            return text, {}

        forward_map: Dict[str, str] = {}
        reverse_map: Dict[str, str] = {}
        counters: Dict[str, int] = {}

        masked_text = text

        for entity_type, pattern in self.PATTERNS:
            def replacer(match):
                original = match.group(0)
                # Don't re-mask already created tokens like [EMAIL_1] or [SALARY_1]
                if original.startswith("[") and original.endswith("]") and "_" in original:
                    return original

                if original in forward_map:
                    return forward_map[original]

                counters[entity_type] = counters.get(entity_type, 0) + 1
                token = f"[{entity_type}_{counters[entity_type]}]"
                forward_map[original] = token
                reverse_map[token] = original
                return token

            masked_text = pattern.sub(replacer, masked_text)

        return masked_text, reverse_map

    def unmask(self, text: str, reverse_map: Dict[str, str]) -> str:
        """Restores original values in full response text."""
        if not self.enabled or not reverse_map or not text:
            return text

        result = text
        for placeholder, original in reverse_map.items():
            result = result.replace(placeholder, original)
        return result

    def create_stream_unmasker(self, reverse_map: Dict[str, str]) -> StreamUnmasker:
        """Returns a StreamUnmasker initialized with the given reverse mapping."""
        return StreamUnmasker(reverse_map if self.enabled else {})
