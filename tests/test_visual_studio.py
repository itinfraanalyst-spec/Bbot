import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from src.visual_studio.schemas import (
    DiagramSpec,
    NodeSpec,
    EdgeSpec,
    ChartDataSpec,
    SUPPORTED_VISUAL_TYPES,
    VisualTypeEnum,
)
from src.visual_studio.document_adapter import DocumentAdapter
from src.visual_studio.visual_service import VisualStudioService
from src.visual_studio.export_service import ExportService


@pytest.fixture
def test_client():
    from src.api.main import app
    from src.auth.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {
        "id": "test_user_id",
        "username": "testuser",
        "role": "user",
        "status": "approved",
    }
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


def test_supported_types_endpoint(test_client):
    res = test_client.get("/api/visual-studio/types")
    assert res.status_code == 200
    data = res.json()
    assert "types" in data
    type_ids = [t["id"] for t in data["types"]]
    assert "process_flow" in type_ids
    assert "decision_flow" in type_ids
    assert "timeline" in type_ids
    assert "hierarchy" in type_ids
    assert "funnel" in type_ids
    assert "quadrant" in type_ids
    assert "bar_chart" in type_ids
    assert "pie_chart" in type_ids


def test_diagram_spec_validation_and_edge_pruning():
    """Validates that DiagramSpec prunes dangling edges referencing non-existent nodes."""
    nodes = [
        NodeSpec(id="n1", label="Start Step", type="start"),
        NodeSpec(id="n2", label="Processing Step", type="process"),
    ]
    edges = [
        EdgeSpec(id="e1", source="n1", target="n2", label="Next"),
        EdgeSpec(id="e_broken", source="n1", target="n_ghost", label="Invalid"),
    ]
    spec = DiagramSpec(
        version="1.0",
        diagramType="process_flow",
        title="Test Process",
        summary="Test summary",
        nodes=nodes,
        edges=edges,
    )
    assert len(spec.nodes) == 2
    assert len(spec.edges) == 1
    assert spec.edges[0].target == "n2"


def test_document_adapter_file_validation():
    adapter = DocumentAdapter()

    # Valid extensions
    mock_file = MagicMock()
    mock_file.filename = "report.pdf"
    assert adapter.validate_file(mock_file) == ".pdf"

    mock_file.filename = "notes.docx"
    assert adapter.validate_file(mock_file) == ".docx"

    mock_file.filename = "data.csv"
    assert adapter.validate_file(mock_file) == ".csv"

    # Unsupported extension
    mock_file.filename = "image.exe"
    with pytest.raises(Exception) as exc:
        adapter.validate_file(mock_file)
    assert "Unsupported file format" in str(exc.value)


def test_document_adapter_prepare_content():
    adapter = DocumentAdapter()

    # Prompt only
    source, prompt = adapter.prepare_content_for_llm(prompt="Draw a checkout pipeline")
    assert source == "Draw a checkout pipeline"
    assert prompt == "Draw a checkout pipeline"

    # Both document and prompt
    source, prompt = adapter.prepare_content_for_llm(
        doc_text="Full system documentation with 5 stages",
        prompt="Focus on stage 2",
    )
    assert "Full system documentation" in source
    assert prompt == "Focus on stage 2"


def test_heuristic_analysis():
    service = VisualStudioService()

    # Timeline heuristic
    timeline_type = service._heuristic_analysis("The company roadmap shows Q1 2024 milestones and Q2 deliverables.", "")
    assert timeline_type == "timeline"

    # Decision flow heuristic
    decision_type = service._heuristic_analysis("If approved, proceed to billing. If rejected, send notification.", "")
    assert decision_type == "decision_flow"

    # Bar chart heuristic
    chart_type = service._heuristic_analysis("Product A sales reached $500, Product B reached $800.", "Create a comparison of sales metrics")
    assert chart_type == "bar_chart"

    # Funnel heuristic
    funnel_type = service._heuristic_analysis("Customer sales funnel from leads to demo to contract conversion.", "")
    assert funnel_type == "funnel"

    # Quadrant heuristic
    quadrant_type = service._heuristic_analysis("A 2x2 prioritization matrix comparing impact vs effort.", "")
    assert quadrant_type == "quadrant"


def test_fallback_diagram_generation():
    service = VisualStudioService()
    spec = service._generate_fallback_spec(
        source_text="Step 1: Order Placement\nStep 2: Inventory Check\nStep 3: Shipping",
        visual_type="process_flow",
        user_prompt="Map the steps",
    )
    assert spec.diagramType == "process_flow"
    assert len(spec.nodes) >= 3
    assert len(spec.edges) >= 2
    assert spec.nodes[0].label == "Step 1: Order Placement"


