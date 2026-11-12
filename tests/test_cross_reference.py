import unittest
from src.cross_reference.schemas import (
    CrossReferenceResponse,
    DocumentSection,
    CrossReferenceLink,
    DiscrepancyItem,
    CrossDocSummary,
    DocumentUnderstanding,
    TopicComparisonItem,
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

    def test_extract_file_content_various_types(self):
        # Plain text
        txt_content = b"Header line\nThis is a sample document for testing extraction."
        text, pages = self.service.extract_file_content("test.txt", txt_content)
        self.assertIn("sample document", text)
        self.assertGreaterEqual(pages, 1)

        # JSON file
        json_content = b'{"policy_name": "Information Security", "version": 2.1}'
        text, pages = self.service.extract_file_content("policy.json", json_content)
        self.assertIn("Information Security", text)

        # CSV file
        csv_content = b"Role,Max_Limit,Approval\nManager,5000,Single\nDirector,25000,Dual"
        text, pages = self.service.extract_file_content("matrix.csv", csv_content)
        self.assertIn("Manager", text)
        self.assertIn("Director", text)

    def test_document_understanding_generation(self):
        sample_text = """
# Corporate Expense Policy
This document establishes authorization limits for all staff.
Manager approval is required for all travel expenses over $500.
Director approval is mandatory for any software purchase.
Finance department conducts monthly audits.
"""
        understanding = self.service.generate_document_understanding(
            doc_id="doc-test",
            filename="Corporate Expense Policy.docx",
            text=sample_text,
            page_count=2,
        )
        self.assertIsInstance(understanding, DocumentUnderstanding)
        self.assertEqual(understanding.filename, "Corporate Expense Policy.docx")
        self.assertGreaterEqual(understanding.word_count, 10)
        self.assertGreaterEqual(len(understanding.key_takeaways), 1)

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
        topic_comp = TopicComparisonItem(
            topic="Approval Thresholds",
            doc_a_stance="Dual signoff > $5,000",
            doc_b_stance="Single signoff <= $10,000",
            status="conflict",
            verdict="Direct policy contradiction between documents.",
        )
        resp = CrossReferenceResponse(
            doc_a={"id": "doc-1", "filename": "SOP 1", "size": 1000, "page_count": 2},
            doc_b={"id": "doc-2", "filename": "Policy 2", "size": 1500, "page_count": 3},
            sections_a=[sec_a],
            sections_b=[sec_b],
            links=[link],
            discrepancies=[disc],
            comparison_matrix=[topic_comp],
            summary=summary,
        )
        self.assertEqual(resp.summary.alignment_score, 75)
        self.assertEqual(len(resp.links), 1)
        self.assertEqual(resp.links[0].relation, "contradiction")
        self.assertEqual(len(resp.comparison_matrix), 1)

    def test_harmonize_clause(self):
        from src.cross_reference.schemas import HarmonizeClauseRequest
        req = HarmonizeClauseRequest(
            topic="Expenditure Threshold",
            doc_a_clause="Dual approval mandatory over $5,000",
            doc_b_clause="Single signoff permitted up to $10,000",
            conflict_detail="Audit threshold mismatch",
            doc_a_name="Policy A",
            doc_b_name="SOP B",
        )
        res = self.service.harmonize_clause(req)
        self.assertTrue(len(res.harmonized_clause) > 10)
        self.assertTrue(len(res.rationale) > 5)


if __name__ == "__main__":
    unittest.main()
