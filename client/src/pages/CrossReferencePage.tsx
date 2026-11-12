import { useState, useEffect } from 'react';
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
}

interface DocumentSection {
  id: string;
  doc_id: string;
  doc_title: string;
  heading: string;
  content: string;
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

  // Interactive filters
  const [selectedSectionAId, setSelectedSectionAId] = useState<string | null>(null);
  const [selectedSectionBId, setSelectedSectionBId] = useState<string | null>(null);

  // Copilot state
  const [copilotQuery, setCopilotQuery] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotChat, setCopilotChat] = useState<Array<{ role: 'user' | 'assistant'; text: string; verdict?: string }>>([
    {
      role: 'assistant',
      text: 'Namaste! Main aapka Cross-Document Intelligence Copilot hoon. Dono documents upload ya select karein aur main kisi bhi clause, difference, policy limit ya summary ka instant answer dunga.',
    },
  ]);

  // Load available documents list on mount
  useEffect(() => {
    loadDocuments();
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

      // Add to docs list
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis run karne me problem aayi.');
    } finally {
      setIsAnalyzing(false);
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

  const getDocName = (id: string, fallback: string) => {
    const d = documents.find(doc => doc.id === id);
    return d ? d.filename : fallback;
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
      return <FileSpreadsheet className="text-emerald-500 shrink-0" size={18} />;
    }
    if (lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.md')) {
      return <FileCode className="text-indigo-500 shrink-0" size={18} />;
    }
    return <FileText className="text-blue-500 shrink-0" size={18} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-medium transition-colors"
            >
              <span>← Chat</span>
            </Link>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <GitCompare size={18} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Cross-Document Intelligence Portal
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                    Smart Audit
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Upload any documents to understand their essence, compare clauses side-by-side, and identify discrepancies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/studio"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              Visual Studio
            </Link>
            {analysisResult && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExport('markdown')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download size={13} />
                  <span>Report (MD)</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors"
                  title="Export raw JSON"
                >
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded">
              <X size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: Two Simple Upload & Select Boxes */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                Upload or Select Two Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Supports PDF, Word (DOCX), Excel (XLSX, CSV), Markdown, TXT, PPTX & JSON files.
              </p>
            </div>
            <button
              onClick={loadDocuments}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              title="Refresh list"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DOCUMENT 1 (A) */}
            <div className={`p-4 rounded-xl border-2 transition-all ${docAId ? 'border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/10' : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <FileText size={14} />
                  Document 1 (Primary / Baseline)
                </span>
                {docAId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Ready
                  </span>
                )}
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
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {isUploadingA ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-teal-600" />
                      <span>Extracting & Understanding Document 1...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} className="text-teal-600 dark:text-teal-400" />
                      <span>Drag & Drop or Click to Upload File</span>
                    </>
                  )}
                </div>
              </label>

              {/* Or Select from Existing dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Or Select:</span>
                <select
                  value={docAId}
                  onChange={(e) => setDocAId(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Choose Document 1 --</option>
                  {documents.map((d) => (
                    <option key={`docA-${d.id}`} value={d.id}>
                      {d.filename} ({d.page_count} pgs, {(d.size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected File Badge */}
              {docAId && (
                <div className="mt-2.5 p-2 rounded-lg bg-teal-100/40 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(getDocName(docAId, 'Doc 1'))}
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {getDocName(docAId, 'Document 1')}
                    </span>
                  </div>
                  {understandingA && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-200/50 dark:bg-teal-800/40 text-teal-800 dark:text-teal-300 font-medium shrink-0">
                      {understandingA.document_type}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* DOCUMENT 2 (B) */}
            <div className={`p-4 rounded-xl border-2 transition-all ${docBId ? 'border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <FileText size={14} />
                  Document 2 (Comparison / Target)
                </span>
                {docBId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Ready
                  </span>
                )}
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
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {isUploadingB ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-indigo-600" />
                      <span>Extracting & Understanding Document 2...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Drag & Drop or Click to Upload File</span>
                    </>
                  )}
                </div>
              </label>

              {/* Or Select from Existing dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Or Select:</span>
                <select
                  value={docBId}
                  onChange={(e) => setDocBId(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Document 2 --</option>
                  {documents.map((d) => (
                    <option key={`docB-${d.id}`} value={d.id}>
                      {d.filename} ({d.page_count} pgs, {(d.size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected File Badge */}
              {docBId && (
                <div className="mt-2.5 p-2 rounded-lg bg-indigo-100/40 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(getDocName(docBId, 'Doc 2'))}
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {getDocName(docBId, 'Document 2')}
                    </span>
                  </div>
                  {understandingB && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-200/50 dark:bg-indigo-800/40 text-indigo-800 dark:text-indigo-300 font-medium shrink-0">
                      {understandingB.document_type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Big Action Button */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {docAId && docBId ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Dono documents ready hain. Click karein to begin intelligent cross-referencing.
                </span>
              ) : (
                <span>Dono documents upload ya select karein comparative analysis ke liye.</span>
              )}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !docAId || !docBId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Cross-Auditing Documents...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>⚡ Compare & Understand Documents</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* STEP 2: Results Section with Clean 5 Tabs */}
        {analysisResult && (
          <section className="flex flex-col gap-5">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                  {analysisResult.summary.alignment_score}%
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Alignment Match</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {analysisResult.summary.alignment_score >= 80 ? 'High Harmony' : 'Moderate Divergence'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  {analysisResult.summary.agreed_count}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Consistent Clauses</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Aligned Points</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 flex items-center justify-center font-bold text-sm">
                  {analysisResult.discrepancies.length}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Conflicts & Gaps</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Action Required</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                  {analysisResult.comparison_matrix.length || analysisResult.links.length}
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Topics Analyzed</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Cross-Audit Points</div>
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('understanding')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'understanding'
                    ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <BookOpen size={14} />
                <span>📑 Document Understanding</span>
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'matrix'
                    ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>⚖️ Topic-by-Topic Comparison</span>
              </button>

              <button
                onClick={() => setActiveTab('conflicts')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'conflicts'
                    ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <AlertTriangle size={14} />
                <span>🚨 Conflicts & Gaps ({analysisResult.discrepancies.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reader')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'reader'
                    ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <SplitSquareVertical size={14} />
                <span>📖 Side-by-Side Reader</span>
              </button>

              <button
                onClick={() => setActiveTab('copilot')}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'copilot'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-teal-500/30 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider mb-2">
                    <Sparkles size={15} /> Executive Cross-Audit Verdict
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {analysisResult.summary.executive_summary}
                  </p>
                </div>

                {/* Sub-selector: View Both, Doc 1 only, or Doc 2 only */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setUnderstandingSubTab('both')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${understandingSubTab === 'both' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    >
                      Compare Both Summaries
                    </button>
                    <button
                      onClick={() => setUnderstandingSubTab('doc_a')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${understandingSubTab === 'doc_a' ? 'bg-white dark:bg-slate-700 shadow-xs text-teal-700 dark:text-teal-300' : 'text-slate-500'}`}
                    >
                      Doc 1: {analysisResult.doc_a.filename}
                    </button>
                    <button
                      onClick={() => setUnderstandingSubTab('doc_b')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${understandingSubTab === 'doc_b' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}
                    >
                      Doc 2: {analysisResult.doc_b.filename}
                    </button>
                  </div>
                </div>

                {/* Document Profiles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* DOC A PROFILE */}
                  {(understandingSubTab === 'both' || understandingSubTab === 'doc_a') && (
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/30 shadow-xs flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                            Document 1 Breakdown
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                            {analysisResult.doc_a.filename}
                          </h3>
                        </div>
                        {analysisResult.understanding_a && (
                          <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 text-[10px] font-bold">
                            {analysisResult.understanding_a.document_type}
                          </span>
                        )}
                      </div>

                      {analysisResult.understanding_a && (
                        <>
                          {/* Core Purpose */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                              <Target size={13} className="text-teal-600 dark:text-teal-400" />
                              Primary Purpose / Goal
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              {analysisResult.understanding_a.core_purpose}
                            </div>
                          </div>

                          {/* Executive Summary */}
                          <div className="text-xs">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                              <Info size={13} className="text-teal-600" />
                              What this document is about (Summary):
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analysisResult.understanding_a.executive_summary}
                            </p>
                          </div>

                          {/* Key Takeaways & Rules */}
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Key Points & Operating Rules:
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {analysisResult.understanding_a.key_takeaways.map((point, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 border border-teal-100 dark:border-teal-900/30">
                                  <span className="w-4 h-4 rounded-full bg-teal-200 text-teal-800 dark:bg-teal-800 dark:text-teal-200 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Roles & Entities */}
                          {analysisResult.understanding_a.key_entities_or_roles?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                                <Users size={12} /> Key Stakeholders & Entities:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.understanding_a.key_entities_or_roles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
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
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 shadow-xs flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                            Document 2 Breakdown
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                            {analysisResult.doc_b.filename}
                          </h3>
                        </div>
                        {analysisResult.understanding_b && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px] font-bold">
                            {analysisResult.understanding_b.document_type}
                          </span>
                        )}
                      </div>

                      {analysisResult.understanding_b && (
                        <>
                          {/* Core Purpose */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                              <Target size={13} className="text-indigo-600 dark:text-indigo-400" />
                              Primary Purpose / Goal
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              {analysisResult.understanding_b.core_purpose}
                            </div>
                          </div>

                          {/* Executive Summary */}
                          <div className="text-xs">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                              <Info size={13} className="text-indigo-600" />
                              What this document is about (Summary):
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analysisResult.understanding_b.executive_summary}
                            </p>
                          </div>

                          {/* Key Takeaways & Rules */}
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Key Points & Operating Rules:
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {analysisResult.understanding_b.key_takeaways.map((point, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 border border-indigo-100 dark:border-indigo-900/30">
                                  <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span>{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Roles & Entities */}
                          {analysisResult.understanding_b.key_entities_or_roles?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                                <Users size={12} /> Key Stakeholders & Entities:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.understanding_b.key_entities_or_roles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
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
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Clause-by-Clause & Topic Comparison Matrix ({analysisResult.comparison_matrix.length} Topics)
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {analysisResult.comparison_matrix.map((row, idx) => {
                    const isConflict = row.status === 'conflict';
                    const isAligned = row.status === 'aligned';
                    const isStricter = row.status === 'stricter';

                    return (
                      <div
                        key={row.id || idx}
                        className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-xs transition-all ${
                          isConflict
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/10'
                            : isStricter
                            ? 'border-amber-300 dark:border-amber-900/60'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Topic Header & Verdict Badge */}
                        <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {row.topic}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isConflict
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                : isAligned
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>

                        {/* Stance Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="p-3 rounded-lg bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 text-xs">
                            <div className="text-[10px] font-bold uppercase text-teal-800 dark:text-teal-300 mb-1">
                              {analysisResult.doc_a.filename} Stance:
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {row.doc_a_stance}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 text-xs">
                            <div className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 mb-1">
                              {analysisResult.doc_b.filename} Stance:
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {row.doc_b_stance}
                            </div>
                          </div>
                        </div>

                        {/* Verdict Footer */}
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs flex items-start gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">AI Verdict:</span>
                          <span className="text-slate-600 dark:text-slate-300">{row.verdict}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CONFLICTS & DISCREPANCIES */}
            {activeTab === 'conflicts' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={15} />
                    High-Priority Discrepancies & Divergences
                  </h3>
                  <span className="text-xs text-slate-500">
                    {analysisResult.discrepancies.length} identified
                  </span>
                </div>

                {analysisResult.discrepancies.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Koi Critical Conflict Nahi Mila!</h4>
                    <p className="text-xs text-slate-500 mt-1">Dono documents ke rules aur clauses me standard alignment hai.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {analysisResult.discrepancies.map((disc, idx) => (
                      <div
                        key={disc.id || idx}
                        className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {disc.topic}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              disc.severity === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}
                          >
                            {disc.severity} Risk
                          </span>
                        </div>

                        {/* Direct Quotes Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                              {analysisResult.doc_a.filename} Statement:
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 italic font-mono text-[11px]">
                              "{disc.doc_a_clause}"
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                              {analysisResult.doc_b.filename} Statement:
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 italic font-mono text-[11px]">
                              "{disc.doc_b_clause}"
                            </div>
                          </div>
                        </div>

                        {/* Conflict Detail & Action */}
                        <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 text-xs flex flex-col gap-1.5">
                          <div>
                            <span className="font-bold text-rose-900 dark:text-rose-300">Operational Risk: </span>
                            <span className="text-slate-700 dark:text-slate-300">{disc.conflict_detail}</span>
                          </div>
                          <div>
                            <span className="font-bold text-teal-900 dark:text-teal-300">Suggested Action: </span>
                            <span className="text-slate-700 dark:text-slate-300">{disc.suggested_action}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SIDE-BY-SIDE READER */}
            {activeTab === 'reader' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[650px]">
                {/* DOC A PANE */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 truncate">
                      Doc 1: {analysisResult.doc_a.filename}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {analysisResult.sections_a.length} Sections
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {analysisResult.sections_a.map((sec) => (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionAId(sec.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedSectionAId === sec.id
                            ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/30 ring-1 ring-teal-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white mb-1">
                          {sec.heading}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DOC B PANE */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 truncate">
                      Doc 2: {analysisResult.doc_b.filename}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {analysisResult.sections_b.length} Sections
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {analysisResult.sections_b.map((sec) => (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionBId(sec.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedSectionBId === sec.id
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white mb-1">
                          {sec.heading}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ASK AI COPILOT */}
            {activeTab === 'copilot' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[600px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      Cross-Document Intelligence Copilot
                    </h3>
                    <p className="text-xs text-slate-500">
                      Query both documents concurrently to resolve ambiguities and verify compliance.
                    </p>
                  </div>
                </div>

                {/* Quick Prompts Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => handleSendCopilotQuery(`Explain ${analysisResult.doc_a.filename} in simple words`)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                  >
                    💡 Explain Doc 1 in simple words
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery(`Explain ${analysisResult.doc_b.filename} in simple words`)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                  >
                    💡 Explain Doc 2 in simple words
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery('What are the top 3 contradictory rules between both documents?')}
                    className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-200 dark:border-rose-900"
                  >
                    ⚠️ Top 3 contradictory rules
                  </button>
                  <button
                    onClick={() => handleSendCopilotQuery('Which document is stricter on authorization limits and approvals?')}
                    className="px-2.5 py-1 rounded-full bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-[11px] font-medium border border-teal-200 dark:border-teal-900"
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
                          ? 'ml-auto bg-teal-600 text-white font-medium rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {msg.verdict && (
                        <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                          Verdict: {msg.verdict}
                        </div>
                      )}
                    </div>
                  ))}
                  {isCopilotLoading && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 flex items-center gap-2 w-fit">
                      <Loader2 size={14} className="animate-spin text-teal-600" />
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
                  className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Ask anything comparing both documents..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={isCopilotLoading || !copilotQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
