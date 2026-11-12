from typing import List, Dict
import re


CONVERSATIONAL_ACKNOWLEDGMENTS = {
    "ok", "okay", "k", "thanks", "thank you", "thx", "got it", "understood",
    "sure", "yes", "no", "great", "perfect", "cool", "alright", "all right",
    "noted", "that helps", "makes sense", "bye", "goodbye", "hi", "hello",
    "ok thanks", "ok thank you", "okay thanks", "okay thank you",
}


def is_substantive_document_question(message: str) -> bool:
    """Return false for conversational turns that should use normal chat behavior."""
    normalized = re.sub(r"[^a-z0-9\s]", "", message.lower()).strip()
    return normalized not in CONVERSATIONAL_ACKNOWLEDGMENTS


LANGUAGE_DIRECTIVES = {
    "hi": (
        "\n\n=== LANGUAGE DIRECTIVE: HINDI (हिन्दी) ===\n"
        "You MUST formulate your response in natural, fluent Hindi using Devanagari script (हिन्दी).\n"
        "Be polite, professional, and clear. Keep technical terms, code snippets, numbers, and diagram code  in standard format."
    ),
    "hinglish": (
        "\n\n=== LANGUAGE DIRECTIVE: HINGLISH ===\n"
        "You MUST formulate your response in natural, conversational Hinglish (Hindi written in Roman/Latin script, as commonly spoken across India).\n"
        "Example style: 'Aapka document review ho gaya hai. Yahan mukhya points diye gaye hain:'\n"
        "Keep the tone friendly, helpful, and professional. Keep technical terms, code blocks, and diagrams in standard format."
    ),
    "bn": (
        "\n\n=== LANGUAGE DIRECTIVE: BENGALI (বাংলা) ===\n"
        "You MUST formulate your response in natural, fluent Bengali using Bengali script (বাংলা).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "te": (
        "\n\n=== LANGUAGE DIRECTIVE: TELUGU (తెలుగు) ===\n"
        "You MUST formulate your response in natural, fluent Telugu using Telugu script (తెలుగు).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "mr": (
        "\n\n=== LANGUAGE DIRECTIVE: MARATHI (मराठी) ===\n"
        "You MUST formulate your response in natural, fluent Marathi using Devanagari script (मराठी).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "ta": (
        "\n\n=== LANGUAGE DIRECTIVE: TAMIL (தமிழ்) ===\n"
        "You MUST formulate your response in natural, fluent Tamil using Tamil script (தமிழ்).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "gu": (
        "\n\n=== LANGUAGE DIRECTIVE: GUJARATI (ગુજરાતી) ===\n"
        "You MUST formulate your response in natural, fluent Gujarati using Gujarati script (ગુજરાતી).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "kn": (
        "\n\n=== LANGUAGE DIRECTIVE: KANNADA (ಕನ್ನಡ) ===\n"
        "You MUST formulate your response in natural, fluent Kannada using Kannada script (ಕನ್ನಡ).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "pa": (
        "\n\n=== LANGUAGE DIRECTIVE: PUNJABI (ਪੰਜਾਬੀ) ===\n"
        "You MUST formulate your response in natural, fluent Punjabi using Gurmukhi script (ਪੰਜਾਬੀ).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
    "ml": (
        "\n\n=== LANGUAGE DIRECTIVE: MALAYALAM (മലയാളം) ===\n"
        "You MUST formulate your response in natural, fluent Malayalam using Malayalam script (മലയാളം).\n"
        "Keep technical terms, code snippets, and diagrams in their standard format."
    ),
}


class PromptBuilder:
    def __init__(self):
        # Qwen uses ChatML format
        self.system_prompt = (
            "You are TRPW bbot, an Executive Corporate & Technical Intelligence Specialist.\n"
            "CAPABILITY: High-precision parsing, reasoning, and synthesis across documents (PDF, DOCX, XLSX, CSV, TXT, MD) and technical concepts.\n"
            "EXECUTIVE 3-TIER ANSWER ARCHITECTURE:\n"
            "1. DIRECT VERDICT / TAKEAWAY: Always lead with the direct answer or key takeaway in 1 to 2 crisp, bolded sentences.\n"
            "2. STRUCTURED SYSTEMATIC BREAKDOWN: Follow immediately with exhaustive bulleted points, numbered phases, or structured Markdown comparison tables whenever comparing entities, numerical data, timelines, or specifications.\n"
            "3. EVIDENCE & EXACT CONTEXT: Anchor factual statements with precision. Quote key operational numbers, conditions, and exact definitions.\n"
            "COMPLETENESS MANDATE: Never provide partial, half-finished, or truncated answers in any format (text, tables, or graphs). Every explanation, process flow, and diagram must be fully detailed from start to finish. If explaining a workflow or architecture, cover every single stage. If presenting data, include all relevant metrics without cutting off.\n"
            "VISUAL DIAGRAMS & FLOWCHARTS: When user asks for a diagram, flowchart, DFD, process flow, or graph, provide a complete, syntactically valid Mermaid block (```mermaid ... ```) using 'graph TD' or 'flowchart TD' with clean node quotes like A[\"Step 1: Description\"] --> B[\"Step 2: Action\"]. Always completely close code fences.\n"
            "SPEED & HIGH IMPACT: Zero conversational pleasantries (no 'Sure, here is...', 'Certainly', 'Based on your request'). Deliver the core response immediately.\n"
            "TABLE SYNTHESIS: Whenever user requests lists of parameters, policies, comparisons, financial figures, or steps, format them using clean, standard Markdown tables for executive readability.\n"
            "FORMATTING: Use bold key terms (`**term**`), clean section headers (`### Section`), and structured bullet points. Maintain complete, uninterrupted sentences."
        )

    def build_prompt(self, messages: List[Dict[str, str]], retrieved_context: str = "", memory_context: str = "", system_prompt: str = "", verified_context: str = "", language: str = "en") -> str:
        """
        Builds a modular, uncluttered ChatML prompt where system persona,
        grounding rules, user memory, and document context are cleanly isolated.
        """
        prompt = ""
        
        if not any(m.get("role") == "system" for m in messages):
            # 1. Base Persona
            sys_parts = [system_prompt or self.system_prompt]
            
            # 2. Strict Document Grounding (Isolated Section)
            if retrieved_context:
                sys_parts.append(
                    "=== DOCUMENT Q&A RULES ===\n"
                    "use only the retrieved document context. Do not use general knowledge. Answer ONLY from the provided context.\n"
                    "Extract and report all relevant operational steps, names, roles, procedures, and data clearly present in the context.\n"
                    "Tolerance for variations: If the user query contains spelling mistakes, phonetic variations, or abbreviations for concepts present in the document (e.g., 'exclation' or 'escaltion' for 'escalation'), map them to the corresponding context and answer fully.\n"
                    "If the answer is not clearly supported by the context, say 'I couldn\'t find that in the document.'\n"
                    "Be evidence-first and comprehensive: provide complete, exhaustive explanations backed by context and state uncertainty clearly where information is missing from the document.\n"
                    "If conversation history conflicts with this retrieved document context regarding facts within the documents, the document context takes absolute precedence."
                )
                sys_parts.append(
                    "After substantive replies, you may suggest one concise, natural follow-up topic."
                )
                
            # 3. User Memories (Isolated Section)
            if memory_context:
                sys_parts.append(f"## USER PREFERENCES & MEMORIES\n{memory_context}")
                
            # 4. Admin Verified Reference (Isolated Section)
            if verified_context:
                sys_parts.append(f"## VERIFIED WORKSPACE KNOWLEDGE\n{verified_context}")
                
            # 5. Language Directive (Isolated Section)
            if language and language.lower() in LANGUAGE_DIRECTIVES:
                sys_parts.append(LANGUAGE_DIRECTIVES[language.lower()].strip())
                
            clean_sys = "\n\n".join(sys_parts)
            prompt += f"<|im_start|>system\n{clean_sys}<|im_end|>\n"
            
        for i, msg in enumerate(messages):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role != "system":
                import re
                content = re.sub(r'(?i)<[\s]*\|[\s]*.*?[\s]*\|[\s]*>', '', content)
            
            if i == len(messages) - 1 and role == "user" and retrieved_context:
                # Clean modular separation: Context block is cleanly fenced off from user query
                fence = '"""'
                enriched_content = (
                    f"## REFERENCE CONTEXT\n{fence}\n{retrieved_context}\n{fence}\n\n"
                    f"## USER REQUEST\n{content}"
                )
                prompt += f"<|im_start|>{role}\n{enriched_content}<|im_end|>\n"
            else:
                prompt += f"<|im_start|>{role}\n{content}<|im_end|>\n"
            
        # Append assistant trigger
        prompt += "<|im_start|>assistant\n"
        
        return prompt