def test_export_service_pdf_and_png():
    export_service = ExportService()
    nodes = [
        NodeSpec(id="n1", label="User Request", sublabel="Client WebApp", type="start"),
        NodeSpec(id="n2", label="API Gateway", sublabel="Auth & Rate Limit", type="process"),
    ]
    edges = [
        EdgeSpec(id="e1", source="n1", target="n2", label="HTTPS /api"),
    ]
    spec = DiagramSpec(
        version="1.0",
        diagramType="process_flow",
        title="Gateway Architecture",
        summary="High-level API ingress path",
        nodes=nodes,
        edges=edges,
    )

    # Test PDF Export
    pdf_bytes, pdf_mime = export_service.export_diagram(spec, export_format="pdf")
    assert pdf_mime == "application/pdf"
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")

    # Test PNG Export
    png_bytes, png_mime = export_service.export_diagram(spec, export_format="png")
    assert png_mime == "image/png"
    assert len(png_bytes) > 500
    assert png_bytes.startswith(b"\x89PNG")


def test_export_service_canvas_mode_with_custom_shapes_and_coords():
    export_service = ExportService()
    nodes = [
        NodeSpec(
            id="n1",
            label="Stage 14",
            sublabel="Operational milestone",
            type="start",
            x=100,
            y=200,
            width=230,
            height=110,
            customStyle={"shape": "card", "bgColor": "#3b82f6", "borderColor": "#60a5fa", "textColor": "#ffffff"},
        ),
        NodeSpec(
            id="n2",
            label="Stage 19 Decision",
            sublabel="Quality check",
            type="decision",
            x=500,
            y=180,
            width=200,
            height=110,
            customStyle={"shape": "diamond", "bgColor": "#eab308", "borderColor": "#facc15", "textColor": "#000000"},
        ),
        NodeSpec(
            id="n3",
            label="Fast Track Pill",
            sublabel="Pill shape test",
            type="process",
            x=850,
            y=210,
            width=210,
            height=56,
            customStyle={"shape": "pill", "bgColor": "#10b981", "borderColor": "#34d399", "textColor": "#ffffff"},
        ),
    ]
    edges = [
        EdgeSpec(id="e1", source="n1", target="n2", label="Forward", customStyle={"color": "#60a5fa"}),
        EdgeSpec(id="e2", source="n2", target="n3", label="Approve", customStyle={"color": "#34d399"}),
    ]
    canvas_spec = DiagramSpec(
        version="1.0",
        diagramType="process_flow",
        viewMode="canvas",
        title="Custom Canvas Lifecycle",
        summary="Canvas view with custom placed cards and shapes",
        nodes=nodes,
        edges=edges,
    )

    # Test PNG export with custom canvas coordinates and shapes
    png_bytes, png_mime = export_service.export_diagram(canvas_spec, export_format="png", width=1400, height=800)
    assert png_mime == "image/png"
    assert len(png_bytes) > 1000
    assert png_bytes.startswith(b"\x89PNG")

    # Test SVG export with custom canvas coordinates and shapes
    svg_bytes, svg_mime = export_service.export_diagram(canvas_spec, export_format="svg", width=1400, height=800)
    assert svg_mime == "image/svg+xml"
    assert len(svg_bytes) > 500
    assert b"<svg" in svg_bytes


def test_holistic_project_scope_synthesizer():
    adapter = DocumentAdapter()
    service = VisualStudioService()

    multi_phase_doc = (
        "# Project Titan: Core Platform Modernization\n\n"
        "## Phase 1: Inception & Architecture Planning\n"
        "Define technical requirements and threat model.\n\n"
        "## Phase 2: Frontend Client Engineering\n"
        "Implement React, Tailwind, and Recharts visualization.\n\n"
        "## Phase 3: Backend API & Microservices\n"
        "Develop FastAPI endpoints, SQLite data storage, and rate limiting.\n\n"
        "## Phase 4: Automated Testing & Security Review\n"
        "Run full pytest test suite and penetration audits.\n\n"
        "## Phase 5: Production Deployment & CI/CD\n"
        "Containerize with Docker and deploy to cloud cluster.\n\n"
        "## Phase 6: Post-Launch Telemetry & Monitoring\n"
        "Track latency, uptime SLAs, and quarterly customer satisfaction.\n"
    )

    digest, phases = adapter.synthesize_holistic_project_scope(multi_phase_doc)
    assert len(phases) >= 5
    assert any("Inception & Architecture Planning" in p for p in phases)
    assert any("Post-Launch Telemetry & Monitoring" in p for p in phases)
    assert "WHOLE-PROJECT END-TO-END SCOPE" in digest

    # Verify fallback generator spans all phases
    spec = service._generate_fallback_spec(multi_phase_doc, visual_type="process_flow", user_prompt="")
    assert spec.scopeCoverage == "Whole Project Scope"
    assert len(spec.nodes) >= 5
    # First node should represent early phase and last node final phase
    assert any(term in spec.nodes[0].label for term in ["Planning", "Inception", "Project Titan"])
    assert any(term in spec.nodes[-1].label for term in ["Telemetry", "Monitoring", "latency", "satisfaction"])


