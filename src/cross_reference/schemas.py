import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DocumentUnderstanding(BaseModel):
    doc_id: str
    filename: str
    document_type: str = Field(default="General Document", description="Document category/type")
    executive_summary: str = Field(default="", description="Comprehensive explanatory narrative of the document")
    core_purpose: str = Field(default="", description="Primary purpose and business/legal rationale")
    target_audience: str = Field(default="", description="Intended audience, stakeholders and departments")
    key_takeaways: List[str] = Field(default_factory=list, description="Explanatory points of crucial rules and standards")
    key_entities_or_roles: List[str] = Field(default_factory=list, description="Key roles or entities mentioned")
    topics_covered: List[str] = Field(default_factory=list, description="Key topics covered in document")
    detailed_explanation: str = Field(default="", description="In-depth operational breakdown explaining how the policy/document functions in practice")
    scope_and_applicability: str = Field(default="", description="Scope, boundaries, and exceptions")
    word_count: int = 0
    page_count: int = 1


class TopicComparisonItem(BaseModel):
    id: str = Field(default_factory=lambda: f"topic-{uuid.uuid4().hex[:8]}")
    topic: str
    doc_a_stance: str
    doc_b_stance: str
    status: str = Field(default="aligned", description="aligned | conflict | doc_a_only | doc_b_only | stricter | supersedes")
    verdict: str
    practical_implication: Optional[str] = Field(default="", description="Explanatory consequence and operational impact")
    guidance: Optional[str] = Field(default="", description="Actionable recommendation on precedence or compliance")


class CrossReferenceRequest(BaseModel):
    doc_a_id: str
    doc_b_id: str
    mode: str = Field(default="audit", description="audit | traceability | diff")
    focus_query: Optional[str] = None


class DocumentSection(BaseModel):
    id: str = Field(default_factory=lambda: f"sec-{uuid.uuid4().hex[:8]}")
    doc_id: str
    doc_title: str
    heading: str
    content: str
    summary: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    matched_section_id: Optional[str] = None
    matched_heading: Optional[str] = None
    alignment_status: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    chunk_index: int = 0


class CrossReferenceLink(BaseModel):
    id: str = Field(default_factory=lambda: f"link-{uuid.uuid4().hex[:8]}")
    source_section_id: str
    target_section_id: str
    relation: str = Field(
        default="aligned",
        description="aligned | contradiction | reference | gap | supersedes",
    )
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    summary: str
    source_quote: str = ""
    target_quote: str = ""
    recommendation: Optional[str] = None


class DiscrepancyItem(BaseModel):
    id: str = Field(default_factory=lambda: f"disc-{uuid.uuid4().hex[:8]}")
    topic: str
    severity: str = Field(default="medium", description="high | medium | low | info")
    doc_a_clause: str
    doc_b_clause: str
    conflict_detail: str
    suggested_action: str
    harmonized_clause: Optional[str] = None


class CrossDocSummary(BaseModel):
    alignment_score: int = Field(default=85, ge=0, le=100)
    total_links: int = 0
    agreed_count: int = 0
    conflict_count: int = 0
    reference_count: int = 0
    gap_count: int = 0
    executive_summary: str = ""
    key_risks: List[str] = Field(default_factory=list)
    key_recommendations: List[str] = Field(default_factory=list)


class CrossReferenceResponse(BaseModel):
    doc_a: Dict[str, Any]
    doc_b: Dict[str, Any]
    understanding_a: Optional[DocumentUnderstanding] = None
    understanding_b: Optional[DocumentUnderstanding] = None
    sections_a: List[DocumentSection]
    sections_b: List[DocumentSection]
    links: List[CrossReferenceLink]
    discrepancies: List[DiscrepancyItem]
    comparison_matrix: List[TopicComparisonItem] = Field(default_factory=list)
    summary: CrossDocSummary


class CrossDocQueryRequest(BaseModel):
    doc_a_id: str
    doc_b_id: str
    question: str
    history: Optional[List[Dict[str, str]]] = None


class CrossDocQueryResponse(BaseModel):
    answer: str
    sources_a: List[str] = Field(default_factory=list)
    sources_b: List[str] = Field(default_factory=list)
    comparison_verdict: Optional[str] = None


class CrossDocExportRequest(BaseModel):
    format: str = "markdown"  # markdown | json | pdf
    data: CrossReferenceResponse


class UploadDocResponse(BaseModel):
    doc_id: str
    filename: str
    size: int
    page_count: int
    slot: str = "doc_a"
    understanding: DocumentUnderstanding


class HarmonizeClauseRequest(BaseModel):
    topic: str
    doc_a_clause: str
    doc_b_clause: str
    conflict_detail: str
    doc_a_name: Optional[str] = "Document 1"
    doc_b_name: Optional[str] = "Document 2"


class HarmonizeClauseResponse(BaseModel):
    harmonized_clause: str
    rationale: str
    suggested_revision_type: str = "compromise"
