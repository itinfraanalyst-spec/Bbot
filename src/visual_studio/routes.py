import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Request
from src.auth.dependencies import get_current_user
from src.core.rate_limit import limiter
from src.database.connection import get_connection
from src.visual_studio.schemas import (
    SUPPORTED_VISUAL_TYPES,
    AnalyzeRequest,
    RecommendationResponse,
    GenerateVisualRequest,
    DiagramSpec,
    ExportRequest,
    EnhanceNodeRequest,
    EnhanceNodeResponse,
    CanvasCopilotRequest,
    CanvasCopilotResponse,
    SaveStudioTemplateRequest,
    StudioTemplateResponse,
)
from src.visual_studio.document_adapter import DocumentAdapter
from src.visual_studio.visual_service import VisualStudioService
from src.visual_studio.export_service import ExportService

router = APIRouter(tags=["visual-studio"])

_doc_adapter = DocumentAdapter()
_visual_service = VisualStudioService()
_export_service = ExportService()


@router.get("/types")
def get_supported_types(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns all supported visual representation types and metadata."""
    return {"types": SUPPORTED_VISUAL_TYPES}


@router.post("/upload")
async def upload_document_for_visual(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Uploads and extracts text from a PDF, DOCX, TXT, CSV, or XLSX document
    specifically for visual diagram generation.
    """
    _doc_adapter.validate_file(file)
    content = await file.read()
    extracted_text = _doc_adapter.extract_from_bytes(file.filename, content)

    doc_id = str(uuid.uuid4())
    # Save extracted text to temporary storage so it can be queried by ID
    import os
    from src.config import settings
    temp_dir = os.path.join(settings.DOCUMENTS_DIR, "visual_studio_docs")
    os.makedirs(temp_dir, exist_ok=True)
    with open(os.path.join(temp_dir, f"{doc_id}.txt"), "w", encoding="utf-8") as f:
        f.write(extracted_text)

    # Return summary preview
    preview = extracted_text[:300].strip() + ("..." if len(extracted_text) > 300 else "")
    return {
        "document_id": doc_id,
        "filename": file.filename,
        "char_count": len(extracted_text),
        "preview": preview,
        "status": "ready",
    }


@router.post("/analyze")
def analyze_content_endpoint(
    req: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
) -> RecommendationResponse:
    """
    Analyzes prompt, uploaded document, or raw text and returns the AI-recommended visual type.
    """
    doc_text = None
    if req.document_id:
        import os
        from src.config import settings
        temp_path = os.path.join(settings.DOCUMENTS_DIR, "visual_studio_docs", f"{req.document_id}.txt")
        if os.path.exists(temp_path):
            with open(temp_path, "r", encoding="utf-8") as f:
                doc_text = f.read()
        else:
            # Try existing main document repository
            doc_text = _doc_adapter.extract_from_existing_doc(req.document_id)

    source_text, bounded_prompt = _doc_adapter.prepare_content_for_llm(
        raw_text=req.raw_text,
        doc_text=doc_text,
        prompt=req.prompt,
    )

    recommendation = _visual_service.analyze_content(
        source_text=source_text,
        user_prompt=bounded_prompt,
    )
    return recommendation


@router.post("/draft")
def draft_visual_endpoint(
    req: GenerateVisualRequest,
    current_user: dict = Depends(get_current_user),
) -> DiagramSpec:
    """
    Returns an instantaneous (<10ms) heuristic visual draft covering the full document scope,
    enabling zero-latency optimistic rendering on the frontend canvas.
    """
    doc_text = None
    if req.document_id:
        import os
        from src.config import settings
        temp_path = os.path.join(settings.DOCUMENTS_DIR, "visual_studio_docs", f"{req.document_id}.txt")
        if os.path.exists(temp_path):
            with open(temp_path, "r", encoding="utf-8") as f:
                doc_text = f.read()
        else:
            doc_text = _doc_adapter.extract_from_existing_doc(req.document_id)

    source_text, bounded_prompt = _doc_adapter.prepare_content_for_llm(
        raw_text=req.raw_text,
        doc_text=doc_text,
        prompt=req.prompt,
    )

    return _visual_service.get_instant_draft(
        source_text=source_text,
        visual_type=req.visual_type,
        user_prompt=bounded_prompt,
    )


@router.post("/generate")
def generate_visual_endpoint(
    req: GenerateVisualRequest,
    current_user: dict = Depends(get_current_user),
) -> DiagramSpec:
    """
    Generates a structured, editable DiagramSpec based on source material and requested visual type.
    """
    doc_text = None
    if req.document_id:
        import os
        from src.config import settings
        temp_path = os.path.join(settings.DOCUMENTS_DIR, "visual_studio_docs", f"{req.document_id}.txt")
        if os.path.exists(temp_path):
            with open(temp_path, "r", encoding="utf-8") as f:
                doc_text = f.read()
        else:
            doc_text = _doc_adapter.extract_from_existing_doc(req.document_id)

    source_text, bounded_prompt = _doc_adapter.prepare_content_for_llm(
        raw_text=req.raw_text,
        doc_text=doc_text,
        prompt=req.prompt,
    )

    diagram_spec = _visual_service.generate_diagram(
        source_text=source_text,
        visual_type=req.visual_type,
        user_prompt=bounded_prompt,
        force_fresh=bool(req.force_fresh),
    )
    return diagram_spec


@router.post("/export")
def export_visual_endpoint(
    req: ExportRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Exports a DiagramSpec into a downloadable PNG, PDF, or SVG document.
    """
    file_bytes, media_type = _export_service.export_diagram(
        diagram=req.diagram,
        export_format=req.format,
        theme=req.theme or "dark",
        width=req.width or 1200,
        height=req.height or 800,
    )

    filename = f"diagram_{req.diagram.diagramType}_{uuid.uuid4().hex[:6]}.{req.format}"
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export-image-to-pdf")
async def export_image_to_pdf_endpoint(
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Directly converts a high-resolution PNG image captured client-side into a vector PDF wrapper,
    guaranteeing 100% pixel-perfect visual fidelity identical to the user screen.
    """
    body = await req.json()
    image_data_uri = body.get("image_data_uri", "")
    if not image_data_uri:
        raise HTTPException(status_code=400, detail="Missing image_data_uri")
    if "," in image_data_uri:
        image_data_uri = image_data_uri.split(",", 1)[1]
    import base64
    import fitz
    try:
        img_bytes = base64.b64decode(image_data_uri)
        img_doc = fitz.open("png", img_bytes)
        pdf_bytes = img_doc.convert_to_pdf()
        filename = f"diagram_{uuid.uuid4().hex[:6]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to convert image to PDF: {str(e)}")


@router.post("/enhance-node")
def enhance_node_endpoint(
    req: EnhanceNodeRequest,
    current_user: dict = Depends(get_current_user),
) -> EnhanceNodeResponse:
    """
    Applies executive AI polish to a node card: sharpens titles, enriches operational
    criteria/SLAs, auto-detects semantic icons, and assigns badges.
    """
    return _visual_service.enhance_node(
        node=req.node,
        diagram_type=req.diagram_type,
        diagram_title=req.diagram_title,
    )


@router.post("/canvas-copilot")
def canvas_copilot_endpoint(
    req: CanvasCopilotRequest,
    current_user: dict = Depends(get_current_user),
) -> CanvasCopilotResponse:
    """
    Executes conversational modifications, expansions, and restyling on an existing DiagramSpec.
    """
    return _visual_service.apply_canvas_copilot(
        diagram=req.diagram,
        instruction=req.instruction,
    )


def sanitize_diagram_design(diagram_dict: Dict[str, Any], template_name: str = "") -> Dict[str, Any]:
    """
    Sanitizes private/proprietary data from a diagram blueprint so other workspace users
    receive only the visual layout, geometry, styles, colors, and structure without
    exposing proprietary business text, customer data, or internal labels.
    """
    if not isinstance(diagram_dict, dict):
        return {}

    sanitized = json.loads(json.dumps(diagram_dict))
    sanitized["title"] = template_name or sanitized.get("title") or "Custom Process Blueprint"
    sanitized["summary"] = "Custom visual blueprint. Layout and styling preserved."

    nodes = sanitized.get("nodes", [])
    if isinstance(nodes, list):
        for idx, node in enumerate(nodes, start=1):
            if not isinstance(node, dict):
                continue
            node_type = str(node.get("type") or "process").lower()
            if "decision" in node_type or "gateway" in node_type:
                node["label"] = f"Decision Gateway {idx}"
                node["sublabel"] = "Configure condition / branch logic"
            elif "start" in node_type:
                node["label"] = f"Initial Stage {idx}"
                node["sublabel"] = "Entry point or trigger"
            elif "end" in node_type:
                node["label"] = f"Terminal State {idx}"
                node["sublabel"] = "Outcome / completed milestone"
            elif "store" in node_type or "db" in node_type or "data" in node_type:
                node["label"] = f"Data Sink / Store {idx}"
                node["sublabel"] = "Repository or event sink"
            else:
                node["label"] = f"Phase {idx}: Step"
                node["sublabel"] = "Operational step or task details"

    edges = sanitized.get("edges", [])
    if isinstance(edges, list):
        for idx, edge in enumerate(edges, start=1):
            if not isinstance(edge, dict):
                continue
            lbl = edge.get("label")
            # If label was yes/no or standard condition keep it, else generic step connector
            if lbl and str(lbl).strip().lower() in ["yes", "no", "true", "false", "pass", "fail", "success", "error"]:
                edge["label"] = str(lbl).capitalize()
            elif lbl:
                edge["label"] = "Next"

    return sanitized


@router.get("/templates", response_model=List[StudioTemplateResponse])
def get_studio_templates(current_user: dict = Depends(get_current_user)) -> List[StudioTemplateResponse]:
    """
    Returns public templates and templates created by the current user.
    When a user accesses a template created by someone else, private data is sanitized
    so only the visual design, layout, shapes, and styles are shared.
    """
    user_id = str(current_user.get("id", ""))
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, name, description, category, diagram_data, node_count, is_public,
                   created_by, created_by_name, created_at
            FROM studio_templates
            WHERE is_public = 1 OR created_by = ?
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        rows = cursor.fetchall()
        
    results = []
    for row in rows:
        try:
            diag = json.loads(row["diagram_data"]) if row["diagram_data"] else {}
        except Exception:
            diag = {}

        # If current user is NOT the creator of this template, sanitize private data
        creator_id = str(row["created_by"] or "")
        if creator_id != user_id and bool(row["is_public"]):
            diag = sanitize_diagram_design(diag, template_name=row["name"])

        results.append(
            StudioTemplateResponse(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                category=row["category"],
                node_count=row["node_count"] or 0,
                diagram=diag,
                is_public=bool(row["is_public"]),
                created_by=row["created_by"],
                created_by_name=row["created_by_name"],
                created_at=str(row["created_at"]) if row["created_at"] else None,
            )
        )
    return results


@router.post("/templates", response_model=StudioTemplateResponse)
def save_studio_template(
    req: SaveStudioTemplateRequest,
    current_user: dict = Depends(get_current_user),
) -> StudioTemplateResponse:
    """
    Saves a custom canvas diagram as a template for personal or workspace-wide team use.
    """
    user_id = str(current_user.get("id", ""))
    username = current_user.get("username") or current_user.get("email") or "Workspace Colleague"
    template_id = f"tpl_{uuid.uuid4().hex[:10]}"
    
    diagram_dict = req.diagram.model_dump() if hasattr(req.diagram, "model_dump") else req.diagram.dict()
    node_count = len(req.diagram.nodes) if req.diagram.nodes else 0
    diagram_json = json.dumps(diagram_dict)
    
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO studio_templates (
                id, name, description, category, diagram_data, node_count,
                is_public, created_by, created_by_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                template_id,
                req.name.strip(),
                req.description.strip() if req.description else None,
                req.category or "process_flow",
                diagram_json,
                node_count,
                1 if req.is_public else 0,
                user_id,
                username,
                now_iso,
                now_iso,
            )
        )
        conn.commit()
        
    return StudioTemplateResponse(
        id=template_id,
        name=req.name.strip(),
        description=req.description.strip() if req.description else None,
        category=req.category or "process_flow",
        node_count=node_count,
        diagram=diagram_dict,
        is_public=req.is_public,
        created_by=user_id,
        created_by_name=username,
        created_at=now_iso,
    )


@router.delete("/templates/{template_id}")
def delete_studio_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Deletes a template if the user created it or is an admin.
    """
    user_id = str(current_user.get("id", ""))
    is_admin = bool(current_user.get("is_admin", False))
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, created_by FROM studio_templates WHERE id = ?", (template_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
            
        if row["created_by"] != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this template")
            
        cursor.execute("DELETE FROM studio_templates WHERE id = ?", (template_id,))
        conn.commit()
        
    return {"success": True, "message": f"Template {template_id} deleted successfully"}



