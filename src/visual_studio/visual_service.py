import json
import re
import uuid
import hashlib
from typing import Optional, Dict, Any, List
from src.visual_studio.schemas import (
    DiagramSpec,
    NodeSpec,
    EdgeSpec,
    ChartDataSpec,
    RecommendationResponse,
    EnhanceNodeResponse,
    CanvasCopilotResponse,
    SUPPORTED_VISUAL_TYPES,
    VisualTypeEnum,
)
from src.visual_studio.prompt_templates import (
    build_recommendation_prompt,
    build_diagram_generation_prompt,
)

_DIAGRAM_CACHE: Dict[str, DiagramSpec] = {}


class VisualStudioService:
    def __init__(self):
        self._provider = None

    @property
    def provider(self):
        if self._provider is None:
            from src.api.routes import get_chat_service
            self._provider = get_chat_service().provider
        return self._provider

    def _extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Cleans and extracts JSON object from LLM response text."""
        if not text:
            return None

        clean_text = text.strip()
        # Remove markdown codeblock fences if present
        clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
        clean_text = re.sub(r"\s*```$", "", clean_text)

        # If model started generating directly without opening brace, prepend '{'
        if not clean_text.startswith("{") and '"diagramType"' in clean_text:
            clean_text = "{\n" + clean_text
        elif not clean_text.startswith("{") and "{" in clean_text:
            clean_text = clean_text[clean_text.find("{") :]

        # Find first '{' and last '}'
        start = clean_text.find("{")
        end = clean_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed_slice = clean_text[start : end + 1]
            try:
                return json.loads(parsed_slice)
            except Exception:
                pass

            # Clean trailing commas before close braces
            clean_fixed = re.sub(r",\s*([\]}])", r"\1", parsed_slice)
            try:
                return json.loads(clean_fixed)
            except Exception:
                pass

        # If truncated before final close brace, attempt recovery
        if start != -1:
            candidate = clean_text[start:]
            # Remove any trailing incomplete key/value like `,\n {"id` or `,\n "`
            candidate = re.sub(r',\s*\{[^}]*$', '', candidate)
            candidate = re.sub(r',\s*"[^"]*$', '', candidate)
            candidate = re.sub(r',\s*$', '', candidate)
            open_curly = max(0, candidate.count("{") - candidate.count("}"))
            open_square = max(0, candidate.count("[") - candidate.count("]"))
            repaired = candidate + ("]" * open_square) + ("}" * open_curly)
            try:
                return json.loads(repaired)
            except Exception:
                pass

        return None

    def analyze_content(
        self,
        source_text: str,
        user_prompt: str = "",
    ) -> RecommendationResponse:
        """
        Analyzes text structure and recommends optimal visual format instantly (<5ms)
        without blocking the singleton CPU LLM provider lock.
        """
        rec_type = self._heuristic_analysis(source_text, user_prompt)
        explanation = self._generate_explanation(rec_type, source_text, user_prompt)
        key_entities = self._extract_key_phrases(source_text)
        suggested_title = self._generate_title(source_text, user_prompt)

        return RecommendationResponse(
            recommendedType=rec_type,
            availableTypes=SUPPORTED_VISUAL_TYPES,
            explanation=explanation,
            keyEntities=key_entities[:8],
            suggestedTitle=suggested_title,
        )

    def _resolve_semantic_icon(self, label: str, sublabel: str = "", node_type: str = "") -> str:
        """Determines relevant semantic Lucide icon name based on concept keywords."""
        combined = f"{label} {sublabel} {node_type}".lower()
        if any(w in combined for w in ["security", "shield", "protect", "auth", "permission", "credential", "compliance", "firewall"]):
            return "ShieldCheck"
        if any(w in combined for w in ["database", "store", "storage", "sql", "record", "repository", "archive", "backup"]):
            return "Database"
        if any(w in combined for w in ["user", "employee", "hr", "member", "customer", "person", "joiner", "mover", "leaver", "hiring", "lead", "manager"]):
            return "UserCheck"
        if any(w in combined for w in ["ticket", "helpdesk", "intake", "log", "incident log", "support request"]):
            return "Ticket"
        if any(w in combined for w in ["urgent", "critical", "emergency", "p1", "p2", "breach", "threat", "outage", "escalat", "zap"]):
            return "Zap"
        if any(w in combined for w in ["decision", "triage", "assess", "criteria", "validate", "check", "condition", "branch", "review"]):
            return "GitBranch"
        if any(w in combined for w in ["configure", "setup", "system", "hardware", "network", "patch", "infrastructure", "tool", "device"]):
            return "Settings"
        if any(w in combined for w in ["complete", "close", "resolve", "resolved", "verified", "accept", "sign-off", "done", "finish"]):
            return "CheckCircle2"
        if any(w in combined for w in ["time", "schedule", "period", "timeline", "delay", "phase", "quarter", "milestone"]):
            return "Clock"
        if any(w in combined for w in ["document", "doc", "sop", "policy", "guideline", "manual", "report", "file", "contract"]):
            return "FileText"
        if any(w in combined for w in ["send", "deliver", "ship", "dispatch", "transmit", "handoff", "notify"]):
            return "Send"
        if any(w in combined for w in ["target", "goal", "objective", "priority", "kpi", "mission"]):
            return "Target"
        if any(w in combined for w in ["diagnose", "investigate", "troubleshoot", "root cause", "search", "inspect"]):
            return "Search"
        if any(w in combined for w in ["funnel", "filter", "pipeline", "qualification", "intake", "drop-off"]):
            return "Filter"
        if any(w in combined for w in ["matrix", "quadrant", "grid", "prioritization", "evaluation"]):
            return "Grid2x2"
        if any(w in combined for w in ["api", "gateway", "ingress", "endpoint", "service"]):
            return "Cpu"
        if node_type == "start":
            return "Play"
        if node_type == "decision":
            return "GitBranch"
        if node_type == "end":
            return "CheckCircle2"
        return "Layers"

    def generate_diagram(
        self,
        source_text: str,
        visual_type: Optional[str] = None,
        user_prompt: str = "",
        force_fresh: bool = False,
    ) -> DiagramSpec:
        """Transforms source text into a validated, structured DiagramSpec."""
        valid_type_ids = {t["id"] for t in SUPPORTED_VISUAL_TYPES}
        if not visual_type or visual_type not in valid_type_ids:
            visual_type = self._heuristic_analysis(source_text, user_prompt)

        cache_key = hashlib.md5(f"{visual_type}:{source_text}:{user_prompt}".encode()).hexdigest()
        import os
        from src.config import settings
        cache_dir = os.path.join(settings.DOCUMENTS_DIR, "visual_cache")
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = os.path.join(cache_dir, f"{cache_key}.json")

        if not force_fresh:
            if cache_key in _DIAGRAM_CACHE:
                cached = _DIAGRAM_CACHE[cache_key]
                if (cached.nodes and len(cached.nodes) >= 3) or cached.chartData:
                    return cached
                else:
                    _DIAGRAM_CACHE.pop(cache_key, None)

            # Check persistent disk cache for instant 0ms returns across restarts
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        cached_data = json.load(f)
                        cached_spec = DiagramSpec(**cached_data)
                        if (cached_spec.nodes and len(cached_spec.nodes) >= 3) or cached_spec.chartData:
                            _DIAGRAM_CACHE[cache_key] = cached_spec
                            return cached_spec
                        else:
                            os.remove(cache_file)
                except Exception:
                    pass

        prompt = build_diagram_generation_prompt(source_text, visual_type, user_prompt)

        llm_output = f'{{\n  "diagramType": "{visual_type}",\n'
        try:
            # Token headroom for full document coverage: 5-10 nodes + edges (~750-850 tokens)
            stream = self.provider.generate_stream(
                prompt,
                max_tokens=850,
                temperature=0.15,
            )
            for chunk in stream:
                if chunk.get("type") == "text":
                    llm_output += chunk["content"]
                    content = chunk.get("content", "")
                    # Early termination check: break ONLY when root JSON has legitimately closed with complete nodes and edges
                    if "}" in content:
                        clean_check = llm_output.strip()
                        if clean_check.endswith("}") and clean_check.count("{") <= clean_check.count("}"):
                            parsed_cand = self._extract_json_from_text(llm_output)
                            if parsed_cand:
                                cand_nodes = parsed_cand.get("nodes") or []
                                cand_edges = parsed_cand.get("edges")
                                cand_chart = parsed_cand.get("chartData")
                                if (len(cand_nodes) >= 5 and cand_edges is not None) or cand_chart:
                                    break
        except Exception as gen_err:
            print(f"[Visual Studio] Stream generation exception: {gen_err}")

        parsed_json = self._extract_json_from_text(llm_output)

        if parsed_json and isinstance(parsed_json, dict):
            nodes_raw = parsed_json.get("nodes") or []
            edges_raw = parsed_json.get("edges") or []
            chart_raw = parsed_json.get("chartData")

            # Incomplete output guard: never serve incomplete 1-node or 2-node diagrams!
            if (not chart_raw) and len(nodes_raw) < 3:
                print(f"[Visual Studio] Incomplete output detected ({len(nodes_raw)} nodes). Engaging full lifecycle synthesizer.")
                parsed_json = None
            else:
                try:
                    # Normalize nodes
                    nodes = [
                        NodeSpec(
                            id=str(n.get("id") or f"node_{i+1}"),
                            label=str(n.get("label") or f"Item {i+1}"),
                            sublabel=n.get("sublabel"),
                            type=n.get("type") or ("start" if i == 0 else ("end" if i == len(nodes_raw) - 1 else "process")),
                            group=n.get("group"),
                            color=n.get("color"),
                            order=i + 1,
                            icon=n.get("icon") or self._resolve_semantic_icon(
                                str(n.get("label") or ""),
                                str(n.get("sublabel") or ""),
                                n.get("type") or "process"
                            ),
                            badge=n.get("badge") or f"{(i + 1):02d}",
                        )
                        for i, n in enumerate(nodes_raw)
                        if isinstance(n, dict)
                    ]

                    # Auto-hydrate edges if model emitted streamlined token-efficient payload
                    edges = [
                        EdgeSpec(
                            id=str(e.get("id") or f"edge_{i+1}"),
                            source=str(e.get("source")),
                            target=str(e.get("target")),
                            label=e.get("label"),
                            style=e.get("style") or "solid",
                        )
                        for i, e in enumerate(edges_raw)
                        if isinstance(e, dict) and e.get("source") and e.get("target")
                    ]
                    if not edges and len(nodes) >= 2:
                        edges = [
                            EdgeSpec(
                                id=f"e_{i}_{i+1}",
                                source=nodes[i - 1].id,
                                target=nodes[i].id,
                                label=None,
                                style="solid",
                            )
                            for i in range(1, len(nodes))
                        ]

                    chart_data = None
                    if parsed_json.get("chartData") and isinstance(parsed_json["chartData"], dict):
                        cd = parsed_json["chartData"]
                        x_key = cd.get("xAxisKey") or "category"
                        data_keys = cd.get("dataKeys") or ["value"]
                        raw_rows = cd.get("rows") or []

                        clean_rows = []
                        for r in raw_rows:
                            if isinstance(r, dict):
                                cr = {}
                                for k, v in r.items():
                                    if k in data_keys:
                                        if isinstance(v, (int, float)):
                                            cr[k] = v
                                        elif isinstance(v, str):
                                            cleaned = re.sub(r"[^\d.-]", "", v)
                                            try:
                                                cr[k] = float(cleaned) if "." in cleaned else int(cleaned)
                                            except ValueError:
                                                cr[k] = 0
                                        else:
                                            cr[k] = 0
                                    else:
                                        cr[k] = v
                                clean_rows.append(cr)

                        chart_data = ChartDataSpec(
                            xAxisKey=x_key,
                            dataKeys=data_keys,
                            rows=clean_rows,
                            unit=cd.get("unit"),
                        )

                    spec = DiagramSpec(
                        version="1.0",
                        diagramType=visual_type,
                        title=parsed_json.get("title") or self._generate_title(source_text, user_prompt),
                        summary=parsed_json.get("summary") or "Structured visual representation of key concepts.",
                        explanation=parsed_json.get("explanation"),
                        theme=parsed_json.get("theme") or "modern",
                        nodes=nodes,
                        edges=edges,
                        chartData=chart_data,
                        sourceReferences=parsed_json.get("sourceReferences") or [],
                        scopeCoverage="Whole Project Scope",
                        scopePhases=[n.label for n in nodes],
                    )

                    if (spec.nodes and len(spec.nodes) >= 3) or spec.chartData:
                        _DIAGRAM_CACHE[cache_key] = spec
                        try:
                            with open(cache_file, "w", encoding="utf-8") as f:
                                f.write(spec.model_dump_json())
                        except Exception:
                            pass
                        return spec
                except Exception as parse_err:
                    print(f"[Visual Studio] DiagramSpec validation error: {parse_err}")

        # Reliable Fallback Generator: ensures zero crashes and immediate render
        fallback_spec = self._generate_fallback_spec(source_text, visual_type, user_prompt)
        _DIAGRAM_CACHE[cache_key] = fallback_spec
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                f.write(fallback_spec.model_dump_json())
        except Exception:
            pass
        return fallback_spec

    def get_instant_draft(
        self,
        source_text: str,
        visual_type: Optional[str] = None,
        user_prompt: str = "",
    ) -> DiagramSpec:
        """Instantly synthesizes a high-fidelity visual structure (<5ms) without LLM latency."""
        valid_type_ids = {t["id"] for t in SUPPORTED_VISUAL_TYPES}
        if not visual_type or visual_type not in valid_type_ids:
            visual_type = self._heuristic_analysis(source_text, user_prompt)
        return self._generate_fallback_spec(source_text, visual_type, user_prompt)

    def _heuristic_analysis(self, text: str, prompt: str) -> str:
        combined = f"{text} {prompt}".lower()

        # 1. Hierarchy / Org Chart / Leadership tiers
        if any(w in combined for w in [
            "org chart", "organization chart", "hierarchy", "leadership structure",
            "reporting to", "department structure", "management tree", "taxonomy",
            "organizational chart", "organogram", "tiers"
        ]):
            return VisualTypeEnum.HIERARCHY.value

        # 2. Decision Flow / Branching logic
        if any(w in combined for w in [
            "decision tree", "branching logic", "decision flow", "approval workflow",
            "approval process", "if approved", "if rejected", "escalation flow",
            "condition tree", "if yes", "if no"
        ]):
            return VisualTypeEnum.DECISION_FLOW.value

        # 3. Standard Operating Procedures / Process Flow
        if any(w in combined for w in [
            "sop", "standard operating procedure", "procedure", "workflow",
            "process flow", "pipeline", "lifecycle", "stages", "flowchart"
        ]):
            return VisualTypeEnum.PROCESS_FLOW.value

        # 4. Timeline / Chronological Roadmaps
        if any(w in combined for w in [
            "timeline", "roadmap", "milestone", "milestones", "phase 1",
            "q1", "q2", "quarterly", "chronology", "schedule", "years"
        ]):
            return VisualTypeEnum.TIMELINE.value

        # 5. Ordered Step-by-Step Sequence / Checklist
        if any(w in combined for w in [
            "step by step", "step 1", "checklist", "instructions", "how to", "sequence"
        ]):
            return VisualTypeEnum.SEQUENCE.value

        # 6. Charts & Quantitative Metrics (uses precise keywords, numbers, and currency)
        if re.search(r"\b(line chart|trend|over time|telemetry)\b", combined) and (any(s in text for s in ["%", "$"]) or re.search(r"\d+", text)):
            return VisualTypeEnum.LINE_CHART.value
        if re.search(r"\b(pie chart|donut chart|proportion|market share)\b", combined) and (any(s in text for s in ["%", "$"]) or re.search(r"\d+", text)):
            return VisualTypeEnum.PIE_CHART.value
        if re.search(r"\b(bar chart|sales metrics|revenue chart|quantities|metrics)\b", combined) or re.search(r"\|\s*[-0-9.,%$]+\s*\|", text):
            return VisualTypeEnum.BAR_CHART.value

        # 7. Funnel / Conversion / Staged Pipeline
        if any(w in combined for w in [
            "funnel", "conversion", "sales pipeline", "lead pipeline", "qualification stages",
            "recruitment pipeline", "drop-off", "conversion rate", "qualification funnel", "intake funnel"
        ]):
            return VisualTypeEnum.FUNNEL.value

        # 8. Quadrant / 2x2 Strategic Matrix
        if any(w in combined for w in [
            "quadrant", "2x2", "strategic matrix", "eisenhower", "impact vs effort",
            "prioritization matrix", "risk vs reward", "value vs complexity"
        ]):
            return VisualTypeEnum.QUADRANT.value

        # 9. Qualitative Comparison / Matrices
        if any(w in combined for w in [
            "comparison", "compare", "versus", "vs.", "pros and cons", "matrix", "difference between"
        ]):
            return VisualTypeEnum.COMPARISON.value

        # 10. Mind Map
        if any(w in combined for w in [
            "mind map", "mindmap", "brainstorm", "subtopics", "core theme"
        ]):
            return VisualTypeEnum.MINDMAP.value

        # 11. Concept Map
        if any(w in combined for w in [
            "concept map", "entity relationship", "actors and systems", "system architecture"
        ]):
            return VisualTypeEnum.CONCEPT_MAP.value

        # 12. Circular Flywheel / Loop
        if any(w in combined for w in [
            "flywheel", "continuous loop", "iterative", "iteration", "lifecycle loop",
            "cycle", "pdca", "continuous feedback", "agile sprint", "feedback loop", "continuous improvement"
        ]):
            return VisualTypeEnum.CIRCULAR_LOOP.value

        # 13. Bento Grid / Stat Highlights
        if any(w in combined for w in [
            "bento", "bento grid", "executive summary", "key metrics", "kpi summary",
            "highlights", "dashboard highlights", "takeaways", "executive metrics", "stat cards"
        ]):
            return VisualTypeEnum.BENTO_GRID.value

        # Default fallback is process flow
        return VisualTypeEnum.PROCESS_FLOW.value

    def _generate_explanation(self, rec_type: str, text: str, prompt: str) -> str:
        explanations = {
            VisualTypeEnum.PROCESS_FLOW.value: "Recommended Process Flowchart because the content outlines sequential workflows, operational procedures, or lifecycle stages.",
            VisualTypeEnum.DECISION_FLOW.value: "Recommended Decision Flowchart to map branching conditions, approval checkpoints, and operational paths.",
            VisualTypeEnum.TIMELINE.value: "Recommended Timeline / Roadmap to clearly illustrate chronological milestones, phases, and schedule targets.",
            VisualTypeEnum.FUNNEL.value: "Recommended Conversion Funnel to illustrate staged qualifications, throughput progression, and pipeline drop-off.",
            VisualTypeEnum.QUADRANT.value: "Recommended 2x2 Strategic Matrix to evaluate priorities across impact, effort, and strategic value.",
            VisualTypeEnum.CIRCULAR_LOOP.value: "Recommended Circular Flywheel to visualize continuous iterative cycles, agile feedback loops, and lifecycle iterations.",
            VisualTypeEnum.BENTO_GRID.value: "Recommended Executive Bento Grid to showcase high-impact modular metrics and executive takeaways.",
            VisualTypeEnum.HIERARCHY.value: "Recommended Hierarchy / Org Chart to display organizational governance, department structures, and reporting tiers.",
            VisualTypeEnum.MINDMAP.value: "Recommended Mind Map to represent the core operational domain radiating into functional branches.",
            VisualTypeEnum.CONCEPT_MAP.value: "Recommended Concept Map to highlight relationships between systems, actors, and data domains.",
            VisualTypeEnum.COMPARISON.value: "Recommended Comparison Matrix to evaluate items, criteria, and operational dimensions side-by-side.",
            VisualTypeEnum.SEQUENCE.value: "Recommended Step-by-Step Sequence to present numbered checklists and sequential instructions.",
            VisualTypeEnum.BAR_CHART.value: "Recommended Bar Chart to benchmark discrete numerical metrics and quantities.",
            VisualTypeEnum.LINE_CHART.value: "Recommended Line Chart to display trends, progress telemetry, and metric trajectories over time.",
            VisualTypeEnum.PIE_CHART.value: "Recommended Pie / Donut Chart to show proportional distributions and departmental shares.",
        }
        return explanations.get(rec_type, "Optimal visual layout format tailored for this content structure.")

    def _extract_key_phrases(self, text: str) -> List[str]:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        phrases = []
        seen = set()
        for line in lines:
            # Skip markdown table syntax, dividers, and raw code blocks
            if "|" in line or "---" in line or line.startswith("```") or line.startswith("[Table]"):
                continue
            # Strip markdown formatting (*, #, _, `, -, [, ])
            line_clean = re.sub(r"[*#_`\-\[\]\(\)]+", " ", line)
            line_clean = re.sub(r"^[0-9\.\s]+", "", line_clean).strip()
            # Skip standard metadata field labels
            if re.match(r"^(version|document type|document code|owner|review frequency|page \d+)\b", line_clean, re.I):
                continue
            if 3 < len(line_clean) < 45 and not line_clean.endswith("."):
                key_lower = line_clean.lower()
                if key_lower not in seen:
                    seen.add(key_lower)
                    phrases.append(line_clean)
        return phrases[:6] if phrases else ["Core Architecture", "Operational Workflow", "Deliverables"]

    def _generate_title(self, text: str, prompt: str) -> str:
        if prompt:
            clean_prompt = prompt.replace("Create a", "").replace("visual for", "").strip()
            if len(clean_prompt) < 60:
                return clean_prompt.title()

        first_line = text.strip().splitlines()[0] if text else "Visual Overview"
        title = re.sub(r"^[#\-\*0-9\.\s]+", "", first_line).strip()
        return title[:60] if title else "Visual Knowledge Architecture"

    def _is_metadata_or_noise(self, line: str) -> bool:
        low = line.strip().lower()
        if not low or len(low) < 3 or low in ("it", "hr", "hr /", "it /"):
            return True
        if low.startswith("|") or "---" in low or low.startswith("[table]") or "+---" in low:
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
        if low in metadata_exact:
            return True
        metadata_keywords = [
            "document type", "document code", "review frequency", "version 1.",
            "version 2.", "page 1 of", "page 2 of", "all rights reserved",
            "confidential & proprietary", "it-sop-", "hr-sop-", "-sop-"
        ]
        if any(low.startswith(k) or f": {k}" in low for k in metadata_keywords):
            return True
        if re.match(r"^v?\d+\.\d+(\.\d+)?$", low) or re.match(r"^[a-z]+-sop-\d+$", low):
            return True
        return False

    def _extract_substantive_items(self, source_text: str) -> List[Dict[str, str]]:
        """Extracts substantive operational steps or concepts, strictly bypassing metadata."""
        if not source_text:
            return []

        # 1. Check if source_text contains whole-project digest [PHASE ...] blocks
        phase_blocks = re.findall(r"\[PHASE\s+\d+:\s+([^\]]+)\]\s*([^\[]*)", source_text)
        if phase_blocks:
            items = []
            for title, body in phase_blocks:
                clean_title = re.sub(r"^[#\-\*0-9\.\s]+", "", title).strip()
                bullets = [
                    re.sub(r"^[•\*\-\d\.\s]+", "", b).strip()
                    for b in body.splitlines()
                    if len(b.strip()) > 5 and not self._is_metadata_or_noise(b)
                ]
                sublabel = bullets[0][:65] if bullets else f"Stage {len(items) + 1} execution"
                items.append({"label": clean_title, "sublabel": sublabel})
            if items:
                return items

        # 2. Check for structured Markdown headings or explicit numbered sections / phases
        normalized_text = re.sub(r'(?<=[.!?\s])(\d+[\.\)])\s+', r'\n\1 ', source_text)
        lines = [l.strip() for l in normalized_text.splitlines() if l.strip() and not self._is_metadata_or_noise(l)]

        heading_pat = re.compile(
            r"^(#{1,4}\s*|(?:step|phase|section|module)\s+\d+[:\.\s-]*|\d{1,2}[\.\)]\s+)(.+)$",
            re.I
        )

        heading_items: List[Dict[str, str]] = []
        for idx, line in enumerate(lines):
            m = heading_pat.match(line)
            if m:
                clean_title = re.sub(r"^[#\-\*\.\s]+", "", line).strip()
                if 3 <= len(clean_title) <= 80 and not self._is_metadata_or_noise(clean_title):
                    sublabel = f"Stage {len(heading_items) + 1}"
                    if idx + 1 < len(lines):
                        nxt = lines[idx + 1]
                        if not heading_pat.match(nxt) and not self._is_metadata_or_noise(nxt) and len(nxt) >= 5:
                            sublabel = nxt[:65].strip()
                    heading_items.append({"label": clean_title, "sublabel": sublabel})

        # Filter out root document title if substantive section headers exist
        if len(heading_items) >= 3:
            if heading_items[0]["label"].lower().startswith("project ") and not any(
                p in heading_items[0]["label"].lower() for p in ["phase", "step", "stage"]
            ):
                heading_items = heading_items[1:]
            if len(heading_items) >= 3:
                return heading_items

        # 3. Fallback: extract from general lines, numbered procedures, or section headers
        extracted: List[Dict[str, str]] = []
        seen = set()
        step_pat = re.compile(r"^(step\s+\d+|phase\s+\d+|\d{1,2}[\.\)])\s*[:\-\s]*(.+)$", re.I)

        for l in lines:
            cleaned = l.strip()
            # Preserve "Step 1: ..." and "Phase 1: ..." prefixes for clarity
            if not (cleaned.startswith("Step ") or cleaned.startswith("Phase ")):
                cleaned = re.sub(r"^[#\-\*0-9\.\s]+", "", cleaned).strip()

            if 3 <= len(cleaned) <= 80:
                key = cleaned.lower()
                if key not in seen:
                    seen.add(key)
                    sub = f"Stage {len(extracted) + 1}"
                    if ":" in cleaned and not cleaned.startswith("Step ") and not cleaned.startswith("Phase "):
                        parts = cleaned.split(":", 1)
                        extracted.append({"label": parts[0].strip(), "sublabel": parts[1].strip()[:65]})
                    else:
                        extracted.append({"label": cleaned, "sublabel": sub})

        return extracted

    def _extract_holistic_lifecycle_items(self, source_text: str, max_items: int = 10) -> List[Dict[str, str]]:
        """
        Extracts substantive items spanning 100% of the project lifecycle from beginning to end.
        Ensures nodes represent early, middle, and final project deliverables rather than just page 1.
        """
        all_items = self._extract_substantive_items(source_text)
        if not all_items:
            return []
        if len(all_items) <= max_items:
            return all_items
        # Uniform proportional distribution across all phases of the project
        step = (len(all_items) - 1) / (max_items - 1)
        selected = [all_items[round(i * step)] for i in range(max_items)]
        selected[0] = all_items[0]
        selected[-1] = all_items[-1]
        return selected

    def _generate_fallback_spec(
        self,
        source_text: str,
        visual_type: str,
        user_prompt: str,
    ) -> DiagramSpec:
        """High-impact visual synthesis that generates whole-project, domain-rich diagrams."""
        items = self._extract_holistic_lifecycle_items(source_text, max_items=10)
        if not items:
            items = [
                {"label": "Inception & Scope", "sublabel": "Project mandate & requirements"},
                {"label": "Architecture & Design", "sublabel": "System design & security review"},
                {"label": "Core Implementation", "sublabel": "Build modules & operational logic"},
                {"label": "Testing & QA Verification", "sublabel": "Automated tests & validation"},
                {"label": "Production Deployment", "sublabel": "Rollout, CI/CD & release"},
                {"label": "Operations & Monitoring", "sublabel": "SLA tracking & KPI achievement"},
            ]

        nodes: List[NodeSpec] = []
        edges: List[EdgeSpec] = []

        if visual_type == VisualTypeEnum.DECISION_FLOW.value:
            # Branching Decision Tree Layout
            nodes = [
                NodeSpec(id="node_1", label=items[0]["label"], sublabel="Initiate intake & capture evidence", type="start", order=1, icon="Ticket", badge="01"),
                NodeSpec(id="node_2", label="Severity & Risk Triage", sublabel="Is issue critical or high impact?", type="decision", order=2, icon="GitBranch", badge="CRITERIA"),
                NodeSpec(id="node_3", label="Emergency Escalation", sublabel="P1 Bridge & Lead Support", type="process", order=3, icon="Zap", badge="P1 FAST"),
                NodeSpec(id="node_4", label="Standard Workflow Queue", sublabel="Assigned to standard queue", type="process", order=4, icon="Settings", badge="SLA 24H"),
                NodeSpec(id="node_5", label="Resolution Verification", sublabel="Is solution verified by user?", type="decision", order=5, icon="UserCheck", badge="VERIFY"),
                NodeSpec(id="node_6", label="Closure & Archival", sublabel="Ticket resolved & logged", type="end", order=6, icon="CheckCircle2", badge="DONE"),
            ]
            edges = [
                EdgeSpec(id="e_1_2", source="node_1", target="node_2", label="Submit for Triage"),
                EdgeSpec(id="e_2_3", source="node_2", target="node_3", label="Critical / High"),
                EdgeSpec(id="e_2_4", source="node_2", target="node_4", label="Standard / Normal"),
                EdgeSpec(id="e_3_5", source="node_3", target="node_5", label="Fix Implemented"),
                EdgeSpec(id="e_4_5", source="node_4", target="node_5", label="Standard Resolution"),
                EdgeSpec(id="e_5_6", source="node_5", target="node_6", label="Verified (Yes)"),
                EdgeSpec(id="e_5_4", source="node_5", target="node_4", label="Rework (No)"),
            ]

        elif visual_type == VisualTypeEnum.HIERARCHY.value:
            # Org Chart / Hierarchy: Executive -> Management -> Operations
            nodes = [
                NodeSpec(id="node_1", label="IT & Operations Leadership", sublabel="Governance & Policy Oversight", type="start", group="Executive", order=1, icon="Target", badge="TIER 1"),
                NodeSpec(id="node_2", label="Systems & Infrastructure Admin", sublabel="Core servers, access & security", type="process", group="Management", order=2, icon="Settings", badge="TIER 2"),
                NodeSpec(id="node_3", label="Service Desk & User Support Lead", sublabel="Ticketing, triage & SLA monitoring", type="process", group="Management", order=3, icon="UserCheck", badge="TIER 2"),
                NodeSpec(id="node_4", label="Technical Support Engineers", sublabel="End-user resolutions & hardware", type="process", group="Operations", order=4, icon="Cpu", badge="TIER 3"),
                NodeSpec(id="node_5", label="Department Hiring Managers", sublabel="Joiner, mover & leaver requests", type="process", group="Operations", order=5, icon="Users", badge="TIER 3"),
            ]
            edges = [
                EdgeSpec(id="e_1_2", source="node_1", target="node_2", label="Governs"),
                EdgeSpec(id="e_1_3", source="node_1", target="node_3", label="Manages"),
                EdgeSpec(id="e_3_4", source="node_3", target="node_4", label="Supervises"),
                EdgeSpec(id="e_3_5", source="node_3", target="node_5", label="Coordinates with"),
            ]

        elif visual_type == VisualTypeEnum.MINDMAP.value:
            root_title = self._generate_title(source_text, user_prompt)
            nodes.append(NodeSpec(id="node_1", label=root_title, sublabel="Core Architecture", type="start", order=1, icon="Target", badge="CORE"))
            branches = items[:8] if len(items) >= 8 else items
            for i, b in enumerate(branches, start=2):
                nid = f"node_{i}"
                icon = self._resolve_semantic_icon(b["label"], b["sublabel"], "process")
                nodes.append(NodeSpec(id=nid, label=b["label"], sublabel=b["sublabel"], type="process", order=i, icon=icon, badge=f"0{i-1}"))
                edges.append(EdgeSpec(id=f"e_1_{nid}", source="node_1", target=nid, label="Branch"))

        elif visual_type == VisualTypeEnum.COMPARISON.value:
            for i, item in enumerate(items[:4], start=1):
                nid = f"node_{i}"
                icon = self._resolve_semantic_icon(item["label"], item["sublabel"], "process")
                nodes.append(NodeSpec(id=nid, label=item["label"], sublabel=item["sublabel"], type="process", group=f"Domain {i}", order=i, icon=icon, badge=f"#{i}"))

        elif visual_type == VisualTypeEnum.CIRCULAR_LOOP.value:
            # Continuous Iterative Cycle: 4-6 nodes connected in a closed circle
            clean_steps = items[:5] if len(items) >= 4 else items[:4]
            n_len = len(clean_steps)
            for i, step in enumerate(clean_steps):
                nid = f"node_{i+1}"
                icon = self._resolve_semantic_icon(step["label"], step["sublabel"], "process")
                nodes.append(NodeSpec(
                    id=nid,
                    label=step["label"],
                    sublabel=step["sublabel"],
                    type="process",
                    order=i + 1,
                    icon=icon,
                    badge=f"CYCLE 0{i+1}"
                ))
                next_nid = f"node_{((i + 1) % n_len) + 1}"
                edges.append(EdgeSpec(id=f"e_{i+1}_{next_nid}", source=nid, target=next_nid, label="Iterate Next"))

        elif visual_type == VisualTypeEnum.BENTO_GRID.value:
            # Executive Bento Grid: 4-5 high impact stat and domain cards
            bento_badges = ["99.9% SLA", "100% COVERAGE", "TIER 1 APEX", "P1 FAST", "CORE"]
            for i, item in enumerate(items[:4], start=1):
                nid = f"node_{i}"
                icon = self._resolve_semantic_icon(item["label"], item["sublabel"], "process")
                nodes.append(NodeSpec(
                    id=nid,
                    label=item["label"],
                    sublabel=item["sublabel"],
                    type="process",
                    group=f"Pillar {i}",
                    order=i,
                    icon=icon,
                    badge=bento_badges[(i - 1) % len(bento_badges)]
                ))

        elif visual_type == VisualTypeEnum.FUNNEL.value:
            # Staged Conversion Funnel: 4-5 narrowing stages
            funnel_stages = items[:5] if len(items) >= 4 else items[:4]
            conversion_pcts = ["100%", "68%", "42%", "24%", "12%"]
            for i, step in enumerate(funnel_stages):
                nid = f"node_{i+1}"
                icon = self._resolve_semantic_icon(step["label"], step["sublabel"], "process")
                nodes.append(NodeSpec(
                    id=nid,
                    label=step["label"],
                    sublabel=step["sublabel"],
                    type="process",
                    order=i + 1,
                    icon=icon,
                    badge=conversion_pcts[i % len(conversion_pcts)],
                    group=f"Stage 0{i+1}"
                ))
                if i > 0:
                    edges.append(EdgeSpec(
                        id=f"e_{i}_{i+1}",
                        source=f"node_{i}",
                        target=nid,
                        label=f"{conversion_pcts[i % len(conversion_pcts)]} Pass",
                    ))

        elif visual_type == VisualTypeEnum.QUADRANT.value:
            # 2x2 Strategic Matrix: 4 quadrants
            quadrant_names = ["Quick Wins", "Strategic Bets", "Fill-ins", "Low Priority"]
            quadrant_badges = ["HIGH IMPACT • EASY", "HIGH IMPACT • HARD", "LOW IMPACT • EASY", "RE-EVALUATE"]
            quad_items = items[:4]
            for i, item in enumerate(quad_items):
                nid = f"node_{i+1}"
                icon = self._resolve_semantic_icon(item["label"], item["sublabel"], "process")
                nodes.append(NodeSpec(
                    id=nid,
                    label=item["label"],
                    sublabel=item["sublabel"],
                    type="process",
                    group=quadrant_names[i % 4],
                    order=i + 1,
                    icon=icon,
                    badge=quadrant_badges[i % 4],
                ))

        elif visual_type == VisualTypeEnum.CONCEPT_MAP.value:
            # Multi-tier interconnected architecture: Client -> Gateway -> Core Service -> Database / External
            concept_groups = ["Client / Actor", "API Gateway", "Core Engine", "Data Storage", "External Integration"]
            concept_icons = ["UserCheck", "Cpu", "Settings", "Database", "ShieldCheck"]
            clean_steps = items[:5]
            for i, step in enumerate(clean_steps):
                nid = f"node_{i+1}"
                group_name = concept_groups[i % len(concept_groups)]
                icon_name = concept_icons[i % len(concept_icons)]
                nodes.append(NodeSpec(
                    id=nid,
                    label=step["label"],
                    sublabel=step["sublabel"],
                    type="process" if i > 0 else "start",
                    group=group_name,
                    order=i + 1,
                    icon=icon_name,
                    badge=f"SYS 0{i+1}",
                ))
            if len(nodes) >= 3:
                edges.append(EdgeSpec(id="e_1_2", source="node_1", target="node_2", label="HTTPS /request"))
                edges.append(EdgeSpec(id="e_2_3", source="node_2", target="node_3", label="Dispatches task"))
            if len(nodes) >= 4:
                edges.append(EdgeSpec(id="e_3_4", source="node_3", target="node_4", label="Persists state"))
            if len(nodes) >= 5:
                edges.append(EdgeSpec(id="e_3_5", source="node_3", target="node_5", label="Syncs webhook"))

        else:
            # Sequential Process / Timeline / Sequence / Concept Map spanning 100% of project
            clean_steps = items[:10] if len(items) >= 10 else items
            for i, step in enumerate(clean_steps):
                nid = f"node_{i+1}"
                ntype = "start" if i == 0 else ("end" if i == len(clean_steps) - 1 else "process")
                icon = self._resolve_semantic_icon(step["label"], step["sublabel"], ntype)
                nodes.append(
                    NodeSpec(
                        id=nid,
                        label=step["label"],
                        sublabel=step["sublabel"],
                        type=ntype,
                        order=i + 1,
                        icon=icon,
                        badge=f"{(i+1):02d}",
                    )
                )
                if i > 0:
                    edges.append(
                        EdgeSpec(
                            id=f"e_{i}_{i+1}",
                            source=f"node_{i}",
                            target=nid,
                            label=None,
                        )
                    )

        chart_data = None
        if visual_type in [VisualTypeEnum.BAR_CHART.value, VisualTypeEnum.LINE_CHART.value, VisualTypeEnum.PIE_CHART.value]:
            chart_items = self._extract_holistic_lifecycle_items(source_text, max_items=5)
            if not chart_items:
                chart_items = [
                    {"label": "Phase 1: Planning"},
                    {"label": "Phase 2: Build"},
                    {"label": "Phase 3: Test"},
                    {"label": "Phase 4: Deploy"},
                    {"label": "Phase 5: Operate"},
                ]
            chart_data = ChartDataSpec(
                xAxisKey="Phase / Pillar",
                dataKeys=["Progress KPI %"],
                rows=[{"Phase / Pillar": item["label"][:20], "Progress KPI %": min(100, 20 + i * 20)} for i, item in enumerate(chart_items)],
                unit="%",
            )

        return DiagramSpec(
            version="1.0",
            diagramType=visual_type,
            title=self._generate_title(source_text, user_prompt),
            summary=f"End-to-End {visual_type.replace('_', ' ').title()} visual spanning the entire project lifecycle.",
            explanation="Synthesized structured visual architecture reflecting core operational nodes across all project phases.",
            theme="modern",
            nodes=nodes,
            edges=edges,
            chartData=chart_data,
            sourceReferences=["Full Project Scope"],
            scopeCoverage="Whole Project Scope",
            scopePhases=[item["label"] for item in items],
        )

    def enhance_node(
        self,
        node: NodeSpec,
        diagram_type: Optional[str] = None,
        diagram_title: Optional[str] = None,
    ) -> EnhanceNodeResponse:
        """
        Enriches a visual node with executive polish, sharper terminology,
        operational metrics/SLAs, semantic badges, and contextually matched icons.
        """
        improvements: List[str] = []
        original_label = node.label.strip()
        original_sublabel = (node.sublabel or "").strip()

        # 1. Standardize technical acronyms and casing
        acronym_map = {
            r"\bapi\b": "API",
            r"\bui\b": "UI",
            r"\bux\b": "UX",
            r"\bdb\b": "DB",
            r"\bsla\b": "SLA",
            r"\bslo\b": "SLO",
            r"\bkpi\b": "KPI",
            r"\biam\b": "IAM",
            r"\bsso\b": "SSO",
            r"\brbac\b": "RBAC",
            r"\bci/cd\b": "CI/CD",
            r"\bjwt\b": "JWT",
            r"\brest\b": "REST",
            r"\baws\b": "AWS",
            r"\bgcp\b": "GCP",
            r"\bsql\b": "SQL",
        }

        enhanced_label = original_label
        for pattern, rep in acronym_map.items():
            enhanced_label = re.sub(pattern, rep, enhanced_label, flags=re.IGNORECASE)

        if enhanced_label != original_label:
            improvements.append("Standardized technical acronyms and casing")

        # 2. Executive wording & action verbs
        action_enhancements = [
            (r"^(start|begin|initiate)$", "Initialize System Pipeline"),
            (r"^(process|processing|execute)$", "Execute Core Processing Engine"),
            (r"^(check|verify|validation)$", "Perform Validation & Integrity Audit"),
            (r"^(store|save|database)$", "Persist Transaction State in DB"),
            (r"^(end|finish|complete)$", "Finalize Output & Disseminate"),
            (r"^(report|reporting)$", "Generate Executive Intelligence Report"),
            (r"^(notification|alert)$", "Dispatch Real-Time Alert & Webhook"),
        ]
        for pattern, replacement in action_enhancements:
            if re.match(pattern, enhanced_label, re.IGNORECASE):
                enhanced_label = replacement
                improvements.append("Upgraded to executive action-oriented verb")
                break

        # 3. Enhanced sublabel with operational nuance & benchmarks
        enhanced_sublabel = original_sublabel
        if not enhanced_sublabel or len(enhanced_sublabel) < 15:
            combined_txt = f"{enhanced_label} {node.type or ''}".lower()
            if any(k in combined_txt for k in ["auth", "security", "token", "login", "credential"]):
                enhanced_sublabel = "Enforces zero-trust authentication, JWT rotation, and RBAC audits."
            elif any(k in combined_txt for k in ["data", "db", "store", "persist", "sql", "cache"]):
                enhanced_sublabel = "Sub-10ms query latency with ACID compliance and automated failover."
            elif any(k in combined_txt for k in ["validat", "check", "verify", "audit", "triage"]):
                enhanced_sublabel = "Executes schema validation, boundary checks, and automated compliance logging."
            elif any(k in combined_txt for k in ["api", "gateway", "dispatch", "route", "ingress"]):
                enhanced_sublabel = "High-throughput edge routing with rate-limiting and TLS termination."
            elif any(k in combined_txt for k in ["report", "analytics", "dashboard", "metric"]):
                enhanced_sublabel = "Aggregates key operational KPIs into real-time executive dashboard telemetry."
            else:
                enhanced_sublabel = "Optimized for high-availability throughput and deterministic execution."
            improvements.append("Synthesized operational benchmarks and architecture scope")
        else:
            for pattern, rep in acronym_map.items():
                enhanced_sublabel = re.sub(pattern, rep, enhanced_sublabel, flags=re.IGNORECASE)
            if not enhanced_sublabel.endswith("."):
                enhanced_sublabel += "."

        # 4. Semantic badge enhancement
        enhanced_badge = node.badge
        combined_txt = f"{enhanced_label} {enhanced_sublabel}".lower()
        if not enhanced_badge or enhanced_badge.isdigit() or len(enhanced_badge) <= 2:
            if any(k in combined_txt for k in ["sec", "auth", "token", "shield"]):
                enhanced_badge = "Zero-Trust"
            elif any(k in combined_txt for k in ["latency", "speed", "fast", "ms", "sub-"]):
                enhanced_badge = "SLA < 50ms"
            elif any(k in combined_txt for k in ["critical", "p1", "urgent", "emergency"]):
                enhanced_badge = "P1 Critical"
            elif any(k in combined_txt for k in ["data", "db", "sql", "persist"]):
                enhanced_badge = "99.99% Avail"
            elif any(k in combined_txt for k in ["auto", "pipeline", "ci/cd"]):
                enhanced_badge = "Automated"
            elif node.type == "start":
                enhanced_badge = "EntryPoint"
            elif node.type == "end":
                enhanced_badge = "FinalState"
            elif node.order:
                enhanced_badge = f"Stage 0{node.order}"
            else:
                enhanced_badge = "Active"
            improvements.append(f"Applied contextual operational badge: {enhanced_badge}")

        # 5. Semantic icon detection
        enhanced_icon = self._resolve_semantic_icon(enhanced_label, enhanced_sublabel, node.type or "")
        if enhanced_icon != (node.icon or ""):
            improvements.append(f"Auto-matched Lucide icon: {enhanced_icon}")

        # 6. Functional Group
        enhanced_group = node.group
        if not enhanced_group:
            if any(k in combined_txt for k in ["auth", "sec", "perm", "token"]):
                enhanced_group = "Security & Governance"
            elif any(k in combined_txt for k in ["db", "store", "cache", "data"]):
                enhanced_group = "Data Infrastructure"
            elif any(k in combined_txt for k in ["api", "client", "ui", "gateway"]):
                enhanced_group = "Ingress & Edge"
            else:
                enhanced_group = "Core Operations"
            improvements.append(f"Assigned architectural cluster: {enhanced_group}")

        enhanced_node = NodeSpec(
            id=node.id,
            label=enhanced_label,
            sublabel=enhanced_sublabel,
            type=node.type,
            group=enhanced_group,
            color=node.color,
            order=node.order,
            icon=enhanced_icon,
            badge=enhanced_badge,
        )

        return EnhanceNodeResponse(
            node=enhanced_node,
            improvements=improvements or ["Polished typography and visual hierarchy"],
        )

    def apply_canvas_copilot(
        self,
        diagram: DiagramSpec,
        instruction: str,
    ) -> CanvasCopilotResponse:
        """
        Executes natural language diagram mutations, additions, restyling, or SLA syntheses.
        Uses deterministic heuristic transformers for sub-10ms response on common actions,
        with LLM fallback for creative compositional modifications.
        """
        instr_lower = instruction.strip().lower()
        applied: List[str] = []
        explanation = "Diagram successfully updated via Canvas AI Copilot."

        # Clone diagram model
        updated_nodes: List[NodeSpec] = [NodeSpec(**n.model_dump()) for n in diagram.nodes]
        updated_edges: List[EdgeSpec] = [EdgeSpec(**e.model_dump()) for e in diagram.edges]
        updated_theme = diagram.theme or "modern"
        updated_title = diagram.title
        updated_summary = diagram.summary

        # 1. Theme / Visual Aesthetic Transformation
        if any(w in instr_lower for w in ["cyberpunk", "neon", "matrix"]):
            updated_theme = "cyberpunk"
            applied.append("Applied Cyberpunk theme with glowing neon highlights")
            explanation = "Restyled canvas to Cyberpunk theme with high-contrast neon borders and glow."
        elif any(w in instr_lower for w in ["whiteboard", "light", "clean", "paper"]):
            updated_theme = "whiteboard"
            applied.append("Applied Clean Whiteboard theme")
            explanation = "Restyled canvas to clean, high-clarity Whiteboard theme."
        elif any(w in instr_lower for w in ["emerald", "green", "nature"]):
            updated_theme = "emerald"
            applied.append("Applied Emerald Forest theme")
            explanation = "Restyled canvas to Emerald theme with organic green accents."
        elif any(w in instr_lower for w in ["gradient", "sunset"]):
            updated_theme = "gradient"
            applied.append("Applied Sunset Gradient theme")
            explanation = "Restyled canvas to Sunset Gradient theme."
        elif any(w in instr_lower for w in ["dark", "bbot"]):
            updated_theme = "bbot-dark"
            applied.append("Applied bbot Signature Dark theme")
            explanation = "Restyled canvas to bbot Signature Dark theme."

        # 2. Add SLA / Performance / KPI Badges
        if any(w in instr_lower for w in ["sla", "kpi", "badge", "metrics", "latency", "uptime"]):
            sla_pool = ["SLA < 15ms", "99.99% Uptime", "Zero-Trust", "P1 Fast", "Audit Logged", "Sub-25ms", "HA Cluster", "SOC2 Validated"]
            for idx, node in enumerate(updated_nodes):
                node.badge = sla_pool[idx % len(sla_pool)]
            applied.append("Synthesized high-performance SLA & uptime metrics onto all nodes")
            explanation = "Assigned enterprise SLA metrics, latency targets, and compliance badges across all workflow stages."

        # 3. Add Security / Compliance / Audit Gate
        if any(w in instr_lower for w in ["security", "compliance", "audit", "auth", "gate", "shield"]):
            gate_id = f"node_sec_{uuid.uuid4().hex[:4]}"
            gate_node = NodeSpec(
                id=gate_id,
                label="Security & Compliance Gate",
                sublabel="Enforces zero-trust token validation, vulnerability scan, and RBAC policy audit.",
                type="process",
                group="Security & Governance",
                badge="Zero-Trust • SOC2",
                icon="ShieldCheck",
                order=len(updated_nodes) + 1,
            )
            insert_idx = 1 if len(updated_nodes) >= 2 else len(updated_nodes)
            updated_nodes.insert(insert_idx, gate_node)

            for i, n in enumerate(updated_nodes):
                n.order = i + 1

            new_edges = []
            for i in range(len(updated_nodes) - 1):
                new_edges.append(
                    EdgeSpec(
                        id=f"e_{updated_nodes[i].id}_{updated_nodes[i+1].id}",
                        source=updated_nodes[i].id,
                        target=updated_nodes[i+1].id,
                        label="Pass Compliance" if updated_nodes[i].id == gate_id else (updated_edges[min(i, len(updated_edges)-1)].label if updated_edges and updated_edges[min(i, len(updated_edges)-1)].label != "Next Phase" else None),
                    )
                )
            updated_edges = new_edges
            applied.append("Inserted Security & Compliance verification gate into workflow")
            explanation = "Added a dedicated Security & Compliance verification node with zero-trust validation criteria and linked it into the execution pipeline."

        # 4. Add Escalation / Error Handling / Rollback Branch
        elif any(w in instr_lower for w in ["rollback", "error", "fallback", "escalat", "retry", "failure", "exception"]):
            esc_id = f"node_esc_{uuid.uuid4().hex[:4]}"
            esc_node = NodeSpec(
                id=esc_id,
                label="Emergency Escalation & Rollback",
                sublabel="Automated circuit-breaker tripping, P1 on-call alert dispatch, and rollback to safe checkpoint.",
                type="process",
                group="Resilience & Recovery",
                badge="P1 Fast Rollback",
                icon="Zap",
                order=len(updated_nodes) + 1,
            )
            updated_nodes.append(esc_node)
            source_node_id = updated_nodes[min(2, len(updated_nodes)-2)].id if len(updated_nodes) >= 3 else updated_nodes[0].id
            updated_edges.append(
                EdgeSpec(
                    id=f"e_{source_node_id}_{esc_id}",
                    source=source_node_id,
                    target=esc_id,
                    label="On Failure / Error",
                    style="dashed",
                )
            )
            applied.append("Added emergency rollback & escalation branch")
            explanation = "Created an emergency escalation branch connected with an 'On Failure / Error' trigger for operational fault tolerance."

        # 5. Executive Polish / Sharpen Terminology
        elif any(w in instr_lower for w in ["polish", "sharpen", "professional", "executive", "concise"]):
            polished_nodes = []
            for n in updated_nodes:
                enh = self.enhance_node(n, diagram_type=diagram.diagramType, diagram_title=diagram.title)
                polished_nodes.append(enh.node)
            updated_nodes = polished_nodes
            applied.append("Polished technical vocabulary, acronyms, and executive action verbs across all nodes")
            explanation = "Applied executive polish to all nodes: standardized technical acronyms, sharpened action verbs, and refined SLA bullet points."

        # 6. Add Custom Node / Stage
        elif "add" in instr_lower or "insert" in instr_lower or "create" in instr_lower:
            cleaned_instr = re.sub(r"^(add|insert|create)\s+(a\s+|an\s+|the\s+)?(node|stage|step|phase)?\s*(called|named|for)?\s*", "", instruction, flags=re.IGNORECASE).strip()
            new_label = cleaned_instr[:45].strip().title() or "Additional Execution Stage"
            new_id = f"node_{uuid.uuid4().hex[:4]}"
            new_node = NodeSpec(
                id=new_id,
                label=new_label,
                sublabel="Operational criteria and verification checkpoint synthesized by Canvas Copilot.",
                type="process",
                badge=f"Stage 0{len(updated_nodes) + 1}",
                icon=self._resolve_semantic_icon(new_label, "", "process"),
                order=len(updated_nodes) + 1,
            )
            updated_nodes.append(new_node)
            if len(updated_nodes) >= 2:
                prev_id = updated_nodes[-2].id
                updated_edges.append(
                    EdgeSpec(
                        id=f"e_{prev_id}_{new_id}",
                        source=prev_id,
                        target=new_id,
                        label="Next Step",
                    )
                )
            applied.append(f"Added new stage: '{new_label}'")
            explanation = f"Added '{new_label}' to the diagram and connected it to the workflow."

        # If no heuristic matched, attempt LLM creative transformation
        if not applied:
            try:
                copilot_prompt = (
                    "<|im_start|>system\n"
                    "You are the Visual Studio Canvas AI Copilot. Your job is to modify an existing diagram JSON based on user natural language instructions.\n"
                    "Existing Diagram JSON:\n"
                    f"{diagram.model_dump_json()}\n\n"
                    f"User Instruction: {instruction}\n"
                    "Respond ONLY with a valid JSON in this schema:\n"
                    "```json\n"
                    "{\n"
                    '  "explanation": "Brief 1-sentence summary of what was changed",\n'
                    '  "appliedChanges": ["Added X", "Modified Y"],\n'
                    '  "diagram": <complete updated DiagramSpec JSON with nodes and edges>\n'
                    "}\n"
                    "```<|im_end|>\n"
                    "<|im_start|>assistant\n```json\n"
                )
                stream = self.provider.generate_stream(copilot_prompt, max_tokens=700, temperature=0.1)
                llm_output = ""
                for chunk in stream:
                    if chunk.get("type") == "text":
                        llm_output += chunk["content"]
                parsed = self._extract_json_from_text(llm_output)
                if parsed and isinstance(parsed.get("diagram"), dict):
                    updated_diagram = DiagramSpec(**parsed["diagram"])
                    return CanvasCopilotResponse(
                        diagram=updated_diagram,
                        explanation=parsed.get("explanation") or "Canvas AI Copilot successfully modified the diagram.",
                        appliedChanges=parsed.get("appliedChanges") or ["Applied conversational modifications"],
                    )
            except Exception as llm_err:
                print(f"[Canvas Copilot] LLM generation error: {llm_err}")

        # Construct updated DiagramSpec
        result_spec = DiagramSpec(
            version=diagram.version,
            diagramType=diagram.diagramType,
            title=updated_title,
            summary=updated_summary,
            explanation=diagram.explanation,
            theme=updated_theme,
            nodes=updated_nodes,
            edges=updated_edges,
            chartData=diagram.chartData,
            sourceReferences=diagram.sourceReferences,
            scopeCoverage=diagram.scopeCoverage,
            scopePhases=[n.label for n in updated_nodes],
        )

        return CanvasCopilotResponse(
            diagram=result_spec,
            explanation=explanation,
            appliedChanges=applied or ["Diagram refined by Canvas AI Copilot"],
        )


