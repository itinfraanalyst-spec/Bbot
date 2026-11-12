import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from src.auth.dependencies import get_current_user
from src.database.document_repository import DocumentRepository
from src.cross_reference.schemas import (
    CrossReferenceRequest,
    CrossReferenceResponse,
    CrossDocQueryRequest,
    CrossDocQueryResponse,
    CrossDocExportRequest,
    UploadDocResponse,
    DocumentUnderstanding,
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


@router.post("/upload", response_model=UploadDocResponse)
async def upload_direct_document(
    file: UploadFile = File(...),
    slot: str = Form("doc_a"),
    current_user: dict = Depends(get_current_user),
) -> UploadDocResponse:
    """
    Direct upload for cross-referencing portal.
    Supports virtually ANY file type: PDF, DOCX, XLSX, CSV, TXT, MD, PPTX, JSON, etc.
    Extracts text immediately, saves to document repository, and produces an instant
    Document Understanding breakdown.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    max_mb = 35
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {max_mb}MB.")

    user_id = current_user.get("id")
    try:
        doc_meta, understanding = _service.create_and_ingest_document(
            filename=file.filename,
            content=content,
            user_id=user_id,
            slot=slot,
        )
        return UploadDocResponse(
            doc_id=doc_meta["id"],
            filename=doc_meta["filename"],
            size=doc_meta["size"],
            page_count=doc_meta["page_count"],
            slot=slot,
            understanding=understanding,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")


@router.get("/document/{doc_id}/understanding", response_model=DocumentUnderstanding)
def get_document_understanding(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
) -> DocumentUnderstanding:
    """
    Retrieves or generates single-document deep comprehension (what this document is about,
    purpose, target audience, key takeaways, and entities).
    """
    doc_meta, text, chunks = _service._get_document_text(doc_id)
    if not text or text == "No text content available for this document.":
        raise HTTPException(status_code=404, detail="Document text not found or empty.")

    filename = doc_meta.get("filename", f"Doc {doc_id[:6]}")
    page_count = doc_meta.get("page_count", 1)
    understanding = _service.generate_document_understanding(doc_id, filename, text, page_count)
    return understanding


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
            headers={"Content-Disposition": f'attachment; filename="cross_reference_{data.doc_a.get("id")[:6]}_{data.doc_b.get("id")[:6]}.json"'},
        )

    # Markdown Audit Report
    md_lines = [
        f"# Cross-Document Intelligence & Reference Audit",
        f"**Document A:** {filename_a} ({data.understanding_a.document_type if data.understanding_a else 'Doc A'})  ",
        f"**Document B:** {filename_b} ({data.understanding_b.document_type if data.understanding_b else 'Doc B'})  ",
        f"**Overall Alignment Score:** {data.summary.alignment_score}%  ",
        "",
        "## Executive Summary",
        data.summary.executive_summary,
        "",
        "## Document Understanding & Profiles",
    ]

    if data.understanding_a:
        md_lines.extend([
            f"### Document A: {filename_a}",
            f"- **Type:** {data.understanding_a.document_type}",
            f"- **Purpose:** {data.understanding_a.core_purpose}",
            f"- **Summary:** {data.understanding_a.executive_summary}",
            "- **Key Takeaways:**",
        ])
        for t in data.understanding_a.key_takeaways:
            md_lines.append(f"  * {t}")
        md_lines.append("")

    if data.understanding_b:
        md_lines.extend([
            f"### Document B: {filename_b}",
            f"- **Type:** {data.understanding_b.document_type}",
            f"- **Purpose:** {data.understanding_b.core_purpose}",
            f"- **Summary:** {data.understanding_b.executive_summary}",
            "- **Key Takeaways:**",
        ])
        for t in data.understanding_b.key_takeaways:
            md_lines.append(f"  * {t}")
        md_lines.append("")

    if data.comparison_matrix:
        md_lines.extend([
            "## Topic-by-Topic Comparison Matrix",
            f"| Topic | {filename_a} Stance | {filename_b} Stance | Status | Verdict |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ])
        for m in data.comparison_matrix:
            md_lines.append(
                f"| {m.topic} | {m.doc_a_stance[:80]} | {m.doc_b_stance[:80]} | {m.status.upper()} | {m.verdict} |"
            )
        md_lines.append("")

    md_lines.extend([
        "## Key Discrepancies & Operational Conflicts",
    ])

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
