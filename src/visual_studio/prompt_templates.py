"""
Prompt templates and formatting for Qwen2.5 3B Visual Studio generation.
"""

def build_recommendation_prompt(source_text: str, user_prompt: str = "") -> str:
    user_instruction_block = (
        f"\n[User Custom Instructions]:\n{user_prompt}\n" if user_prompt else ""
    )

    prompt = (
        "<|im_start|>system\n"
        "You are an expert visual information architect and enterprise diagram designer. "
        "Your task is to analyze the source material and recommend the single best visual representation format.\n"
        "Available formats:\n"
        "- process_flow: sequential procedures, pipelines, or lifecycles\n"
        "- decision_flow: branching choices, if/else rules, conditional logic\n"
        "- timeline: historical milestones, roadmap, quarters, dates\n"
        "- funnel: staged qualification, conversion funnels, and drop-off pipelines\n"
        "- quadrant: 2x2 strategic matrix (Impact vs Effort, Risk vs Reward, Prioritization)\n"
        "- hierarchy: org chart, management tiers, taxonomy breakdown\n"
        "- mindmap: central core concept with radiating subtopics\n"
        "- concept_map: interconnected actors, systems, APIs, and data stores\n"
        "- comparison: side-by-side evaluation of features, options, or competitors\n"
        "- sequence: ordered step-by-step checklist or instructions\n"
        "- bar_chart: discrete metrics, counts, sales, or volume comparisons\n"
        "- line_chart: trends over time, continuous progress or rates\n"
        "- pie_chart: proportions, market shares, resource distribution\n"
        "- circular_loop: continuous iterative cycles, feedback loops, or flywheels\n"
        "- bento_grid: executive modular metric highlights and high-impact stat showcases\n\n"
        "Respond ONLY with a valid JSON object in this exact schema (no additional commentary):\n"
        "```json\n"
        "{\n"
        '  "recommendedType": "process_flow",\n'
        '  "explanation": "Brief 1-2 sentence explanation of why this visual type is optimal for this specific content.",\n'
        '  "keyEntities": ["Entity 1", "Entity 2", "Entity 3"],\n'
        '  "suggestedTitle": "Crisp Descriptive Title"\n'
        "}\n"
        "```<|im_end|>\n"
        "<|im_start|>user\n"
        f"[Source Material]:\n{source_text}\n"
        f"{user_instruction_block}\n"
        "Analyze the content and provide the recommendation JSON.<|im_end|>\n"
        "<|im_start|>assistant\n"
        "```json\n"
    )
    return prompt