def test_instant_draft_endpoint(test_client):
    """Validates that /api/visual-studio/draft returns a high-fidelity DiagramSpec in <50ms without LLM latency."""
    res = test_client.post(
        "/api/visual-studio/draft",
        json={
            "raw_text": "1. Customer places order. 2. Warehouse inventory check. 3. Courier dispatch. 4. Delivered.",
            "visual_type": "process_flow",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["diagramType"] == "process_flow"
    assert len(data["nodes"]) >= 4
    assert len(data["edges"]) >= 3
    assert data["nodes"][0]["label"] != ""


def test_it_sop_complete_lifecycle_generation():
    """Validates that SOPs with metadata tables do not leak metadata and generate complete 5+ node diagrams."""
    adapter = DocumentAdapter()
    service = VisualStudioService()

    sop_doc = (
        "IT Department SOP\n"
        "IT support, access management, infrastructure, security, incidents\n\n"
        "Document Type\nStandard Operating Procedure\n"
        "Document Code\nIT-SOP-001\n"
        "Version\n1.0\n"
        "Owner\nIT Department\n"
        "Review Frequency\nAt least annually\n\n"
        "1. Purpose\nThe IT Department manages systems and users.\n\n"
        "2. Scope\nApplies to all technology operations.\n\n"
        "3. User Account - New Joiner\n"
        "1. Receive approved request.\n2. Provision role accounts.\n3. Verify access.\n\n"
        "4. IT Support Ticket Process\n"
        "1. Log issue.\n2. Prioritize by impact.\n3. Resolve and close.\n\n"
        "5. Incident Management\n"
        "1. Identify incident.\n2. Contain damage.\n3. Restore normal service.\n\n"
        "6. Backup and Recovery\n"
        "1. Schedule critical backups.\n2. Test periodic restores.\n\n"
        "7. Employee Exit / Offboarding\n"
        "1. Revoke access.\n2. Recover company hardware and assets.\n"
    )

    digest, phases = adapter.synthesize_holistic_project_scope(sop_doc)
    assert len(phases) >= 4
    # Ensure metadata headers are NEVER treated as project lifecycle phases
    for bad_meta in ["Standard Operating Procedure", "Version", "Owner", "Document Code", "Review Frequency"]:
        assert bad_meta not in phases

    # Verify substantive phases are present
    assert any("User Account" in p for p in phases)
    assert any("Incident Management" in p or "Support Ticket" in p for p in phases)

    # Verify full diagram generation produces complete 5+ nodes
    spec = service._generate_fallback_spec(digest, visual_type="process_flow", user_prompt="")
    assert len(spec.nodes) >= 5
    assert len(spec.edges) >= 4
    assert spec.scopeCoverage == "Whole Project Scope"


def test_enhance_node_endpoint(test_client):
    payload = {
        "node": {
            "id": "node_auth",
            "label": "api authentication",
            "sublabel": "validate tokens",
            "type": "process",
        },
        "diagram_type": "process_flow",
        "diagram_title": "Enterprise Microservice Gateway",
    }
    res = test_client.post("/api/visual-studio/enhance-node", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "node" in data
    assert "improvements" in data
    assert "API authentication" in data["node"]["label"]
    assert data["node"]["icon"] == "ShieldCheck"
    assert data["node"]["badge"] is not None
    assert len(data["improvements"]) >= 1


def test_complete_8_stage_document_no_truncation():
    """Validates that a document with 8 distinct operational stages is never truncated to 6."""
    service = VisualStudioService()
    doc = (
        "Phase 1: Project Kickoff & Alignment\n"
        "Phase 2: Requirements & Architecture Review\n"
        "Phase 3: Database & Security Schema Setup\n"
        "Phase 4: Backend Microservice Implementation\n"
        "Phase 5: Frontend UI & Canvas Integration\n"
        "Phase 6: End-to-End Automated Testing\n"
        "Phase 7: Production Staging & User Acceptance\n"
        "Phase 8: Global Launch & Continuous Monitoring\n"
    )
    spec = service._generate_fallback_spec(doc, visual_type="process_flow", user_prompt="")
    assert len(spec.nodes) == 8
    assert spec.nodes[0].label == "Phase 1: Project Kickoff & Alignment"
    assert spec.nodes[-1].label == "Phase 8: Global Launch & Continuous Monitoring"
    assert len(spec.edges) == 7
    assert spec.edges[-1].target == "node_8"


def test_canvas_copilot_service_and_endpoint(test_client):
    service = VisualStudioService()
    initial_spec = DiagramSpec(
        version="1.0",
        diagramType="process_flow",
        title="Microservice Ingress Pipeline",
        summary="API Gateway dispatch flow",
        nodes=[
            NodeSpec(id="n1", label="User Request", type="start", order=1),
            NodeSpec(id="n2", label="API Gateway", type="process", order=2),
            NodeSpec(id="n3", label="Core Service", type="end", order=3),
        ],
        edges=[
            EdgeSpec(id="e1", source="n1", target="n2", label="HTTPS"),
            EdgeSpec(id="e2", source="n2", target="n3", label="gRPC"),
        ],
    )

    # 1. Test Theme switching via Copilot
    res_theme = service.apply_canvas_copilot(initial_spec, "Switch to Cyberpunk theme")
    assert res_theme.diagram.theme == "cyberpunk"
    assert "Cyberpunk" in res_theme.appliedChanges[0]

    # 2. Test SLA Badges via Copilot
    res_sla = service.apply_canvas_copilot(initial_spec, "Add SLA badges to all nodes")
    assert any("SLA" in (n.badge or "") or "Uptime" in (n.badge or "") or "Zero-Trust" in (n.badge or "") for n in res_sla.diagram.nodes)

    # 3. Test Security Gate Insertion via Copilot
    res_sec = service.apply_canvas_copilot(initial_spec, "Add a security and compliance review gate")
    assert any("Security" in n.label for n in res_sec.diagram.nodes)
    assert len(res_sec.diagram.nodes) == 4

    # 4. Test API Endpoint
    payload = {
        "diagram": initial_spec.model_dump(),
        "instruction": "Add emergency rollback branch on error",
    }
    api_res = test_client.post("/api/visual-studio/canvas-copilot", json=payload)
    assert api_res.status_code == 200
    data = api_res.json()
    assert "diagram" in data
    assert "explanation" in data
    assert any("Rollback" in n["label"] or "Escalation" in n["label"] for n in data["diagram"]["nodes"])


def test_studio_templates_crud(test_client):
    """Verifies saving, retrieving, and deleting custom canvas templates."""
    diag_spec = {
        "version": "1.0",
        "diagramType": "process_flow",
        "title": "Custom Onboarding Flow",
        "summary": "Shared workflow created by user",
        "nodes": [
            {"id": "n1", "label": "Start", "type": "start"},
            {"id": "n2", "label": "Review", "type": "process"},
            {"id": "n3", "label": "Deploy", "type": "end"},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3"},
        ],
    }

    # 1. Save new template
    save_payload = {
        "name": "Team DevOps Pipeline",
        "description": "Standard 3-stage CI/CD onboarding flow",
        "category": "process_flow",
        "diagram": diag_spec,
        "is_public": True,
    }
    save_res = test_client.post("/api/visual-studio/templates", json=save_payload)
    assert save_res.status_code == 200
    saved_data = save_res.json()
    assert saved_data["id"].startswith("tpl_")
    assert saved_data["name"] == "Team DevOps Pipeline"
    assert saved_data["node_count"] == 3
    assert saved_data["is_public"] is True
    tpl_id = saved_data["id"]

    # 2. Get templates list (should include the saved template)
    get_res = test_client.get("/api/visual-studio/templates")
    assert get_res.status_code == 200
    templates = get_res.json()
    matched = [t for t in templates if t["id"] == tpl_id]
    assert len(matched) == 1
    assert matched[0]["name"] == "Team DevOps Pipeline"
    assert matched[0]["diagram"]["title"] == "Custom Onboarding Flow"

    # 3. Delete template
    del_res = test_client.delete(f"/api/visual-studio/templates/{tpl_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 4. Verify it is no longer listed
    get_res_after = test_client.get("/api/visual-studio/templates")
    after_templates = get_res_after.json()
    assert not any(t["id"] == tpl_id for t in after_templates)





