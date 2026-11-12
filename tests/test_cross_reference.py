import unittest
from src.cross_reference.schemas import (
    CrossReferenceResponse,
    DocumentSection,
    CrossReferenceLink,
    DiscrepancyItem,
    CrossDocSummary,
)
from src.cross_reference.service import CrossReferenceService


class TestCrossReferenceService(unittest.TestCase):
    def setUp(self):
        self.service = CrossReferenceService()

    def test_extract_sections_heuristics(self):
        sample_text = """
# Section 1: Executive Governance
This section outlines the governing rules and board oversight criteria for TRPW partners.

# Section 2: Financial Thresholds
All capital expenditures exceeding $10,000 must obtain prior dual-signoff from the CFO and Controller.

# Section 3: Prohibited Operational Actions
Under no circumstances may an accounts payable manager initiate wire transfers directly without dual custody.

# Section 4: Audit and Reconciliation
Accounts must be reconciled on a 30-day cadence with external reporting deliverables.
"""
        sections = self.service._extract_sections(
            doc_id="test-doc-1",
            doc_name="Financial Controls SOP",
            text=sample_text,
            chunks=[],
        )
        self.assertGreaterEqual(len(sections), 3)
        self.assertEqual(sections[0].doc_title, "Financial Controls SOP")
        self.assertIn("Governance", sections[0].heading)

    def test_cross_reference_response_model(self):
        sec_a = DocumentSection(
            id="sec-a1",
            doc_id="doc-1",
            doc_title="SOP 1",
            heading="Approval Limits",
            content="Dual approval required over $5,000.",
        )
        sec_b = DocumentSection(
            id="sec-b1",
            doc_id="doc-2",
            doc_title="Policy 2",
            heading="Spending Matrix",
            content="Spending up to $10,000 approved by single manager.",
        )
        link = CrossReferenceLink(
            source_section_id=sec_a.id,
            target_section_id=sec_b.id,
            relation="contradiction",
            confidence=0.92,
            summary="Contradictory threshold limits between SOP 1 and Policy 2.",
            source_quote="over $5,000",
            target_quote="up to $10,000",
        )
        disc = DiscrepancyItem(
            topic="Authorization Limits",
            severity="high",
            doc_a_clause="Dual approval over $5,000",
            doc_b_clause="Single approval up to $10,000",
            conflict_detail="Operational misalignment creates audit failure risk.",
            suggested_action="Harmonize single-signoff ceiling to $5,000.",
        )
        summary = CrossDocSummary(
            alignment_score=75,
            total_links=1,
            agreed_count=0,
            conflict_count=1,
            reference_count=0,
            gap_count=0,
            executive_summary="Targeted contradiction detected in financial authorization.",
            key_risks=["Audit non-compliance"],
            key_recommendations=["Standardize limits"],
        )
        resp = CrossReferenceResponse(
            doc_a={"id": "doc-1", "filename": "SOP 1", "size": 1000, "page_count": 2},
            doc_b={"id": "doc-2", "filename": "Policy 2", "size": 1500, "page_count": 3},
            sections_a=[sec_a],
            sections_b=[sec_b],
            links=[link],
            discrepancies=[disc],
            summary=summary,
        )
        self.assertEqual(resp.summary.alignment_score, 75)
        self.assertEqual(len(resp.links), 1)
        self.assertEqual(resp.links[0].relation, "contradiction")


if __name__ == "__main__":
    unittest.main()
