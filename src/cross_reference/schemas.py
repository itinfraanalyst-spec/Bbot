import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


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
    sections_a: List[DocumentSection]
    sections_b: List[DocumentSection]
    links: List[CrossReferenceLink]
    discrepancies: List[DiscrepancyItem]
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
