import pytest
from src.visual_studio.routes import sanitize_diagram_design

def test_user_b_cannot_see_user_a_private_data():
    """
    Verifies that when User A creates a template with sensitive proprietary data,
    sanitization ensures User B ONLY gets the visual design, geometry, shapes,
    and styles, while all confidential text/metrics are 100% stripped.
    """
    user_a_confidential_diagram = {
        "version": "1.0",
        "diagramType": "process_flow",
        "title": "Secret Project Titan - Q4 Financial Ingestion",
        "summary": "Internal proprietary workflow containing secret company metrics and client accounts.",
        "nodes": [
            {
                "id": "node_1",
                "label": "Confidential Client Bank Account Auth",
                "sublabel": "API Key: secret_live_99881122 and balance check",
                "type": "start",
                "badge": "SECRET-P1",
                "x": 100,
                "y": 200,
                "width": 240,
                "height": 110,
                "customStyle": {
                    "shape": "hexagon",
                    "borderColor": "#8b5cf6",
                    "bgColor": "rgba(139, 92, 246, 0.15)",
                    "textColor": "#c084fc",
                    "borderWidth": 2,
                }
            },
            {
                "id": "node_2",
                "label": "Execute Secret ML Pricing Algorithm",
                "sublabel": "Proprietary model weights: v4.9.2 alpha",
                "type": "process",
                "badge": "CORE-ALGO",
                "x": 420,
                "y": 200,
                "width": 240,
                "height": 110,
                "customStyle": {
                    "shape": "card",
                    "borderColor": "#06b6d4",
                    "bgColor": "rgba(6, 182, 212, 0.15)",
                    "textColor": "#22d3ee",
                    "borderWidth": 2,
                }
            },
            {
                "id": "node_3",
                "label": "Disburse $4.8M to Private Hedge Fund",
                "sublabel": "Final transaction approved by VP",
                "type": "end",
                "badge": "PAYOUT",
                "x": 740,
                "y": 200,
                "width": 240,
                "height": 110,
                "customStyle": {
                    "shape": "pill",
                    "borderColor": "#10b981",
                    "bgColor": "rgba(16, 185, 129, 0.15)",
                    "textColor": "#34d399",
                    "borderWidth": 2,
                }
            }
        ],
        "edges": [
            {
                "id": "e1",
                "source": "node_1",
                "target": "node_2",
                "label": "Verified Token",
                "customStyle": {"routing": "curved", "color": "#8b5cf6"}
            },
            {
                "id": "e2",
                "source": "node_2",
                "target": "node_3",
                "label": "Threshold Passed",
                "customStyle": {"routing": "curved", "color": "#06b6d4"}
            }
        ],
        "chartData": {
            "rows": [["Q1", "$1.2M"], ["Q2", "$3.5M"]]
        }
    }

    # Sanitize for User B
    sanitized = sanitize_diagram_design(user_a_confidential_diagram, template_name="Shared Fintech Workflow")

    # 1. Verify ALL sensitive data is stripped
    full_text = str(sanitized)
    assert "Secret Project Titan" not in full_text
    assert "Confidential Client Bank Account" not in full_text
    assert "secret_live_99881122" not in full_text
    assert "Execute Secret ML Pricing Algorithm" not in full_text
    assert "Disburse $4.8M" not in full_text
    assert "Hedge Fund" not in full_text
    assert "SECRET-P1" not in full_text
    assert "CORE-ALGO" not in full_text
    assert "PAYOUT" not in full_text
    assert sanitized.get("chartData") is None

    # 2. Verify design structure is 100% PRESERVED
    assert len(sanitized["nodes"]) == 3
    assert len(sanitized["edges"]) == 2

    # Node 1 styling preserved
    n1 = sanitized["nodes"][0]
    assert n1["label"] == "Initial Stage 1"
    assert n1["sublabel"] == "Entry point or trigger"
    assert n1["badge"] == "01"
    assert n1["customStyle"]["shape"] == "hexagon"
    assert n1["customStyle"]["borderColor"] == "#8b5cf6"
    assert n1["x"] == 100
    assert n1["y"] == 200

    # Node 2 styling preserved
    n2 = sanitized["nodes"][1]
    assert n2["label"] == "Phase 2: Step"
    assert n2["badge"] == "02"
    assert n2["customStyle"]["shape"] == "card"
    assert n2["customStyle"]["borderColor"] == "#06b6d4"

    # Node 3 styling preserved
    n3 = sanitized["nodes"][2]
    assert n3["label"] == "Terminal State 3"
    assert n3["badge"] == "03"
    assert n3["customStyle"]["shape"] == "pill"
    assert n3["customStyle"]["borderColor"] == "#10b981"

    # Edges routing preserved
    e1 = sanitized["edges"][0]
    assert e1["label"] == "Next"
    assert e1["customStyle"]["routing"] == "curved"
    assert e1["customStyle"]["color"] == "#8b5cf6"

    print("ALL PRIVACY AND DESIGN-ONLY TESTS PASSED!")

if __name__ == "__main__":
    test_user_b_cannot_see_user_a_private_data()
