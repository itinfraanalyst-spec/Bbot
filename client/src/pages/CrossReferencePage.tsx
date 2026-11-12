import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  Download,
  Sparkles,
  MessageSquare,
  BookOpen,
  SplitSquareVertical,
  Layers,
  Send,
  Loader2,
  Info,
  RefreshCw,
  Users,
  Target,
  FileSpreadsheet,
  FileCode,
  X,
  Trash2,
  Search,
  Printer,
  History,
  Copy,
  Check,
  Diff,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';

interface DocumentSummaryItem {
  id: string;
  filename: string;
  size: number;
  page_count: number;
  status: string;
  created_at?: string;
  summary?: string;
}

interface DocumentUnderstanding {
  doc_id: string;
  filename: string;
  document_type: string;
  executive_summary: string;
  core_purpose: string;
  target_audience: string;
  key_takeaways: string[];
  key_entities_or_roles: string[];
  topics_covered: string[];
  detailed_explanation?: string;
  scope_and_applicability?: string;
  word_count: number;
  page_count: number;
}

interface TopicComparisonItem {
  id: string;
  topic: string;
  doc_a_stance: string;
  doc_b_stance: string;
  status: 'aligned' | 'conflict' | 'doc_a_only' | 'doc_b_only' | 'stricter' | 'supersedes';
  verdict: string;
  practical_implication?: string;
  guidance?: string;
}

interface DocumentSection {
  id: string;
  doc_id: string;
  doc_title: string;
  heading: string;
  content: string;
  summary?: string;
  key_points?: string[];
  matched_section_id?: string;
  matched_heading?: string;
  alignment_status?: string;
  page_start?: number;
  page_end?: number;
  chunk_index: number;
}

interface CrossReferenceLink {
  id: string;
  source_section_id: string;
  target_section_id: string;
  relation: 'aligned' | 'contradiction' | 'reference' | 'gap' | 'supersedes';
  confidence: number;
  summary: string;
  source_quote?: string;
  target_quote?: string;
  recommendation?: string;
}

interface DiscrepancyItem {
  id: string;
  topic: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  doc_a_clause: string;
  doc_b_clause: string;
  conflict_detail: string;
  suggested_action: string;
  harmonized_clause?: string;
}

interface CrossDocSummary {
  alignment_score: number;
  total_links: number;
  agreed_count: number;
  conflict_count: number;
  reference_count: number;
  gap_count: number;
  executive_summary: string;
  key_risks: string[];
  key_recommendations: string[];
}

interface CrossReferenceResponse {
  doc_a: DocumentSummaryItem;
  doc_b: DocumentSummaryItem;
  understanding_a?: DocumentUnderstanding;
  understanding_b?: DocumentUnderstanding;
  sections_a: DocumentSection[];
  sections_b: DocumentSection[];
  links: CrossReferenceLink[];
  discrepancies: DiscrepancyItem[];
  comparison_matrix: TopicComparisonItem[];
  summary: CrossDocSummary;
}

interface SavedAuditRecord {
  id: string;
  timestamp: string;
  doc_a_name: string;
  doc_b_name: string;
  alignment_score: number;
  topic_count?: number;
  conflict_count?: number;
  executive_summary?: string;
  data?: CrossReferenceResponse;
}

// Simple word-level diff utility
interface DiffPart {
  type: 'same' | 'added' | 'removed';
  text: string;
}

function computeWordDiff(textA: string, textB: string): DiffPart[] {
  const wordsA = textA.split(/\s+/).filter(Boolean);
  const wordsB = textB.split(/\s+/).filter(Boolean);
  const parts: DiffPart[] = [];

  const maxLen = Math.max(wordsA.length, wordsB.length);
  let i = 0;
  let j = 0;

  while (i < wordsA.length || j < wordsB.length) {
    if (i < wordsA.length && j < wordsB.length && wordsA[i].toLowerCase() === wordsB[j].toLowerCase()) {
      parts.push({ type: 'same', text: wordsB[j] + ' ' });
      i++;
      j++;
    } else {
      if (i < wordsA.length && !wordsB.slice(j, j + 4).map(w => w.toLowerCase()).includes(wordsA[i].toLowerCase())) {
        parts.push({ type: 'removed', text: wordsA[i] + ' ' });
        i++;
      } else if (j < wordsB.length) {
        parts.push({ type: 'added', text: wordsB[j] + ' ' });
        j++;
      } else {
        if (i < wordsA.length) {
          parts.push({ type: 'removed', text: wordsA[i] + ' ' });
          i++;
        }
      }
    }
    if (parts.length > maxLen * 2) break; // safeguard
  }
  return parts;
}