def build_diagram_generation_prompt(
    source_text: str,
    visual_type: str,
    user_prompt: str = "",
) -> str:
    user_instruction_block = (
        f"\n[User Custom Instructions]:\n{user_prompt}\n" if user_prompt else ""
    )

    type_instructions = {
        "process_flow": (
            "Create a clear sequential process flow spanning the document lifecycle from start to finish. Generate 4 to 6 clean, foundational nodes with node types ('start', 'process', 'end'). "
            "Connect each consecutive stage with directed edges. Assign concise labels (2-5 words) and rich sublabels."
        ),
        "decision_flow": (
            "Create an authentic branching decision flowchart covering the entire operational process. Include 1-2 distinct question/decision nodes ('decision') "
            "that branch into condition paths (edge labels 'Yes / Approved', 'No / Escalation'). Connect to respective resolution nodes."
        ),
        "timeline": (
            "Create a chronological roadmap or milestone track spanning the complete document journey from launch to final delivery. Order nodes sequentially (5 to 10 nodes) by milestone or date (use badges like 'Phase 1', 'M1', 'Final'). "
            "Put milestone target names in 'label' and key deliverables or criteria in 'sublabel'."
        ),
        "funnel": (
            "Create a top-to-bottom staged qualification or conversion funnel spanning all pipeline stages. Generate 4 to 6 stages with decreasing throughput or conversion scale "
            "(e.g. Lead Intake -> Qualification -> Deep Assessment -> Commercial Proposal -> Final Closure). "
            "Put conversion rate or stage metric in 'badge' (e.g. '100%', '68%', '34%', '15%'). Put stage title in 'label' and operational criteria in 'sublabel'."
        ),
        "quadrant": (
            "Create a 2x2 strategic decision matrix (e.g. Impact vs Effort, Value vs Complexity, or Risk vs Return). "
            "Generate 4 distinct quadrant cards. Assign each node to group: 'Quick Wins', 'Strategic Bets', 'Fill-ins', or 'Low Priority'. "
            "In 'badge', write the priority score (e.g. 'HIGH IMPACT', 'P1', 'EASY', 'RE-EVALUATE')."
        ),
        "hierarchy": (
            "Create a top-down executive governance or org chart tree. Root apex node must have group='Executive' (or 'Governance'). "
            "Middle tier nodes must have group='Management'. Bottom tier nodes must have group='Operations' (or 'Squads')."
        ),
        "mindmap": (
            "Create a comprehensive mind map covering all core sections of the document. The central core topic is node_1 (badge='CORE'). Create 5 to 8 distinct satellite branch nodes "
            "connected from node_1, each representing a substantive operational domain or key section."
        ),
        "concept_map": (
            "Create an interconnected system and architecture relationship map covering all systems, data stores, and actors in the document. Distribute nodes across groups like 'Client / Actor', 'Core Services', "
            "'Data Stores', and 'External Integrations'. Every edge MUST have a meaningful technical action label (e.g. 'HTTP POST /auth', 'SQL Store', 'Pub/Sub Event', 'Sync Webhook')."
        ),
        "comparison": (
            "Create a side-by-side evaluation matrix comparing 2 to 3 distinct approaches, tools, or options. "
            "Use 'group' field to identify the option (e.g. 'Option A: Cloud Native', 'Option B: Hybrid On-Prem'). "
            "In 'sublabel', provide clear feature bullet points, capabilities, or trade-offs."
        ),
        "sequence": (
            "Create an ordered step-by-step executive SOP checklist covering the entire document from initiation to closure. Number each step clearly (e.g. 'Step 1: Intake' through final resolution). Generate 5 to 10 actionable steps with specific operational checks in 'sublabel'."
        ),
        "bar_chart": (
            "Extract quantitative categories and numerical values. Populate the 'chartData' object with 'xAxisKey' (e.g. 'Category'), "
            "'dataKeys' (e.g. ['Value']), and 'rows' (array of {Category: string, Value: number})."
        ),
        "line_chart": (
            "Extract time-series or trend metrics. Populate the 'chartData' object with 'xAxisKey' (e.g. 'Period' or 'Year'), "
            "'dataKeys' (e.g. ['Metric']), and 'rows' (array of {Period: string, Metric: number})."
        ),
        "pie_chart": (
            "Extract proportional distribution values totaling ~100% or categorical share. Populate the 'chartData' object with "
            "'xAxisKey': 'name', 'dataKeys': ['value'], and 'rows': [{name: string, value: number}]."
        ),
        "circular_loop": (
            "Create a continuous circular flywheel or iterative lifecycle loop. Generate 4 to 6 sequential nodes "
            "(e.g. Plan -> Build -> Verify -> Deploy -> Monitor -> Iterate) connected in a closed circle where the last node connects back to node_1. "
            "Put stage deliverable in 'sublabel' and phase code in 'badge'."
        ),
        "bento_grid": (
            "Create an executive Bento Grid showcase. Generate 3 to 5 high-impact modular cards. "
            "Put bold hero numbers or KPI metrics in 'badge' (e.g. '99.9%', '24H SLA', 'P1 FAST', '100% COVERAGE'). "
            "Put headline takeaway in 'label' and deep actionable bullet details in 'sublabel'."
        ),
    }

    target_guide = type_instructions.get(
        visual_type,
        "Create an organized node and edge diagram representing the core facts.",
    )

    prompt = (
        "<|im_start|>system\n"
        "You are an expert visual diagram designer. "
        f"Generate a {visual_type} JSON diagram.\n"
        f"Format Directive: {target_guide}\n"
        "Rules:\n"
        "- WHOLE-DOCUMENT COVERAGE MANDATORY: You MUST cover 100% of the provided document lifecycle from the very first phase through the intermediate operational steps to the final delivery/terminal stage. NEVER stop after the first 1-2 sections or provide partial/half coverage.\n"
        "- Generate between 4 and 6 concise, high-impact nodes representing the core phases or milestones of the workflow.\n"
        "- Ensure the first node represents the initial phase/ingress, subsequent nodes cover all intermediate milestones, and the final node represents the terminal outcome / final closure.\n"
        "- Each node MUST have: 'label' (2-4 words), 'sublabel' (6-14 words), 'type' ('start', 'process', 'end', 'decision'), 'badge' (e.g. '01', '100%', 'P1', 'HIGH IMPACT'), 'icon' (e.g. ShieldCheck, Database, UserCheck, Ticket, Zap, GitBranch, Settings, CheckCircle2, Clock, Cpu).\n"
        "- Output strictly valid, closed JSON containing 'title' and 'nodes' array. (Sequential edges will be connected automatically).\n<|im_end|>\n"
        "<|im_start|>user\n"
        f"[Source Content]:\n{source_text}\n"
        f"{user_instruction_block}\n"
        f"Generate the {visual_type} JSON.<|im_end|>\n"
        "<|im_start|>assistant\n"
        f'{{\n  "diagramType": "{visual_type}",\n'
    )
    return prompt
