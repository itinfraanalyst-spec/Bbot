import uuid
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator


class VisualTypeEnum(str, Enum):
    PROCESS_FLOW = "process_flow"
    DECISION_FLOW = "decision_flow"
    TIMELINE = "timeline"
    HIERARCHY = "hierarchy"
    MINDMAP = "mindmap"
    CONCEPT_MAP = "concept_map"
    COMPARISON = "comparison"
    SEQUENCE = "sequence"
    BAR_CHART = "bar_chart"
    LINE_CHART = "line_chart"
    PIE_CHART = "pie_chart"
    CIRCULAR_LOOP = "circular_loop"
    BENTO_GRID = "bento_grid"
    FUNNEL = "funnel"
    QUADRANT = "quadrant"


SUPPORTED_VISUAL_TYPES = [
    {
        "id": VisualTypeEnum.PROCESS_FLOW.value,
        "name": "Process Flowchart",
        "description": "Sequential business workflows, lifecycles, and pipelines.",
        "icon": "GitFork",
        "category": "flow",
    },
    {
        "id": VisualTypeEnum.DECISION_FLOW.value,
        "name": "Decision Flowchart",
        "description": "Branching paths, approvals, conditional logic, and rule trees.",
        "icon": "GitBranch",
        "category": "flow",
    },
    {
        "id": VisualTypeEnum.TIMELINE.value,
        "name": "Timeline / Roadmap",
        "description": "Chronological history, project phases, quarters, and milestones.",
        "icon": "Clock",
        "category": "temporal",
    },
    {
        "id": VisualTypeEnum.FUNNEL.value,
        "name": "Conversion / Funnel Pipeline",
        "description": "Staged qualification, conversion funnels, and drop-off pipelines.",
        "icon": "Filter",
        "category": "flow",
    },
    {
        "id": VisualTypeEnum.QUADRANT.value,
        "name": "2x2 Strategic Matrix",
        "description": "Impact vs Effort, risk vs reward, and prioritization quadrant maps.",
        "icon": "Grid2x2",
        "category": "comparison",
    },
    {
        "id": VisualTypeEnum.CIRCULAR_LOOP.value,
        "name": "Circular Flywheel / Loop",
        "description": "Continuous agile cycles, feedback loops, and iterative systems.",
        "icon": "RotateCw",
        "category": "flow",
    },
    {
        "id": VisualTypeEnum.BENTO_GRID.value,
        "name": "Executive Bento Grid",
        "description": "Executive modular metric showcase with high-impact cards.",
        "icon": "LayoutGrid",
        "category": "structure",
    },
    {
        "id": VisualTypeEnum.HIERARCHY.value,
        "name": "Hierarchy / Org Chart",
        "description": "Top-down structures, management levels, and taxonomy trees.",
        "icon": "Layers",
        "category": "structure",
    },
    {
        "id": VisualTypeEnum.MINDMAP.value,
        "name": "Mind Map",
        "description": "Central concept with radiating topic branches and sub-points.",
        "icon": "Network",
        "category": "structure",
    },
    {
        "id": VisualTypeEnum.CONCEPT_MAP.value,
        "name": "Concept Relationship Map",
        "description": "Entities, actors, systems, and interconnected relationships.",
        "icon": "Share2",
        "category": "relationship",
    },
    {
        "id": VisualTypeEnum.COMPARISON.value,
        "name": "Comparison / Matrix",
        "description": "Side-by-side evaluation of features, options, or competitors.",
        "icon": "Columns",
        "category": "comparison",
    },
    {
        "id": VisualTypeEnum.SEQUENCE.value,
        "name": "Step-by-Step Sequence",
        "description": "Numbered instructions, ordered procedures, and checklist stages.",
        "icon": "ListOrdered",
        "category": "flow",
    },
    {
        "id": VisualTypeEnum.BAR_CHART.value,
        "name": "Bar Chart",
        "description": "Categorical comparisons, volume, counts, and performance stats.",
        "icon": "BarChart3",
        "category": "chart",
    },
    {
        "id": VisualTypeEnum.LINE_CHART.value,
        "name": "Line Chart",
        "description": "Trends over time, price shifts, and continuous telemetry.",
        "icon": "TrendingUp",
        "category": "chart",
    },
    {
        "id": VisualTypeEnum.PIE_CHART.value,
        "name": "Pie / Donut Chart",
        "description": "Proportions, market shares, resource distribution, and breakdowns.",
        "icon": "PieChart",
        "category": "chart",
    },
]


class NodeSpec(BaseModel):
    id: str = Field(..., description="Unique stable identifier for the node")
    label: str = Field(..., min_length=1, max_length=120, description="Primary concise label")
    sublabel: Optional[str] = Field(None, max_length=240, description="Secondary contextual details")
    type: Optional[str] = Field("process", description="Node role: start, process, decision, end, entity, store, concept")
    group: Optional[str] = Field(None, description="Optional cluster or category grouping")
    color: Optional[str] = Field(None, description="Hex or theme color override")
    order: Optional[int] = Field(None, description="Sequential ordering if applicable")
    icon: Optional[str] = Field(None, description="Semantic icon name e.g. ShieldCheck, Database, UserCheck, Ticket, Zap")
    badge: Optional[str] = Field(None, description="Step number or metric badge e.g. '01', 'P1', '99.9%'")
    imageUrl: Optional[str] = Field(None, description="Optional custom image/logo URL or base64 data")
    x: Optional[float] = Field(None, description="Canvas X coordinate")
    y: Optional[float] = Field(None, description="Canvas Y coordinate")
    width: Optional[float] = Field(None, description="Canvas node width")
    height: Optional[float] = Field(None, description="Canvas node height")
    customStyle: Optional[Dict[str, Any]] = Field(None, description="Custom node styling: shape, colors, borders, glow")