export function CrossReferencePage() {
  const [documents, setDocuments] = useState<DocumentSummaryItem[]>([]);
  const [docAId, setDocAId] = useState<string>('');
  const [docBId, setDocBId] = useState<string>('');

  // Upload state
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [understandingA, setUnderstandingA] = useState<DocumentUnderstanding | null>(null);
  const [understandingB, setUnderstandingB] = useState<DocumentUnderstanding | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CrossReferenceResponse | null>(null);

  // Active view tab: 'understanding' | 'matrix' | 'conflicts' | 'reader' | 'copilot'
  const [activeTab, setActiveTab] = useState<'understanding' | 'matrix' | 'conflicts' | 'reader' | 'copilot'>('understanding');
  const [understandingSubTab, setUnderstandingSubTab] = useState<'both' | 'doc_a' | 'doc_b'>('both');

  // Reader enhancements: Search, Redline Diff, Expansion & Deep Filtering
  const [readerSearchQuery, setReaderSearchQuery] = useState('');
  const [readerMode, setReaderMode] = useState<'split' | 'redline'>('split');
  const [readerFilter, setReaderFilter] = useState<'all' | 'metrics' | 'linked'>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedSectionAId, setSelectedSectionAId] = useState<string | null>(null);
  const [selectedSectionBId, setSelectedSectionBId] = useState<string | null>(null);
  const sectionRefsA = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRefsB = useRef<Record<string, HTMLDivElement | null>>({});

  // Harmonize state: id -> { clause, rationale, loading }
  const [harmonizedMap, setHarmonizedMap] = useState<Record<string, { clause: string; rationale: string; loading: boolean }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Polish enhancements: Toast, Topic Search & Filtering, Analysis Stepper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<'all' | 'conflict' | 'aligned' | 'stricter' | 'exclusive'>('all');
  const [analysisStep, setAnalysisStep] = useState(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Audit History state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [auditHistory, setAuditHistory] = useState<SavedAuditRecord[]>([]);

  // Copilot state
  const [copilotQuery, setCopilotQuery] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotChat, setCopilotChat] = useState<Array<{ role: 'user' | 'assistant'; text: string; verdict?: string }>>([
    {
      role: 'assistant',
      text: 'Namaste! Main bbot Cross-Document Intelligence Copilot hoon. Dono documents upload ya select karein aur main kisi bhi clause, difference, policy limit ya summary ka exact answer dunga.',
    },
  ]);

  // Load documents and saved history on mount
  useEffect(() => {
    loadDocuments();
    loadAuditHistory();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/cross-reference/documents', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        if (data.documents && data.documents.length >= 2) {
          if (!docAId) setDocAId(data.documents[0].id);
          if (!docBId) setDocBId(data.documents[1].id);
        }
      }
    } catch (err) {
      console.error('Failed to load documents list:', err);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const res = await fetch('/api/cross-reference/history', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setAuditHistory(data.history);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend history fetch failed, trying local storage:', e);
    }

    try {
      const stored = localStorage.getItem('bbot_cross_ref_audits');
      if (stored) {
        setAuditHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse audit history:', e);
    }
  };

  const saveAuditToHistory = (result: CrossReferenceResponse) => {
    try {
      const newRecord: SavedAuditRecord = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        doc_a_name: result.doc_a.filename,
        doc_b_name: result.doc_b.filename,
        alignment_score: result.summary.alignment_score,
        topic_count: result.comparison_matrix.length,
        conflict_count: result.discrepancies.length,
        executive_summary: result.summary.executive_summary?.slice(0, 180),
        data: result,
      };
      setAuditHistory(prev => {
        const updated = [newRecord, ...prev.filter(a => !(a.doc_a_name === result.doc_a.filename && a.doc_b_name === result.doc_b.filename))].slice(0, 20);
        try {
          localStorage.setItem('bbot_cross_ref_audits', JSON.stringify(updated));
        } catch {
          // ignore quota
        }
        return updated;
      });
    } catch (e) {
      console.warn('Failed to save audit history:', e);
    }
  };

  const restoreAudit = async (record: SavedAuditRecord) => {
    try {
      let fullData = record.data;
      if (!fullData) {
        const res = await fetch(`/api/cross-reference/history/${record.id}`, { credentials: 'include' });
        if (res.ok) {
          fullData = await res.json();
        }
      }

      if (fullData) {
        setAnalysisResult(fullData);
        setDocAId(fullData.doc_a.id);
        setDocBId(fullData.doc_b.id);
        if (fullData.understanding_a) setUnderstandingA(fullData.understanding_a);
        if (fullData.understanding_b) setUnderstandingB(fullData.understanding_b);
        if (fullData.sections_a?.length > 0) setSelectedSectionAId(fullData.sections_a[0].id);
        if (fullData.sections_b?.length > 0) setSelectedSectionBId(fullData.sections_b[0].id);
        setIsHistoryOpen(false);
        showToast(`✨ Restored past audit: ${fullData.doc_a.filename} vs ${fullData.doc_b.filename}`);
      }
    } catch (err) {
      console.error('Failed to restore audit record:', err);
    }
  };

  const deleteSingleAudit = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/cross-reference/history/${recordId}`, { method: 'DELETE', credentials: 'include' });
    } catch {
      // ignore
    }
    setAuditHistory(prev => {
      const updated = prev.filter(r => r.id !== recordId);
      try {
        localStorage.setItem('bbot_cross_ref_audits', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    showToast('Record removed from history');
  };

  const clearAuditHistory = async () => {
    try {
      await fetch('/api/cross-reference/history', { method: 'DELETE', credentials: 'include' });
    } catch {
      // ignore
    }
    localStorage.removeItem('bbot_cross_ref_audits');
    setAuditHistory([]);
    showToast('Audit history cleared');
  };

  // Swap Document 1 and Document 2
  const handleSwapDocuments = () => {
    if (!docAId && !docBId) return;
    const tempId = docAId;
    const tempUnder = understandingA;
    setDocAId(docBId);
    setUnderstandingA(understandingB);
    setDocBId(tempId);
    setUnderstandingB(tempUnder);
    setAnalysisResult(null);
    showToast('⇄ Swapped Document 1 and Document 2');
  };

  // Direct file upload handler
  const handleFileUpload = async (file: File, slot: 'doc_a' | 'doc_b') => {
    if (!file) return;
    setErrorMsg(null);
    const isSlotA = slot === 'doc_a';
    if (isSlotA) setIsUploadingA(true);
    else setIsUploadingB(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slot', slot);

    try {
      const res = await fetch('/api/cross-reference/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await res.json();
      const docItem: DocumentSummaryItem = {
        id: data.doc_id,
        filename: data.filename,
        size: data.size,
        page_count: data.page_count,
        status: 'READY',
      };

      setDocuments(prev => {
        const filtered = prev.filter(d => d.id !== data.doc_id);
        return [docItem, ...filtered];
      });

      if (isSlotA) {
        setDocAId(data.doc_id);
        setUnderstandingA(data.understanding);
      } else {
        setDocBId(data.doc_id);
        setUnderstandingB(data.understanding);
      }
    } catch (err: any) {
      setErrorMsg(`Upload failed: ${err.message || 'Check file format or server status'}`);
    } finally {
      if (isSlotA) setIsUploadingA(false);
      else setIsUploadingB(false);
    }
  };

  // Remove / Clear handlers for Document A and B
  const handleRemoveDocA = () => {
    setDocAId('');
    setUnderstandingA(null);
    setAnalysisResult(null);
  };

  const handleRemoveDocB = () => {
    setDocBId('');
    setUnderstandingB(null);
    setAnalysisResult(null);
  };

  const handleClearAll = () => {
    setDocAId('');
    setDocBId('');
    setUnderstandingA(null);
    setUnderstandingB(null);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  // Run analysis
  const handleAnalyze = async () => {
    if (!docAId || !docBId) {
      setErrorMsg('Kripya Document 1 aur Document 2 dono select ya upload karein.');
      return;
    }
    if (docAId === docBId) {
      setErrorMsg('Compare karne ke liye do alag documents chunein.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisStep(1);
    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 1600);
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 3600);

    try {
      const res = await fetch('/api/cross-reference/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_a_id: docAId,
          doc_b_id: docBId,
          mode: 'audit',
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
        throw new Error(errData.detail || 'Analysis failed');
      }

      const result: CrossReferenceResponse = await res.json();
      setAnalysisResult(result);
      if (result.understanding_a) setUnderstandingA(result.understanding_a);
      if (result.understanding_b) setUnderstandingB(result.understanding_b);

      if (result.sections_a?.length > 0) setSelectedSectionAId(result.sections_a[0].id);
      if (result.sections_b?.length > 0) setSelectedSectionBId(result.sections_b[0].id);

      saveAuditToHistory(result);
      showToast('✨ Analysis completed successfully');
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis run karne me problem aayi.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
    }
  };

  // One-Click AI Harmonize Clause handler
  const handleHarmonizeClause = async (disc: DiscrepancyItem) => {
    if (!disc.id) return;
    setHarmonizedMap(prev => ({ ...prev, [disc.id]: { clause: '', rationale: '', loading: true } }));

    try {
      const res = await fetch('/api/cross-reference/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: disc.topic,
          doc_a_clause: disc.doc_a_clause,
          doc_b_clause: disc.doc_b_clause,
          conflict_detail: disc.conflict_detail,
          doc_a_name: analysisResult?.doc_a.filename || 'Document 1',
          doc_b_name: analysisResult?.doc_b.filename || 'Document 2',
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Harmonize request failed');
      const data = await res.json();
      setHarmonizedMap(prev => ({
        ...prev,
        [disc.id]: {
          clause: data.harmonized_clause,
          rationale: data.rationale,
          loading: false,
        },
      }));
      showToast('✨ Synthesized harmonized replacement clause');
    } catch (err) {
      setHarmonizedMap(prev => ({
        ...prev,
        [disc.id]: {
          clause: `Standard Operational Revision: Both ${disc.doc_a_clause} and ${disc.doc_b_clause} shall be harmonized under dual-control guidelines.`,
          rationale: 'Harmonized baseline drafted.',
          loading: false,
        },
      }));
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('📋 Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSectionExpand = (secId: string) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleAskAboutSection = (sec: DocumentSection, docRole: string) => {
    const q = `Explain clause "${sec.heading}" from ${docRole} (${sec.doc_title}). What are its operational rules, limits, and how does it compare with the other document?`;
    setActiveTab('copilot');
    handleSendCopilotQuery(q);
  };

  const handleJumpToSectionB = (targetId: string) => {
    setSelectedSectionBId(targetId);
    const targetEl = sectionRefsB.current[targetId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleJumpToSectionA = (targetId: string) => {
    setSelectedSectionAId(targetId);
    const targetEl = sectionRefsA.current[targetId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Click on section A with Synchronized Auto-Scroll to linked section in B
  const handleSelectSectionA = (secAId: string) => {
    setSelectedSectionAId(secAId);
    if (!analysisResult) return;

    // First try matched_section_id on the section itself
    const secA = analysisResult.sections_a.find(s => s.id === secAId);
    if (secA?.matched_section_id) {
      handleJumpToSectionB(secA.matched_section_id);
      return;
    }

    // Fallback: Find linked section in B from links array
    const link = analysisResult.links.find(l => l.source_section_id === secAId);
    if (link && link.target_section_id) {
      handleJumpToSectionB(link.target_section_id);
    }
  };

  const handleSelectSectionB = (secBId: string) => {
    setSelectedSectionBId(secBId);
    if (!analysisResult) return;

    const secB = analysisResult.sections_b.find(s => s.id === secBId);
    if (secB?.matched_section_id) {
      handleJumpToSectionA(secB.matched_section_id);
      return;
    }

    const link = analysisResult.links.find(l => l.target_section_id === secBId);
    if (link && link.source_section_id) {
      handleJumpToSectionA(link.source_section_id);
    }
  };

  // Copilot Ask
  const handleSendCopilotQuery = async (queryText?: string) => {
    const q = (queryText || copilotQuery).trim();
    if (!q || !docAId || !docBId) return;

    setCopilotChat(prev => [...prev, { role: 'user', text: q }]);
    setCopilotQuery('');
    setIsCopilotLoading(true);

    try {
      const res = await fetch('/api/cross-reference/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_a_id: docAId,
          doc_b_id: docBId,
          question: q,
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Copilot inquiry failed');
      const data = await res.json();
      setCopilotChat(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          verdict: data.comparison_verdict,
        },
      ]);
    } catch (err) {
      setCopilotChat(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Maaf kijiye, comparative answer generate karte samay problem hui. Dobara try karein.',
        },
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Export report
  const handleExport = async (format: 'markdown' | 'json') => {
    if (!analysisResult) return;
    try {
      const res = await fetch('/api/cross-reference/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          data: analysisResult,
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cross_reference_audit_${Date.now()}.${format === 'markdown' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Report export karne me dikkat aayi.');
    }
  };

  // Print Executive Report (Save as PDF)
  const handlePrint = () => {
    window.print();
  };

  const getDocName = (id: string, fallback: string) => {
    const d = documents.find(doc => doc.id === id);
    return d ? d.filename : fallback;
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
      return <FileSpreadsheet className="text-[var(--accent)] shrink-0" size={17} />;
    }
    if (lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.md')) {
      return <FileCode className="text-[var(--accent)] shrink-0" size={17} />;
    }
    return <FileText className="text-[var(--accent)] shrink-0" size={17} />;
  };

  // Highlight helper for reader
  const renderHighlightedContent = (content: string, query: string) => {
    if (!query.trim()) return content;
    const parts = content.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-[var(--accent)]/30 text-[var(--accent)] font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* Top Header - bbot standard */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 py-3 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors"
            >
              <span>← Chat</span>
            </Link>
            <div className="h-4 w-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shadow-xs">
                <GitCompare size={18} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  bbot Cross-Reference Portal
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)]">
                    Enterprise Intelligence
                  </span>
                </h1>
                <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                  Universal document ingestion, clause harmonization, live synchronized reader & compliance audit.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audit History Drawer Toggle */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-xs"
              title="View past audit records"
            >
              <History size={14} className="text-[var(--accent)]" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-[10px] font-bold">
                {auditHistory.length}
              </span>
            </button>

            <Link
              to="/studio"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] font-medium transition-colors"
            >
              Visual Studio
            </Link>

            {analysisResult && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Print / Save as PDF Report"
                >
                  <Printer size={13} className="text-[var(--accent)]" />
                  <span className="hidden md:inline">PDF</span>
                </button>
                <button
                  onClick={() => handleExport('markdown')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Report (MD)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-over Audit History Drawer */}
      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] p-5 flex flex-col h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[var(--accent)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Past Document Comparisons ({auditHistory.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {auditHistory.length > 0 && (
                  <button
                    onClick={clearAuditHistory}
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer font-medium"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditHistory.length === 0 ? (
                <div className="text-center py-16 text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <History size={32} className="text-[var(--text-muted)]/40" />
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Koi past audit record nahi mila</span>
                  <p className="max-w-[240px]">Dono documents select karke "Cross-Audit" run karein, aapka kaam yahan automatically save ho jayega.</p>
                </div>
              ) : (
                auditHistory.map((rec) => {
                  const topicCount = rec.topic_count ?? rec.data?.comparison_matrix?.length ?? 0;
                  const conflictCount = rec.conflict_count ?? rec.data?.discrepancies?.length ?? 0;

                  return (
                    <div
                      key={rec.id}
                      onClick={() => restoreAudit(rec)}
                      className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex flex-col gap-2 group shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">{rec.timestamp}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)]">
                          {rec.alignment_score}% Harmony
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                        {rec.doc_a_name} <span className="text-[var(--text-muted)] font-normal">vs</span> {rec.doc_b_name}
                      </div>
                      {rec.executive_summary && (
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {rec.executive_summary}
                        </p>
                      )}
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60">
                        <span>{topicCount} Topics • {conflictCount} Conflicts</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => deleteSingleAudit(e, rec.id)}
                            className="text-[var(--text-muted)] hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors"
                            title="Delete record"
                          >
                            <Trash2 size={12} />
                          </button>
                          <span className="text-[var(--accent)] font-bold flex items-center gap-0.5">
                            Open Audit →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-500/20 rounded cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: Two Simple Upload & Select Boxes with REMOVE Button */}
        <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-xs print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] flex items-center justify-center font-bold">1</span>
                Upload or Select Two Documents
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Supports PDF, Word (DOCX), Excel (XLSX, CSV), Markdown, TXT, PPTX & JSON files.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {(docAId || docBId) && (
                <button
                  type="button"
                  onClick={handleSwapDocuments}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)] text-[var(--text-muted)] hover:text-[var(--accent)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Swap Document 1 and Document 2"
                >
                  <ArrowLeftRight size={12} />
                  <span>⇄ Swap Docs</span>
                </button>
              )}
              {(docAId || docBId) && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Clear both documents"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              )}
              <button
                onClick={loadDocuments}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DOCUMENT 1 (A) */}
            <div className={`p-4 rounded-xl border transition-all ${docAId ? 'border-[var(--accent)]/50 bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-primary)]/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <FileText size={14} />
                  Document 1 (Primary / Baseline)
                </span>
                {docAId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Ready
                    </span>
                    <button
                      onClick={handleRemoveDocA}
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                      title="Remove Document 1"
                    >
                      <X size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Drag & Drop Zone */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0], 'doc_a');
                    }
                  }}
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.pptx,.json"
                />
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2">
                  {isUploadingA ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                      <span>Extracting & Understanding Document 1...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} className="text-[var(--accent)]" />
                      <span>Drag & Drop or Click to Upload File</span>
                    </>
                  )}
                </div>
              </label>

              {/* Or Select from Existing dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Or Select:</span>
                <select
                  value={docAId}
                  onChange={(e) => setDocAId(e.target.value)}
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">-- Choose Document 1 --</option>
                  {documents.map((d) => (
                    <option key={`docA-${d.id}`} value={d.id}>
                      {d.filename} ({d.page_count} pgs, {(d.size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected File Badge with Direct Remove */}
              {docAId && (
                <div className="mt-2.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(getDocName(docAId, 'Doc 1'))}
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {getDocName(docAId, 'Document 1')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {understandingA && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] font-medium">
                        {understandingA.document_type}
                      </span>
                    )}
                    <button
                      onClick={handleRemoveDocA}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                      title="Deselect / Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DOCUMENT 2 (B) */}
            <div className={`p-4 rounded-xl border transition-all ${docBId ? 'border-[var(--accent)]/50 bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]' : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-primary)]/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <FileText size={14} />
                  Document 2 (Comparison / Target)
                </span>
                {docBId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Ready
                    </span>
                    <button
                      onClick={handleRemoveDocB}
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                      title="Remove Document 2"
                    >
                      <X size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Drag & Drop Zone */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0], 'doc_b');
                    }
                  }}
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.pptx,.json"
                />
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2">
                  {isUploadingB ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                      <span>Extracting & Understanding Document 2...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} className="text-[var(--accent)]" />
                      <span>Drag & Drop or Click to Upload File</span>
                    </>
                  )}
                </div>
              </label>

              {/* Or Select from Existing dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Or Select:</span>
                <select
                  value={docBId}
                  onChange={(e) => setDocBId(e.target.value)}
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">-- Choose Document 2 --</option>
                  {documents.map((d) => (
                    <option key={`docB-${d.id}`} value={d.id}>
                      {d.filename} ({d.page_count} pgs, {(d.size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected File Badge with Direct Remove */}
              {docBId && (
                <div className="mt-2.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(getDocName(docBId, 'Doc 2'))}
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {getDocName(docBId, 'Document 2')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {understandingB && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] font-medium">
                        {understandingB.document_type}
                      </span>
                    )}
                    <button
                      onClick={handleRemoveDocB}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                      title="Deselect / Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button Section */}
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[var(--text-muted)]">
              {docAId && docBId ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Dono documents ready hain. Click karein to begin intelligent cross-referencing.
                </span>
              ) : (
                <span>Dono documents upload ya select karein comparative analysis ke liye.</span>
              )}
            </div>
            {isAnalyzing ? (
              <div className="w-full sm:w-auto flex flex-col gap-1.5 p-2.5 px-4 rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
                  <Loader2 size={14} className="animate-spin" />
                  <span>
                    {analysisStep === 1 && '1/3 Ingesting & Extracting Sections...'}
                    {analysisStep === 2 && '2/3 Mapping Policies & Harmonizing Clauses...'}
                    {analysisStep === 3 && '3/3 Calculating Compliance Harmony & Verdict...'}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-700 ease-out"
                    style={{ width: `${(analysisStep / 3) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !docAId || !docBId}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} />
                <span>⚡ Compare & Understand Documents</span>
              </button>
            )}
          </div>
        </section>

        {/* STEP 2: Results Section with Clean Tabs */}
        {analysisResult && (
          <section className="flex flex-col gap-5">
            {/* Quick Metrics Bar - bbot native style (Interactive Tabs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setActiveTab('understanding')}
                className={`p-3.5 rounded-xl bg-[var(--bg-surface)] border transition-all flex items-center justify-between cursor-pointer group shadow-xs ${
                  activeTab === 'understanding' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/50'
                }`}
                title="Click to view Document Understanding"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] flex items-center justify-center font-bold text-sm">
                    {analysisResult.summary.alignment_score}%
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Alignment Match</div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {analysisResult.summary.alignment_score >= 80 ? 'High Harmony' : 'Moderate Divergence'}
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => {
                  setActiveTab('matrix');
                  setTopicFilter('aligned');
                }}
                className={`p-3.5 rounded-xl bg-[var(--bg-surface)] border transition-all flex items-center justify-between cursor-pointer group shadow-xs ${
                  activeTab === 'matrix' && topicFilter === 'aligned' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-[var(--border-subtle)] hover:border-emerald-500/50'
                }`}
                title="Click to filter Harmonized clauses"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                    {analysisResult.summary.agreed_count}
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Consistent Clauses</div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Aligned Points</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => setActiveTab('conflicts')}
                className={`p-3.5 rounded-xl bg-[var(--bg-surface)] border transition-all flex items-center justify-between cursor-pointer group shadow-xs ${
                  activeTab === 'conflicts' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[var(--border-subtle)] hover:border-rose-500/50'
                }`}
                title="Click to view Conflicts & Discrepancies"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
                    {analysisResult.discrepancies.length}
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Conflicts & Gaps</div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Action Required</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => {
                  setActiveTab('matrix');
                  setTopicFilter('all');
                }}
                className={`p-3.5 rounded-xl bg-[var(--bg-surface)] border transition-all flex items-center justify-between cursor-pointer group shadow-xs ${
                  activeTab === 'matrix' && topicFilter === 'all' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/50'
                }`}
                title="Click to view all Topics in Matrix"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-sm">
                    {analysisResult.comparison_matrix.length || analysisResult.links.length}
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">Topics Analyzed</div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Cross-Audit Points</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* TAB NAVIGATION - bbot native style */}
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] overflow-x-auto pb-px print:hidden">
              <button
                onClick={() => setActiveTab('understanding')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'understanding'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BookOpen size={14} />
                <span>📑 Document Understanding</span>
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers size={14} />
                <span>⚖️ Topic-by-Topic Comparison</span>
              </button>

              <button
                onClick={() => setActiveTab('conflicts')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'conflicts'
                    ? 'border-rose-500 text-rose-500'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <AlertTriangle size={14} />
                <span>🚨 Conflicts & Gaps ({analysisResult.discrepancies.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reader')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'reader'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SplitSquareVertical size={14} />
                <span>📖 Dual Reader & Diff</span>
              </button>

              <button
                onClick={() => setActiveTab('copilot')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'copilot'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <MessageSquare size={14} />
                <span>💬 Ask AI Copilot</span>
              </button>
            </div>

            {/* TAB 1: DOCUMENT UNDERSTANDING */}
            {activeTab === 'understanding' && (
              <div className="flex flex-col gap-4">
                {/* Executive Audit Overview Card */}
                <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] uppercase tracking-wider mb-2">
                    <Sparkles size={15} /> Executive Cross-Audit Verdict
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                    {analysisResult.summary.executive_summary}
                  </p>
                </div>

                {/* Sub-selector: View Both, Doc 1 only, or Doc 2 only */}
                <div className="flex items-center justify-between print:hidden">
                  <div className="inline-flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold">
                    <button
                      onClick={() => setUnderstandingSubTab('both')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${understandingSubTab === 'both' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      Compare Both Summaries
                    </button>
                    <button
                      onClick={() => setUnderstandingSubTab('doc_a')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${understandingSubTab === 'doc_a' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      Doc 1: {analysisResult.doc_a.filename}
                    </button>
                    <button
                      onClick={() => setUnderstandingSubTab('doc_b')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${understandingSubTab === 'doc_b' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      Doc 2: {analysisResult.doc_b.filename}
                    </button>
                  </div>
                </div>

                {/* Document Profiles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* DOC A PROFILE */}
                  {(understandingSubTab === 'both' || understandingSubTab === 'doc_a') && (
                    <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                            Document 1 Breakdown
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
                            {analysisResult.doc_a.filename}
                          </h3>
                        </div>
                        {analysisResult.understanding_a && (
                          <span className="px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-[10px] font-bold">
                            {analysisResult.understanding_a.document_type}
                          </span>
                        )}
                      </div>

                      {analysisResult.understanding_a && (
                        <>
                          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                              <Target size={14} className="text-[var(--accent)]" />
                              Primary Purpose / Core Mandate
                            </div>
                            <div className="text-[var(--text-secondary)] leading-relaxed font-medium">
                              {analysisResult.understanding_a.core_purpose}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                              <Info size={14} className="text-[var(--accent)]" />
                              Executive Summary & Core Intent:
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                              {analysisResult.understanding_a.executive_summary}
                            </p>
                          </div>

                          {analysisResult.understanding_a.detailed_explanation && (
                            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                                <BookOpen size={14} className="text-[var(--accent)]" />
                                Operational Workflow & Procedural Execution:
                              </div>
                              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {analysisResult.understanding_a.detailed_explanation}
                              </p>
                            </div>
                          )}

                          {analysisResult.understanding_a.scope_and_applicability && (
                            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Scope, Boundaries & Policy Rules:
                              </div>
                              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {analysisResult.understanding_a.scope_and_applicability}
                              </p>
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Key Points & Operating Rules:
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {analysisResult.understanding_a.key_takeaways.map((point, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)] flex items-start gap-2 border border-[var(--border-subtle)] leading-relaxed">
                                  <span className="w-4 h-4 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {analysisResult.understanding_a.key_entities_or_roles?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1 mb-1.5">
                                <Users size={12} /> Key Stakeholders & Entities:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.understanding_a.key_entities_or_roles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[11px] font-medium border border-[var(--border-subtle)]">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* DOC B PROFILE */}
                  {(understandingSubTab === 'both' || understandingSubTab === 'doc_b') && (
                    <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                            Document 2 Breakdown
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
                            {analysisResult.doc_b.filename}
                          </h3>
                        </div>
                        {analysisResult.understanding_b && (
                          <span className="px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-[10px] font-bold">
                            {analysisResult.understanding_b.document_type}
                          </span>
                        )}
                      </div>

                      {analysisResult.understanding_b && (
                        <>
                          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                              <Target size={14} className="text-[var(--accent)]" />
                              Primary Purpose / Core Mandate
                            </div>
                            <div className="text-[var(--text-secondary)] leading-relaxed font-medium">
                              {analysisResult.understanding_b.core_purpose}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                              <Info size={14} className="text-[var(--accent)]" />
                              Executive Summary & Core Intent:
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                              {analysisResult.understanding_b.executive_summary}
                            </p>
                          </div>

                          {analysisResult.understanding_b.detailed_explanation && (
                            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                                <BookOpen size={14} className="text-[var(--accent)]" />
                                Operational Workflow & Procedural Execution:
                              </div>
                              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {analysisResult.understanding_b.detailed_explanation}
                              </p>
                            </div>
                          )}

                          {analysisResult.understanding_b.scope_and_applicability && (
                            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1.5">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Scope, Boundaries & Policy Rules:
                              </div>
                              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                                {analysisResult.understanding_b.scope_and_applicability}
                              </p>
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Key Points & Operating Rules:
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {analysisResult.understanding_b.key_takeaways.map((point, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)] flex items-start gap-2 border border-[var(--border-subtle)] leading-relaxed">
                                  <span className="w-4 h-4 rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {analysisResult.understanding_b.key_entities_or_roles?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1 mb-1.5">
                                <Users size={12} /> Key Stakeholders & Entities:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.understanding_b.key_entities_or_roles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[11px] font-medium border border-[var(--border-subtle)]">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TOPIC-BY-TOPIC COMPARISON MATRIX */}
            {activeTab === 'matrix' && (
              <div className="flex flex-col gap-4">
                {/* Search Bar & Filter Pills Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
                  {/* Search Bar */}
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={topicSearchQuery}
                      onChange={(e) => setTopicSearchQuery(e.target.value)}
                      placeholder="Search topics, clauses, or operational impacts..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    {topicSearchQuery && (
                      <button
                        onClick={() => setTopicSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setTopicFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        topicFilter === 'all'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      All ({analysisResult.comparison_matrix.length})
                    </button>
                    <button
                      onClick={() => setTopicFilter('aligned')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        topicFilter === 'aligned'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-emerald-500 border border-[var(--border-subtle)]'
                      }`}
                    >
                      ✓ Harmonized
                    </button>
                    <button
                      onClick={() => setTopicFilter('conflict')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        topicFilter === 'conflict'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-rose-500 border border-[var(--border-subtle)]'
                      }`}
                    >
                      ⚠️ Conflicts
                    </button>
                    <button
                      onClick={() => setTopicFilter('stricter')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        topicFilter === 'stricter'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--accent)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      ⚡ Stricter Limits
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {analysisResult.comparison_matrix
                    .filter((row) => {
                      if (topicFilter === 'conflict') return row.status === 'conflict';
                      if (topicFilter === 'aligned') return row.status === 'aligned';
                      if (topicFilter === 'stricter') return row.status === 'stricter';
                      if (topicFilter === 'exclusive') return row.status === 'doc_a_only' || row.status === 'doc_b_only';
                      return true;
                    })
                    .filter((row) => {
                      if (!topicSearchQuery.trim()) return true;
                      const q = topicSearchQuery.toLowerCase();
                      return (
                        row.topic.toLowerCase().includes(q) ||
                        row.doc_a_stance.toLowerCase().includes(q) ||
                        row.doc_b_stance.toLowerCase().includes(q) ||
                        row.verdict.toLowerCase().includes(q) ||
                        (row.practical_implication && row.practical_implication.toLowerCase().includes(q))
                      );
                    })
                    .map((row, idx) => {
                    const isConflict = row.status === 'conflict';
                    const isAligned = row.status === 'aligned';
                    const isStricter = row.status === 'stricter';

                    return (
                      <div
                        key={row.id || idx}
                        className={`p-4 rounded-xl border bg-[var(--bg-surface)] shadow-xs transition-all ${
                          isConflict
                            ? 'border-rose-500/40 bg-rose-500/5'
                            : isStricter
                            ? 'border-[var(--accent)]/40 bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]'
                            : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        {/* Topic Header & Verdict Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)] font-bold text-[11px] flex items-center justify-center border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] shrink-0">
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] block">
                                Document Topic
                              </span>
                              <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)] leading-tight">
                                {row.topic}
                              </h4>
                            </div>
                          </div>
                          <span
                            className={`self-start sm:self-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isConflict
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                : isAligned
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isStricter
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]'
                            }`}
                          >
                            {row.status === 'aligned' ? '✓ Harmonized' : row.status === 'conflict' ? '⚠️ Conflict' : row.status === 'stricter' ? '⚡ Stricter Limits' : row.status === 'doc_a_only' ? '📌 Exclusive to Doc 1' : row.status === 'doc_b_only' ? '📌 Exclusive to Doc 2' : row.status}
                          </span>
                        </div>

                        {/* Dual Document Topic Summaries */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                          {/* Doc 1 Summary on this Topic */}
                          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs flex flex-col gap-2 shadow-xs">
                            <div className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-subtle)]">
                              <FileText size={13} className="shrink-0" />
                              <span className="truncate">{analysisResult.doc_a.filename}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] font-semibold uppercase ml-auto">Topic Summary</span>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-medium text-xs">
                              {row.doc_a_stance}
                            </p>
                          </div>

                          {/* Doc 2 Summary on this Topic */}
                          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs flex flex-col gap-2 shadow-xs">
                            <div className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-subtle)]">
                              <FileText size={13} className="shrink-0" />
                              <span className="truncate">{analysisResult.doc_b.filename}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] font-semibold uppercase ml-auto">Topic Summary</span>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-medium text-xs">
                              {row.doc_b_stance}
                            </p>
                          </div>
                        </div>

                        {/* Practical Implication & Operational Risk */}
                        {row.practical_implication && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs mb-2.5">
                            <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                              <AlertTriangle size={13} />
                              Practical Operational Impact & Real-World Risk:
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed font-normal whitespace-pre-line">
                              {row.practical_implication}
                            </p>
                          </div>
                        )}

                        {/* Precedence & Harmonization Guidance */}
                        {row.guidance && (
                          <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-xs mb-2.5">
                            <div className="text-[10px] font-bold uppercase text-[var(--accent)] mb-1 flex items-center gap-1.5">
                              <Sparkles size={13} />
                              Compliance & Precedence Guidance:
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed font-normal whitespace-pre-line">
                              {row.guidance}
                            </p>
                          </div>
                        )}

                        {/* Verdict Footer */}
                        <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs flex items-start gap-2 shadow-xs">
                          <span className="font-bold text-[var(--text-primary)] shrink-0 flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-[var(--accent)]" /> bbot Analytical Verdict:
                          </span>
                          <span className="text-[var(--text-secondary)] leading-relaxed font-medium">{row.verdict}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CONFLICTS & DISCREPANCIES WITH ONE-CLICK AI HARMONIZE */}
            {activeTab === 'conflicts' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={15} />
                    High-Priority Discrepancies & Divergences
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {analysisResult.discrepancies.length} identified
                  </span>
                </div>

                {analysisResult.discrepancies.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
                    <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-bold text-[var(--text-primary)] text-sm">Koi Critical Conflict Nahi Mila!</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Dono documents ke rules aur clauses me standard alignment hai.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {analysisResult.discrepancies.map((disc, idx) => {
                      const harmonized = harmonizedMap[disc.id];

                      return (
                        <div
                          key={disc.id || idx}
                          className="p-5 rounded-2xl border border-rose-500/30 bg-[var(--bg-surface)] shadow-xs flex flex-col gap-3.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              {disc.topic}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  disc.severity === 'high'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                                    : 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]'
                                }`}
                              >
                                {disc.severity} Risk
                              </span>

                              {/* ASK COPILOT BUTTON */}
                              <button
                                onClick={() => {
                                  setActiveTab('copilot');
                                  setCopilotQuery(`Explain the conflict in "${disc.topic}": Doc 1 states "${disc.doc_a_clause}" whereas Doc 2 states "${disc.doc_b_clause}". How should our organization reconcile this operational difference?`);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="Ask Copilot about this conflict"
                              >
                                <MessageSquare size={12} className="text-[var(--accent)]" />
                                <span>Ask Copilot</span>
                              </button>

                              {/* ONE-CLICK HARMONIZE BUTTON */}
                              <button
                                onClick={() => handleHarmonizeClause(disc)}
                                disabled={harmonized?.loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                title="Draft an AI-unified compromise clause"
                              >
                                {harmonized?.loading ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Sparkles size={12} />
                                )}
                                <span>{harmonized?.clause ? 'Re-Harmonize' : 'Harmonize Clause'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Direct Quotes Comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                                {analysisResult.doc_a.filename} Statement:
                              </div>
                              <div className="text-[var(--text-primary)] italic font-mono text-[11px]">
                                "{disc.doc_a_clause}"
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
                              <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                                {analysisResult.doc_b.filename} Statement:
                              </div>
                              <div className="text-[var(--text-primary)] italic font-mono text-[11px]">
                                "{disc.doc_b_clause}"
                              </div>
                            </div>
                          </div>

                          {/* Operational Risk & Suggested Action */}
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs flex flex-col gap-1.5">
                            <div>
                              <span className="font-bold text-rose-600 dark:text-rose-400">Operational Risk: </span>
                              <span className="text-[var(--text-secondary)]">{disc.conflict_detail}</span>
                            </div>
                            <div>
                              <span className="font-bold text-[var(--accent)]">Suggested Action: </span>
                              <span className="text-[var(--text-secondary)]">{disc.suggested_action}</span>
                            </div>
                          </div>

                          {/* HARMONIZED REPLACEMENT CLAUSE DISPLAY */}
                          {harmonized?.clause && (
                            <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-xs flex flex-col gap-2 animate-in fade-in">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[var(--accent)] flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                                  <Sparkles size={13} /> AI Harmonized Replacement Clause:
                                </span>
                                <button
                                  onClick={() => handleCopyText(harmonized.clause, disc.id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)] cursor-pointer transition-colors"
                                  title="Copy to clipboard"
                                >
                                  {copiedId === disc.id ? (
                                    <>
                                      <Check size={11} className="text-emerald-500" />
                                      <span className="text-emerald-500">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>Copy Clause</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] leading-relaxed">
                                {harmonized.clause}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] italic">
                                Rationale: {harmonized.rationale}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SIDE-BY-SIDE READER & REDLINE DIFF WITH SYNCHRONIZED SEARCH & SMART CLAUSE CARDS */}
            {activeTab === 'reader' && (
              <div className="flex flex-col gap-3">
                {/* Search Bar, Filter Pills & Mode Toggle Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
                  {/* Search Query */}
                  <div className="relative flex-1 w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={readerSearchQuery}
                      onChange={(e) => setReaderSearchQuery(e.target.value)}
                      placeholder="Search keywords, rules, or SLAs across both documents (e.g. 7 days, approval, termination)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    {readerSearchQuery && (
                      <button
                        onClick={() => setReaderSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setReaderFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        readerFilter === 'all'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      All Clauses ({analysisResult.sections_a.length})
                    </button>
                    <button
                      onClick={() => setReaderFilter('metrics')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        readerFilter === 'metrics'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      Rules & Metrics
                    </button>
                    <button
                      onClick={() => setReaderFilter('linked')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        readerFilter === 'linked'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      Linked Counterparts
                    </button>
                  </div>

                  {/* Mode Toggle: Split View vs Redline Diff */}
                  <div className="inline-flex p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-semibold shrink-0">
                    <button
                      onClick={() => setReaderMode('split')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        readerMode === 'split' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <SplitSquareVertical size={13} />
                      <span>Smart Split Reader</span>
                    </button>
                    <button
                      onClick={() => setReaderMode('redline')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        readerMode === 'redline' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Diff size={13} />
                      <span>Clause Redline Diff</span>
                    </button>
                  </div>
                </div>

                {/* Reader Content */}
                {readerMode === 'split' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[720px]">
                    {/* DOC A PANE */}
                    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col overflow-hidden shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0" />
                          <span className="text-xs font-bold text-[var(--accent)] truncate">
                            Doc 1: {analysisResult.doc_a.filename}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {analysisResult.sections_a.length} Clauses (Click to Cross-Link)
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {analysisResult.sections_a
                          .filter((sec) => {
                            if (readerSearchQuery.trim()) {
                              const q = readerSearchQuery.toLowerCase();
                              const match =
                                sec.heading.toLowerCase().includes(q) ||
                                sec.content.toLowerCase().includes(q) ||
                                (sec.summary && sec.summary.toLowerCase().includes(q)) ||
                                (sec.key_points && sec.key_points.some((kp) => kp.toLowerCase().includes(q)));
                              if (!match) return false;
                            }
                            if (readerFilter === 'metrics') return sec.key_points && sec.key_points.length > 0;
                            if (readerFilter === 'linked') return Boolean(sec.matched_heading);
                            return true;
                          })
                          .map((sec, idx) => {
                            const isSelected = selectedSectionAId === sec.id;
                            const isExpanded = Boolean(expandedSections[sec.id]);

                            return (
                              <div
                                key={sec.id}
                                ref={(el) => {
                                  sectionRefsA.current[sec.id] = el;
                                }}
                                onClick={() => handleSelectSectionA(sec.id)}
                                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-2.5 ${
                                  isSelected
                                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] ring-1 ring-[var(--accent)] shadow-xs'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 hover:border-[var(--accent)]/50'
                                }`}
                              >
                                {/* Header: Section Number, Title & Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)] font-bold text-[10px] flex items-center justify-center shrink-0">
                                      §{idx + 1}
                                    </span>
                                    <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                                      {sec.heading}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {sec.alignment_status && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                          sec.alignment_status === 'conflict' || sec.alignment_status === 'contradiction'
                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        }`}
                                      >
                                        {sec.alignment_status}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white uppercase tracking-wider">
                                        Active Link
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 💡 Informative Mandate / Scope Banner */}
                                {sec.summary && (
                                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)] font-medium leading-relaxed flex items-start gap-2 shadow-xs">
                                    <Sparkles size={13} className="text-[var(--accent)] shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <span className="font-bold text-[var(--accent)] block text-[10px] uppercase tracking-wider mb-0.5">
                                        Clause Scope & Purpose:
                                      </span>
                                      <span>{sec.summary}</span>
                                    </div>
                                  </div>
                                )}

                                {/* 🏷️ Extracted Operational Metrics & Governance Chips */}
                                {sec.key_points && sec.key_points.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {sec.key_points.map((pt, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[10px] font-semibold flex items-center gap-1"
                                      >
                                        {pt}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* ↔ Cross-Doc Counterpart Correlation Link */}
                                {sec.matched_heading && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sec.matched_section_id) handleJumpToSectionB(sec.matched_section_id);
                                    }}
                                    className="p-2 px-2.5 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-[11px] text-[var(--accent)] font-semibold flex items-center justify-between cursor-pointer transition-colors"
                                    title="Click to jump to this matching clause in Doc 2"
                                  >
                                    <span className="truncate flex items-center gap-1.5">
                                      <GitCompare size={13} className="shrink-0" />
                                      <span className="truncate">Matches in Doc 2: <strong>{sec.matched_heading}</strong></span>
                                    </span>
                                    <span className="text-[10px] underline flex items-center gap-0.5 shrink-0 font-bold ml-2">
                                      Jump <ArrowRight size={10} />
                                    </span>
                                  </div>
                                )}

                                {/* Formatted Clause Text with Expand/Collapse */}
                                <div
                                  className={`text-[var(--text-secondary)] leading-relaxed text-xs transition-all ${
                                    isExpanded ? 'whitespace-pre-line' : 'line-clamp-4'
                                  }`}
                                >
                                  {renderHighlightedContent(sec.content, readerSearchQuery)}
                                </div>

                                {/* Action Bar Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSectionExpand(sec.id);
                                    }}
                                    className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp size={12} /> <span>Collapse</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown size={12} /> <span>Read Full Clause</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(sec.content, sec.id);
                                      }}
                                      className="px-2 py-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Copy clause text"
                                    >
                                      {copiedId === sec.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                      <span>{copiedId === sec.id ? 'Copied' : 'Copy'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAskAboutSection(sec, 'Doc 1');
                                      }}
                                      className="px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_24%,transparent)] text-[var(--accent)] font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                      title="Ask Copilot about this clause"
                                    >
                                      <MessageSquare size={11} />
                                      <span>Ask AI</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* DOC B PANE */}
                    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col overflow-hidden shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-[var(--accent)] truncate">
                            Doc 2: {analysisResult.doc_b.filename}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {analysisResult.sections_b.length} Clauses (Click to Cross-Link)
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {analysisResult.sections_b
                          .filter((sec) => {
                            if (readerSearchQuery.trim()) {
                              const q = readerSearchQuery.toLowerCase();
                              const match =
                                sec.heading.toLowerCase().includes(q) ||
                                sec.content.toLowerCase().includes(q) ||
                                (sec.summary && sec.summary.toLowerCase().includes(q)) ||
                                (sec.key_points && sec.key_points.some((kp) => kp.toLowerCase().includes(q)));
                              if (!match) return false;
                            }
                            if (readerFilter === 'metrics') return sec.key_points && sec.key_points.length > 0;
                            if (readerFilter === 'linked') return Boolean(sec.matched_heading);
                            return true;
                          })
                          .map((sec, idx) => {
                            const isSelected = selectedSectionBId === sec.id;
                            const isExpanded = Boolean(expandedSections[sec.id]);

                            return (
                              <div
                                key={sec.id}
                                ref={(el) => {
                                  sectionRefsB.current[sec.id] = el;
                                }}
                                onClick={() => handleSelectSectionB(sec.id)}
                                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-2.5 ${
                                  isSelected
                                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] ring-1 ring-[var(--accent)] shadow-xs'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 hover:border-[var(--accent)]/50'
                                }`}
                              >
                                {/* Header: Section Number, Title & Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)] font-bold text-[10px] flex items-center justify-center shrink-0">
                                      §{idx + 1}
                                    </span>
                                    <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                                      {sec.heading}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {sec.alignment_status && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                          sec.alignment_status === 'conflict' || sec.alignment_status === 'contradiction'
                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        }`}
                                      >
                                        {sec.alignment_status}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white uppercase tracking-wider">
                                        Synchronized
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 💡 Informative Mandate / Scope Banner */}
                                {sec.summary && (
                                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)] font-medium leading-relaxed flex items-start gap-2 shadow-xs">
                                    <Sparkles size={13} className="text-[var(--accent)] shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <span className="font-bold text-[var(--accent)] block text-[10px] uppercase tracking-wider mb-0.5">
                                        Clause Scope & Purpose:
                                      </span>
                                      <span>{sec.summary}</span>
                                    </div>
                                  </div>
                                )}

                                {/* 🏷️ Extracted Operational Metrics & Governance Chips */}
                                {sec.key_points && sec.key_points.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {sec.key_points.map((pt, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[10px] font-semibold flex items-center gap-1"
                                      >
                                        {pt}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* ↔ Cross-Doc Counterpart Correlation Link */}
                                {sec.matched_heading && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sec.matched_section_id) handleJumpToSectionA(sec.matched_section_id);
                                    }}
                                    className="p-2 px-2.5 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] text-[11px] text-[var(--accent)] font-semibold flex items-center justify-between cursor-pointer transition-colors"
                                    title="Click to jump to this matching clause in Doc 1"
                                  >
                                    <span className="truncate flex items-center gap-1.5">
                                      <GitCompare size={13} className="shrink-0" />
                                      <span className="truncate">Matches in Doc 1: <strong>{sec.matched_heading}</strong></span>
                                    </span>
                                    <span className="text-[10px] underline flex items-center gap-0.5 shrink-0 font-bold ml-2">
                                      Jump <ArrowRight size={10} />
                                    </span>
                                  </div>
                                )}

                                {/* Formatted Clause Text with Expand/Collapse */}
                                <div
                                  className={`text-[var(--text-secondary)] leading-relaxed text-xs transition-all ${
                                    isExpanded ? 'whitespace-pre-line' : 'line-clamp-4'
                                  }`}
                                >
                                  {renderHighlightedContent(sec.content, readerSearchQuery)}
                                </div>

                                {/* Action Bar Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSectionExpand(sec.id);
                                    }}
                                    className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp size={12} /> <span>Collapse</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown size={12} /> <span>Read Full Clause</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(sec.content, sec.id);
                                      }}
                                      className="px-2 py-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Copy clause text"
                                    >
                                      {copiedId === sec.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                      <span>{copiedId === sec.id ? 'Copied' : 'Copy'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAskAboutSection(sec, 'Doc 2');
                                      }}
                                      className="px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_24%,transparent)] text-[var(--accent)] font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                      title="Ask Copilot about this clause"
                                    >
                                      <MessageSquare size={11} />
                                      <span>Ask AI</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* REDLINE VISUAL DIFF MODE */
                  <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] h-[720px] overflow-y-auto flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Diff size={14} className="text-[var(--accent)]" />
                          Clause-by-Clause Semantic & Redline Diff
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Side-by-side textual evolution from {analysisResult.doc_a.filename} to {analysisResult.doc_b.filename}.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-semibold">
                        <span className="text-rose-500 line-through bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          - Removed from Doc 1
                        </span>
                        <span className="text-emerald-500 underline bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          + Added in Doc 2
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {analysisResult.sections_a.map((secA, idx) => {
                        const secB = secA.matched_section_id
                          ? analysisResult.sections_b.find((s) => s.id === secA.matched_section_id) || analysisResult.sections_b[idx]
                          : analysisResult.sections_b[idx] || analysisResult.sections_b[0];
                        const diff = computeWordDiff(secA.content, secB?.content || '');

                        return (
                          <div
                            key={secA.id}
                            className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs flex flex-col gap-3 shadow-xs"
                          >
                            <div className="font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 rounded-md bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                {secA.heading}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] font-normal">
                                Compared against: <strong className="text-[var(--text-primary)]">{secB?.heading}</strong>
                              </span>
                            </div>

                            <div className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                              {diff.map((part, pIdx) => {
                                if (part.type === 'removed') {
                                  return (
                                    <span
                                      key={pIdx}
                                      className="bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through decoration-rose-500 px-0.5 rounded"
                                    >
                                      {part.text}
                                    </span>
                                  );
                                }
                                if (part.type === 'added') {
                                  return (
                                    <span
                                      key={pIdx}
                                      className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold underline decoration-emerald-500 px-0.5 rounded"
                                    >
                                      {part.text}
                                    </span>
                                  );
                                }
                                return <span key={pIdx} className="text-[var(--text-secondary)]">{part.text}</span>;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ASK AI COPILOT */}
            {activeTab === 'copilot' && (
              <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col h-[600px] print:hidden">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Sparkles size={16} className="text-[var(--accent)]" />
                      bbot Cross-Document Copilot
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Query both documents concurrently to resolve ambiguities and verify compliance.
                    </p>
                  </div>
                </div>

                {/* Quick Prompts Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => handleSendCopilotQuery(`Explain ${analysisResult.doc_a.filename} in simple words`)}
                    className="px-2.5 py-1 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    💡 Explain Doc 1 in simple words
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery(`Explain ${analysisResult.doc_b.filename} in simple words`)}
                    className="px-2.5 py-1 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    💡 Explain Doc 2 in simple words
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery('What are the top 3 contradictory rules between both documents?')}
                    className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium border border-rose-500/30 cursor-pointer transition-colors"
                  >
                    ⚠️ Top 3 contradictory rules
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery('Which document is stricter on authorization limits and approvals?')}
                    className="px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--accent)] text-[11px] font-medium border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] cursor-pointer transition-colors"
                  >
                    ⚖️ Which document is stricter?
                  </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {copilotChat.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'ml-auto bg-[var(--accent)] text-white font-medium rounded-br-xs'
                          : 'bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-bl-xs border border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {msg.verdict && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--accent)]">
                          Verdict: {msg.verdict}
                        </div>
                      )}
                    </div>
                  ))}
                  {isCopilotLoading && (
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] flex items-center gap-2 w-fit border border-[var(--border-subtle)]">
                      <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                      Synthesizing comparative answer...
                    </div>
                  )}
                </div>

                {/* Input Field */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendCopilotQuery();
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]"
                >
                  <input
                    type="text"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Ask anything comparing both documents..."
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    disabled={isCopilotLoading || !copilotQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            )}
          </section>
        )}

        {/* Floating Toast Feedback Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[var(--bg-surface)] border border-[var(--accent)] text-[var(--text-primary)] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
