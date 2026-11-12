import os
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Response
from src.auth.dependencies import get_current_user
from src.database.document_repository import DocumentRepository
from src.cross_reference.schemas import (
    CrossReferenceRequest,
    CrossReferenceResponse,
    CrossDocQueryRequest,
    CrossDocQueryResponse,
    CrossDocExportRequest,
)
from src.cross_reference.service import CrossReferenceService

router = APIRouter(tags=["cross-reference"])

_service = CrossReferenceService()
_doc_repo = DocumentRepository()


@router.get("/documents")
def get_available_documents(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns list of processed documents available to the user for cross-referencing.
    """
    user_id = None if current_user.get("is_admin") else current_user.get("id")
    docs = _doc_repo.list_documents(user_id=user_id)
    
    # Filter only usable documents
    filtered = [
        {
            "id": d["id"],
            "filename": d["filename"],
            "size": d["size"],
            "page_count": d.get("page_count", 1),
            "status": d.get("status", "READY"),
            "created_at": d.get("created_at"),
            "summary": d.get("summary"),
        }
        for d in docs
        if d.get("status") in ("READY", "processed", "PROCESSED_NO_RAG", "PROCESSING")
    ]
    return {"documents": filtered}


@router.post("/analyze", response_model=CrossReferenceResponse)
def analyze_cross_reference(
    req: CrossReferenceRequest,
    current_user: dict = Depends(get_current_user),
) -> CrossReferenceResponse:
    """
    Analyzes cross-referencing, linkages, and conflicts between Document A and Document B.
    """
    if req.doc_a_id == req.doc_b_id:
        raise HTTPException(status_code=400, detail="Please select two distinct documents to compare and cross-reference.")

    try:
        result = _service.analyze_cross_reference(
            doc_a_id=req.doc_a_id,
            doc_b_id=req.doc_b_id,
            mode=req.mode,
            focus_query=req.focus_query,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cross-referencing analysis failed: {str(e)}")


@router.post("/query", response_model=CrossDocQueryResponse)
def query_cross_reference(
    req: CrossDocQueryRequest,
    current_user: dict = Depends(get_current_user),
) -> CrossDocQueryResponse:
    """
    Asks targeted comparative questions contrasting Document A and Document B.
    """
    try:
        return _service.query_cross_docs(
            doc_a_id=req.doc_a_id,
            doc_b_id=req.doc_b_id,
            question=req.question,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cross-document query failed: {str(e)}")


@router.post("/export")
def export_cross_reference(
    req: CrossDocExportRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Exports cross-reference audit report as Markdown or JSON.
    """
    data = req.data
    filename_a = data.doc_a.get("filename", "Document A")
    filename_b = data.doc_b.get("filename", "Document B")

    if req.format == "json":
        return Response(
            content=data.model_dump_json(indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="cross_reference_{data.doc_a.get("id")}_{data.doc_b.get("id")}.json"'},
        )

    # Markdown Audit Report
    md_lines = [
        f"# Cross-Document Intelligence & Reference Audit",
        f"**Document A:** {filename_a}  ",
        f"**Document B:** {filename_b}  ",
        f"**Overall Alignment Score:** {data.summary.alignment_score}%  ",
        "",
        "## Executive Summary",
        data.summary.executive_summary,
        "",
        "## Key Discrepancies & Operational Conflicts",
    ]

    if not data.discrepancies:
        md_lines.append("*No critical discrepancies identified between the two documents.*")
    else:
        for idx, d in enumerate(data.discrepancies, 1):
            md_lines.extend([
                f"### {idx}. [{d.severity.upper()}] {d.topic}",
                f"- **{filename_a} Clause:** {d.doc_a_clause}",
                f"- **{filename_b} Clause:** {d.doc_b_clause}",
                f"- **Risk & Conflict Detail:** {d.conflict_detail}",
                f"- **Suggested Action:** {d.suggested_action}",
                "",
            ])

    md_lines.extend([
        "## Traceability & Clause Cross-Reference Matrix",
        f"| {filename_a} Section | {filename_b} Section | Relationship | Confidence | Summary |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ])

    sec_map_a = {s.id: s.heading for s in data.sections_a}
    sec_map_b = {s.id: s.heading for s in data.sections_b}

    for link in data.links:
        head_a = sec_map_a.get(link.source_section_id, "Section in A")
        head_b = sec_map_b.get(link.target_section_id, "Section in B")
        md_lines.append(
            f"| {head_a} | {head_b} | {link.relation.upper()} | {int(link.confidence * 100)}% | {link.summary} |"
        )

    md_lines.extend([
        "",
        "## Key Strategic Recommendations",
    ])
    for r in data.summary.key_recommendations:
        md_lines.append(f"- {r}")

    content = "\n".join(md_lines)
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="cross_reference_audit_{data.doc_a.get("id")[:6]}_{data.doc_b.get("id")[:6]}.md"'},
    )