class EdgeSpec(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: f"e_{uuid.uuid4().hex[:6]}", description="Unique edge identifier")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    label: Optional[str] = Field(None, max_length=80, description="Condition or data flow label")
    style: Optional[str] = Field("solid", description="solid, dashed, or highlighted")
    customStyle: Optional[Dict[str, Any]] = Field(None, description="Custom line routing, stroke style, width, color, markers")


class ChartDataSpec(BaseModel):
    xAxisKey: str = Field("category", description="Key for the primary x-axis dimension")
    dataKeys: List[str] = Field(default_factory=list, description="Keys for numerical series")
    rows: List[Dict[str, Any]] = Field(default_factory=list, description="List of row objects")
    unit: Optional[str] = Field(None, description="Optional unit label (e.g. %, USD, Units)")


class DiagramSpec(BaseModel):
    version: str = Field("1.0", description="Schema version")
    diagramType: str = Field(..., description="Canonical visual type identifier")
    title: str = Field(..., min_length=1, max_length=160, description="Title for the visual")
    summary: str = Field(..., description="Concise synopsis of the represented information")
    explanation: Optional[str] = Field(None, description="Brief AI explanation for the selected representation")
    theme: str = Field("modern", description="Visual theme palette: modern, vibrant, emerald, slate")
    nodes: List[NodeSpec] = Field(default_factory=list, description="List of visual nodes")
    edges: List[EdgeSpec] = Field(default_factory=list, description="List of directional connectors")
    chartData: Optional[ChartDataSpec] = Field(None, description="Quantitative series if chart format")
    sourceReferences: List[str] = Field(default_factory=list, description="Referenced source citations or sections")
    scopeCoverage: Optional[str] = Field("Whole Project Scope", description="Holistic project lifecycle coverage indicator")
    scopePhases: List[str] = Field(default_factory=list, description="Phases of the project represented in the visual")
    viewMode: Optional[str] = Field("canvas", description="View mode: template or canvas")
    canvasLayout: Optional[str] = Field(None, description="Canvas layout preset: horizontal, vertical, grid, tree, radial, manual")

    @model_validator(mode="after")
    def validate_graph_integrity(self):
        """Sanitizes edges: ensures all sources and targets reference existing node IDs."""
        if self.nodes and self.edges:
            node_ids = {n.id for n in self.nodes}
            valid_edges = []
            for e in self.edges:
                if e.source in node_ids and e.target in node_ids:
                    valid_edges.append(e)
            self.edges = valid_edges
        return self


class AnalyzeRequest(BaseModel):
    prompt: Optional[str] = Field(None, max_length=8000, description="User instruction or topic")
    document_id: Optional[str] = Field(None, description="ID of previously uploaded document")
    raw_text: Optional[str] = Field(None, max_length=30000, description="Raw pasted content")


class RecommendationResponse(BaseModel):
    recommendedType: str
    availableTypes: List[Dict[str, Any]]
    explanation: str
    keyEntities: List[str]
    suggestedTitle: str


class GenerateVisualRequest(BaseModel):
    prompt: Optional[str] = Field(None, max_length=8000, description="User prompt or instructions")
    document_id: Optional[str] = Field(None, description="Document ID if using uploaded document")
    raw_text: Optional[str] = Field(None, max_length=30000, description="Raw input text")
    visual_type: Optional[str] = Field(None, description="Target visual type (overrides AI recommendation)")
    force_fresh: Optional[bool] = Field(False, description="Force fresh bypass cache")


class ExportRequest(BaseModel):
    diagram: DiagramSpec
    format: str = Field("png", pattern="^(png|pdf|svg)$")
    theme: Optional[str] = Field("dark", pattern="^(dark|light)$")
    width: Optional[int] = Field(1200, ge=400, le=4000)
    height: Optional[int] = Field(800, ge=300, le=3000)


class EnhanceNodeRequest(BaseModel):
    node: NodeSpec
    diagram_type: Optional[str] = Field(None, description="Visual diagram type context")
    diagram_title: Optional[str] = Field(None, description="Current diagram title context")


class EnhanceNodeResponse(BaseModel):
    node: NodeSpec
    improvements: List[str] = Field(default_factory=list, description="List of visual and text improvements applied")


class CanvasCopilotRequest(BaseModel):
    diagram: DiagramSpec
    instruction: str = Field(..., min_length=1, max_length=1000, description="Natural language modification instruction")


class CanvasCopilotResponse(BaseModel):
    diagram: DiagramSpec
    explanation: str
    appliedChanges: List[str] = Field(default_factory=list)


class SaveStudioTemplateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field("process_flow", max_length=50)
    diagram: DiagramSpec
    is_public: bool = True


class StudioTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    node_count: int = 0
    diagram: Dict[str, Any]
    is_public: bool = True
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[str] = None


