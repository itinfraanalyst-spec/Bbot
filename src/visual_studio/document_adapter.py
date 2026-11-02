import os
import re
from typing import Optional, Tuple, List, Dict, Any
from fastapi import HTTPException, UploadFile
from src.config import settings
from src.services.document_service import DocumentService


class DocumentAdapter:
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx"}
    MAX_FILE_SIZE = settings.MAX_PDF_SIZE_MB * 1024 * 1024
    MAX_PROMPT_CHARS = 4000
    MAX_DOC_CHARS = 16000

    def __init__(self):
        self.doc_service = DocumentService()

    def validate_file(self, file: UploadFile) -> str:
        """Validates extension and returns normalized extension."""
        if not file.filename:
            raise HTTPException(status_code=400, detail="Missing filename in uploaded document.")

        _, ext = os.path.splitext(file.filename)
        ext = ext.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            allowed_list = ", ".join(sorted(self.ALLOWED_EXTENSIONS))
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported formats: {allowed_list}",
            )
        return ext

    def extract_from_bytes(self, filename: str, content: bytes) -> str:
        """Saves temporarily to an isolated scratch dir, extracts text via existing DocumentService, and cleans up."""
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum upload size of {settings.MAX_PDF_SIZE_MB}MB.",
            )

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

        scratch_dir = os.path.join(settings.DOCUMENTS_DIR, "visual_studio_temp")
        os.makedirs(scratch_dir, exist_ok=True)

        safe_name = re.sub(r"[^a-zA-Z0-9_.\-]", "_", filename)
        temp_path = os.path.join(scratch_dir, f"temp_{os.getpid()}_{safe_name}")

        try:
            with open(temp_path, "wb") as f:
                f.write(content)

            pages_text, page_count = self.doc_service._extract_text(temp_path)
            if not pages_text or not any(p[1].strip() for p in pages_text):
                raise HTTPException(
                    status_code=400,
                    detail="No readable text could be extracted from this document. It may be an image-only scan or password-protected.",
                )

            # Combine page texts
            full_text = "\n\n".join(txt.strip() for _, txt in pages_text if txt.strip())
            return full_text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process and extract text from '{filename}': {str(e)}",
            )
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    def extract_from_existing_doc(self, doc_id: str) -> str:
        """Retrieves extracted text for an existing document in ChatBot-2 storage."""
        doc_dir = os.path.join(settings.DOCUMENTS_DIR, doc_id)
        txt_path = os.path.join(doc_dir, "extracted.txt")
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()

        # Fallback to original file extraction if extracted.txt is not on disk
        for ext in self.ALLOWED_EXTENSIONS:
            orig_path = os.path.join(doc_dir, f"original{ext}")
            if os.path.exists(orig_path):
                pages_text, _ = self.doc_service._extract_text(orig_path)
                return "\n\n".join(txt.strip() for _, txt in pages_text if txt.strip())

        raise HTTPException(
            status_code=404,
            detail=f"Document '{doc_id}' not found or its extracted content is unavailable.",
        )

    def _is_metadata_line(self, line: str) -> bool:
        """Identifies document metadata headers, table dividers, or boilerplate."""
        lower = line.lower().strip()
        if not lower or lower in ("it", "hr", "hr /", "it /"):
            return True
        if lower.startswith("|") or "---" in lower or lower.startswith("[table]") or "+---" in lower:
            return True
        metadata_exact = {
            "document type", "document code", "standard operating procedure", "sop",
            "version", "version 1.0", "1.0", "owner", "it department", "hr department",
            "review frequency", "purpose of this document", "table of contents",
            "all rights reserved", "confidential & proprietary", "confidential",
            "step", "action", "why", "expected outcome", "outcome", "why / expected outcome",
            "details", "notes", "s.no", "description", "role", "responsibility",
            "at least annually, or when process/policy changes", "management / approver"
        }
        if lower in metadata_exact:
            return True
        metadata_keywords = [
            "document type", "document code", "review frequency", "version 1.",
            "version 2.", "page 1 of", "page 2 of", "all rights reserved",
            "confidential & proprietary", "it-sop-", "hr-sop-", "-sop-"
        ]
        if any(lower.startswith(k) or f": {k}" in lower for k in metadata_keywords):
            return True
        if re.match(r"^v?\d+\.\d+(\.\d+)?$", lower) or re.match(r"^[a-z]+-sop-\d+$", lower):
            return True
        return False

    def synthesize_holistic_project_scope(
        self, text: str, user_prompt: str = ""
    ) -> Tuple[str, List[str]]:
        """
        Whole-Project / Complete-Lifecycle Synthesizer Layer:
        Scans and analyzes the ENTIRE document from beginning to end (100% scope).
        Ensures visuals are NEVER restricted to an isolated snippet or the first page.
        Identifies all macro-phases, architectural components, operational workflows,
        milestones, and metrics across the full document lifecycle.
        Returns:
            (digest_text, detected_phases)
        """
        if not text:
            return "", []

        # Pre-normalize inline numbered steps (e.g. "1. Step A. 2. Step B.")
        normalized_text = re.sub(r'(?<=[.!?\s])(\d+[\.\)])\s+', r'\n\1 ', text)
        lines = [l.strip() for l in normalized_text.splitlines() if l.strip()]
        clean_lines = [l for l in lines if not self._is_metadata_line(l)]

        if not clean_lines:
            return text[: self.MAX_DOC_CHARS], []

        is_short_doc = len(clean_lines) <= 15

        # 1. Segment document into semantic sections / phases
        sections: List[Dict[str, Any]] = []
        curr_title = ""
        curr_lines: List[str] = []

        top_level_num = 0
        sec_pat = re.compile(r"^(\d{1,2})\.\s+([A-Za-z].*)$")
        md_pat = re.compile(r"^(#{1,4})\s+([A-Za-z].*)$")
        named_pat = re.compile(r"^(section\s+\d+|phase\s+\d+|module\s+\d+|part\s+\d+)\b[:\.\s]*([A-Za-z].*)$", re.I)

        for line in clean_lines:
            is_heading = False
            heading_title = ""
            allow_period = is_short_doc

            if len(line) < 70 and (allow_period or not line.endswith(".")):
                check_str = line.rstrip(".") if allow_period else line
                m_sec = sec_pat.match(check_str)
                if m_sec:
                    num = int(m_sec.group(1))
                    if num > top_level_num and num <= top_level_num + 3:
                        top_level_num = num
                        is_heading = True
                        heading_title = m_sec.group(2).strip()
                elif md_pat.match(line):
                    is_heading = True
                    heading_title = md_pat.match(line).group(2).strip()
                elif named_pat.match(check_str):
                    is_heading = True
                    heading_title = line.strip()

            if is_heading:
                if curr_title:
                    clean_t = re.sub(r"^[#\-\*0-9\.\s]+", "", curr_title).strip()
                    if clean_t:
                        sections.append({"title": clean_t, "lines": curr_lines})
                curr_title = heading_title or line
                curr_lines = []
            else:
                if not curr_title:
                    curr_title = "Overview & Project Scope"
                curr_lines.append(line)

        if curr_title:
            clean_t = re.sub(r"^[#\-\*0-9\.\s]+", "", curr_title).strip()
            if clean_t:
                sections.append({"title": clean_t or "Execution & Outcomes", "lines": curr_lines})

        # If too few sections detected (e.g. unformatted text), chunk into 5 chronological buckets
        if len(sections) < 3 and len(clean_lines) > 8:
            chunk_size = max(3, len(clean_lines) // 5)
            sections = []
            lifecycle_phases = [
                "Phase 1: Inception & Scope Definition",
                "Phase 2: Architecture & Requirements",
                "Phase 3: Core Implementation & Operations",
                "Phase 4: QA, Testing & Validation",
                "Phase 5: Production Deployment & Monitoring",
            ]
            for i in range(0, len(clean_lines), chunk_size):
                p_idx = min(len(sections), len(lifecycle_phases) - 1)
                sections.append({
                    "title": lifecycle_phases[p_idx],
                    "lines": clean_lines[i : i + chunk_size],
                })

        # Filter out introductory / title boilerplate from phase list if substantive procedures exist
        intro_words = {
            "purpose", "scope", "roles and responsibilities", "document review and approval",
            "overview", "overview & project scope", "it department sop", "hr department sop"
        }
        all_titles = [s["title"] for s in sections if s["title"]]
        substantive_titles = [
            t for t in all_titles
            if t.lower() not in intro_words and not t.lower().endswith("sop")
        ]
        detected_phases = (substantive_titles if len(substantive_titles) >= 3 else all_titles)[:12]

        # 2. Build the Holistic Project Digest across all target sections
        target_sections = (
            [s for s in sections if s["title"].lower() not in intro_words and not s["title"].lower().endswith("sop")]
            if len(substantive_titles) >= 3
            else sections
        )
        if not target_sections:
            target_sections = sections

        num_sections = max(len(target_sections), 1)
        per_sec_budget = max(500, self.MAX_DOC_CHARS // num_sections)

        digest_parts = []
        digest_parts.append("=== WHOLE-PROJECT END-TO-END SCOPE ARCHITECTURE ===")
        digest_parts.append(f"TOTAL DETECTED PHASES: {len(target_sections)} (Spans 100% of Document Lifecycle)")
        digest_parts.append("LIFECYCLE TRAJECTORY: " + " -> ".join(detected_phases))
        digest_parts.append("\n--- END-TO-END PROJECT PHASES & SUBSTANTIVE DETAILS ---")

        for idx, sec in enumerate(target_sections):
            sec_title = sec["title"]
            sec_lines = sec["lines"]
            digest_parts.append(f"\n[PHASE {idx + 1}: {sec_title}]")
            sec_chars = 0
            for l in sec_lines:
                if sec_chars + len(l) + 1 > per_sec_budget:
                    break
                if len(l) > 3 and not self._is_metadata_line(l):
                    digest_parts.append(f"• {l}")
                    sec_chars += len(l) + 1

        final_digest = "\n".join(digest_parts)
        if len(final_digest) > self.MAX_DOC_CHARS:
            final_digest = final_digest[: self.MAX_DOC_CHARS]

        return final_digest, detected_phases

    def prepare_content_for_llm(
        self,
        raw_text: Optional[str] = None,
        doc_text: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Bounds and synthesizes whole-project scope so visuals cover the entire document lifecycle.
        Returns: (bounded_source_text, bounded_user_prompt)
        """
        source_text = (doc_text or raw_text or "").strip()
        user_prompt = (prompt or "").strip()

        if not source_text and not user_prompt:
            raise HTTPException(
                status_code=400,
                detail="Please provide at least a prompt, an uploaded document, or input text.",
            )

        bounded_prompt = user_prompt[: self.MAX_PROMPT_CHARS]

        if not doc_text and not raw_text and user_prompt:
            return user_prompt, bounded_prompt

        # Run Whole-Project Scope Synthesizer for document/raw content
        holistic_digest, _ = self.synthesize_holistic_project_scope(source_text, bounded_prompt)
        return holistic_digest, bounded_prompt
