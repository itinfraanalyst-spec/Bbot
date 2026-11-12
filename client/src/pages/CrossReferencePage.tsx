import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GitCompare,
  ArrowLeft,
  FileText,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Split,
  Network,
  Table as TableIcon,
  Send,
  X,
  ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';

interface DocumentMeta {
  id: string;
  filename: string;
  size: number;
  page_count: number;
  status: string;
  created_at?: string;
  summary?: string;
}

interface DocumentSection {
  id: string;
  doc_id: string;
  doc_title: string;
  heading: string;
  content: string;
  page_start?: number;
  page_end?: number;
}

interface CrossReferenceLink {
  id: string;
  source_section_id: string;
  target_section_id: string;
  relation: 'aligned' | 'contradiction' | 'reference' | 'gap' | 'supersedes';
  confidence: number;
  summary: string;
  source_quote: string;
  target_quote: string;
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

interface CrossReferenceData {
  doc_a: DocumentMeta;
  doc_b: DocumentMeta;
  sections_a: DocumentSection[];
  sections_b: DocumentSection[];
  links: CrossReferenceLink[];
  discrepancies: DiscrepancyItem[];
  summary: CrossDocSummary;
}

const RELATION_CONFIG = {
  aligned: {
    label: 'Consistent / Aligned',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    badge: 'Consistent',
  },
  contradiction: {
    label: 'Conflict / Discrepancy',
    color: '#ef4444',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
    textColor: 'text-rose-700 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    badge: 'Conflict',
  },
  reference: {
    label: 'Direct Citation',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-500/30',
    badge: 'Citation',
  },
  gap: {
    label: 'Policy Gap / Missing',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    badge: 'Gap',
  },
  supersedes: {
    label: 'Supersedes / Replaces',
    color: '#8b5cf6',
    bgColor: 'bg-violet-500/10 dark:bg-violet-500/20',
    textColor: 'text-violet-700 dark:text-violet-400',
    borderColor: 'border-violet-500/30',
    badge: 'Supersedes',
  },
};

export function CrossReferencePage() {
  // Document selection
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDocA, setSelectedDocA] = useState<string>('');
  const [selectedDocB, setSelectedDocB] = useState<string>('');
  const [mode, setMode] = useState<string>('audit');
  const [focusQuery, setFocusQuery] = useState<string>('');

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<CrossReferenceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: 'graph' | 'split' | 'matrix'
  const [activeTab, setActiveTab] = useState<'graph' | 'split' | 'matrix'>('graph');

  // Interactive selection
  const [selectedLink, setSelectedLink] = useState<CrossReferenceLink | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [activeSectionA, setActiveSectionA] = useState<string | null>(null);
  const [activeSectionB, setActiveSectionB] = useState<string | null>(null);

  // Copilot drawer state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<Array<{ q: string; a: string }>>([]);

  // Fetch available documents on mount
  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch('/api/cross-reference/documents', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const docs: DocumentMeta[] = data.documents || [];
          setDocuments(docs);
          if (docs.length >= 2) {
            setSelectedDocA(docs[0].id);
            setSelectedDocB(docs[1].id);
          } else if (docs.length === 1) {
            setSelectedDocA(docs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load documents for cross-referencing:', err);
      }
    }
    loadDocuments();
  }, []);

  // Run comparative analysis
  const runAnalysis = async () => {
    if (!selectedDocA || !selectedDocB) {
      setError('Please select two distinct documents to cross-reference.');
      return;
    }
    if (selectedDocA === selectedDocB) {
      setError('Document A and Document B must be different.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSelectedLink(null);

    try {
      const res = await fetch('/api/cross-reference/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doc_a_id: selectedDocA,
          doc_b_id: selectedDocB,
          mode,
          focus_query: focusQuery.trim() || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Cross-referencing analysis failed');
      }

      const data: CrossReferenceData = await res.json();
      setAnalysisData(data);
      if (data.links.length > 0) {
        setSelectedLink(data.links[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ask Copilot across documents
  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuestion.trim() || !selectedDocA || !selectedDocB) return;

    const q = copilotQuestion.trim();
    setCopilotQuestion('');
    setIsCopilotLoading(true);

    try {
      const res = await fetch('/api/cross-reference/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doc_a_id: selectedDocA,
          doc_b_id: selectedDocB,
          question: q,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotHistory((prev) => [...prev, { q, a: data.answer }]);
      }
    } catch (err) {
      console.error('Copilot query error:', err);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Export report
  const handleExport = async (format: 'markdown' | 'json') => {
    if (!analysisData) return;
    try {
      const res = await fetch('/api/cross-reference/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format,
          data: analysisData,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cross_reference_audit_${analysisData.doc_a.id.slice(0, 6)}_${analysisData.doc_b.id.slice(0, 6)}.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Lookup maps for fast section finding
  const sectionMapA = useMemo(() => {
    const map = new Map<string, DocumentSection>();
    analysisData?.sections_a.forEach((s) => map.set(s.id, s));
    return map;
  }, [analysisData]);

  const sectionMapB = useMemo(() => {
    const map = new Map<string, DocumentSection>();
    analysisData?.sections_b.forEach((s) => map.set(s.id, s));
    return map;
  }, [analysisData]);

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="h-4 w-px bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <GitCompare size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                Cross-Document Intelligence Portal
                <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  Visual Reference Matrix
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {analysisData && (
            <>
              {/* Tab Toggles */}
              <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('graph')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'graph'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  title="Interactive Visual Link Graph"
                >
                  <Network size={13} />
                  <span className="hidden md:inline">Link Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('split')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'split'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  title="Synchronized Dual Document Reader"
                >
                  <Split size={13} />
                  <span className="hidden md:inline">Dual Reader</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'matrix'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  title="Executive Conflict & Discrepancy Matrix"
                >
                  <TableIcon size={13} />
                  <span className="hidden md:inline">Conflict Matrix</span>
                </button>
              </div>

              {/* Copilot Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                  isCopilotOpen
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                )}
                title="Cross-Doc AI Copilot"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span className="hidden lg:inline">AI Auditor</span>
              </button>

              {/* Export Dropdown */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleExport('markdown')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-semibold transition-all cursor-pointer"
                  title="Export Audit Report as Markdown"
                >
                  <Download size={12} />
                  <span>Report</span>
                </button>
              </div>
            </>
          )}

          <Link
            to="/studio"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 text-xs font-semibold transition-colors shrink-0"
            title="Open Visual Studio"
          >
            <span>Visual Studio</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </header>

      {/* Control Bar: Document Selection & Audit Triggers */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 shrink-0 z-10 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Document A & B Selectors */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
            {/* Doc A */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs">
              <span className="font-bold text-teal-600 dark:text-teal-400">Doc A:</span>
              <select
                value={selectedDocA}
                onChange={(e) => setSelectedDocA(e.target.value)}
                disabled={isAnalyzing}
                className="bg-transparent text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
              >
                <option value="" disabled>Select Document A</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {doc.filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-surface-hover)] text-[var(--text-muted)]">
              <GitCompare size={12} />
            </div>

            {/* Doc B */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs">
              <span className="font-bold text-sky-600 dark:text-sky-400">Doc B:</span>
              <select
                value={selectedDocB}
                onChange={(e) => setSelectedDocB(e.target.value)}
                disabled={isAnalyzing}
                className="bg-transparent text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
              >
                <option value="" disabled>Select Document B</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {doc.filename}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs">
              <SlidersHorizontal size={12} className="text-[var(--text-muted)]" />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={isAnalyzing}
                className="bg-transparent text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
              >
                <option value="audit" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Full Conflict & Audit</option>
                <option value="traceability" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Clause Traceability</option>
                <option value="diff" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Version Revision Diff</option>
              </select>
            </div>

            {/* Topic Filter */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs">
              <input
                type="text"
                placeholder="Filter topic..."
                value={focusQuery}
                onChange={(e) => setFocusQuery(e.target.value)}
                disabled={isAnalyzing}
                className="bg-transparent text-[var(--text-primary)] text-xs focus:outline-none placeholder-[var(--text-muted)] w-28 sm:w-40"
              />
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isAnalyzing || !selectedDocA || !selectedDocB}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Cross-Auditing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Run Cross-Reference</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-400">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-4">
          {!analysisData && !isAnalyzing ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-4 shadow-sm">
                <GitCompare size={32} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Multi-Document Cross-Referencing & Alignment Portal
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
                Compare any two enterprise SOPs, policies, regulatory frameworks, or contracts. Discover hidden policy contradictions, extract clause citations, and view an interactive linkage map connecting specific provisions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left text-xs mb-6">
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <CheckCircle2 size={13} /> Consistent Alignment
                  </div>
                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Identifies clauses with shared standards and mutual compliance.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 mb-1">
                    <ShieldAlert size={13} /> Conflict Detection
                  </div>
                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Flags differing spending limits, approval triggers, or opposing rules.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 mb-1">
                    <Network size={13} /> Visual Graph
                  </div>
                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Interactive diagram visualizing cross-document relationships.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={documents.length < 2}
                className="rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {documents.length < 2 ? 'Upload at least 2 documents in chat' : 'Analyze Current Selection'}
              </button>
            </div>
          ) : isAnalyzing ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-3 animate-pulse">
                <RefreshCw size={24} className="animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                Synthesizing Cross-Document Intelligence...
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">
                Parsing clauses, computing semantic alignment, and verifying operational thresholds between documents.
              </p>
            </div>
          ) : analysisData && (
            <div className="space-y-4">
              {/* Executive Summary Metrics Card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Cross-Doc Audit Overview
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {analysisData.doc_a.filename} <span className="text-[var(--text-muted)] font-normal">vs</span> {analysisData.doc_b.filename}
                    </h3>
                  </div>

                  {/* Score & Counter Badges */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Alignment:</span>
                      <span className={clsx(
                        "text-xs font-bold",
                        analysisData.summary.alignment_score >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {analysisData.summary.alignment_score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={12} />
                      <span>{analysisData.summary.agreed_count} Consistent</span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold">
                      <AlertTriangle size={12} />
                      <span>{analysisData.summary.conflict_count} Conflicts</span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                      <ExternalLink size={12} />
                      <span>{analysisData.summary.reference_count} Citations</span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {analysisData.summary.executive_summary}
                </p>
              </div>

              {/* View 1: Interactive Network Link Graph */}
              {activeTab === 'graph' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Column: Document A Sections */}
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 truncate">
                        {analysisData.doc_a.filename}
                      </span>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">
                        {analysisData.sections_a.length} sections
                      </span>
                    </div>
                    {analysisData.sections_a.map((sec) => {
                      const isHovered = hoveredSectionId === sec.id;
                      const hasActiveLink = selectedLink?.source_section_id === sec.id || activeSectionA === sec.id;
                      return (
                        <div
                          key={sec.id}
                          onMouseEnter={() => setHoveredSectionId(sec.id)}
                          onMouseLeave={() => setHoveredSectionId(null)}
                          onClick={() => {
                            setActiveSectionA(sec.id);
                            // Find primary link
                            const link = analysisData.links.find((l) => l.source_section_id === sec.id);
                            if (link) setSelectedLink(link);
                          }}
                          className={clsx(
                            'p-3 rounded-lg border text-xs cursor-pointer transition-all',
                            hasActiveLink
                              ? 'border-teal-500 bg-teal-500/10 shadow-xs ring-1 ring-teal-500/40'
                              : isHovered
                              ? 'border-[var(--accent)] bg-[var(--bg-surface-hover)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]/80'
                          )}
                        >
                          <div className="font-bold text-[var(--text-primary)] mb-1 leading-snug">
                            {sec.heading}
                          </div>
                          <p className="line-clamp-2 text-[0.7rem] text-[var(--text-muted)]">
                            {sec.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Middle Column: Interactive Links & Inspection Card */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          Cross-Reference Connections ({analysisData.links.length})
                        </span>
                        <span className="text-[0.7rem] text-[var(--text-secondary)]">Click link to inspect</span>
                      </div>

                      {/* Link Badges List */}
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                        {analysisData.links.map((link) => {
                          const isSelected = selectedLink?.id === link.id;
                          const cfg = RELATION_CONFIG[link.relation] || RELATION_CONFIG.aligned;
                          const srcSec = sectionMapA.get(link.source_section_id);
                          const tgtSec = sectionMapB.get(link.target_section_id);

                          return (
                            <button
                              key={link.id}
                              type="button"
                              onClick={() => setSelectedLink(link)}
                              className={clsx(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[0.7rem] font-semibold transition-all cursor-pointer text-left',
                                isSelected
                                  ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.textColor} ring-2 ring-current/20 shadow-xs font-bold`
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                              )}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cfg.color }}
                              />
                              <span className="truncate max-w-[120px]">{srcSec?.heading || 'Section A'}</span>
                              <ArrowRight size={10} className="shrink-0 text-[var(--text-muted)]" />
                              <span className="truncate max-w-[120px]">{tgtSec?.heading || 'Section B'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Inspection Card for Active Link */}
                    {selectedLink && (
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm animate-in fade-in duration-200">
                        {(() => {
                          const cfg = RELATION_CONFIG[selectedLink.relation] || RELATION_CONFIG.aligned;
                          const srcSec = sectionMapA.get(selectedLink.source_section_id);
                          const tgtSec = sectionMapB.get(selectedLink.target_section_id);

                          return (
                            <div>
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider ${cfg.bgColor} ${cfg.textColor}`}
                                  >
                                    {cfg.label}
                                  </span>
                                  <span className="text-[0.7rem] text-[var(--text-muted)] font-mono">
                                    Confidence: {Math.round(selectedLink.confidence * 100)}%
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 leading-snug">
                                {selectedLink.summary}
                              </p>

                              {/* Quotes Comparison Block */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div className="p-2.5 rounded-lg border border-teal-500/20 bg-teal-500/5 text-xs">
                                  <div className="font-bold text-teal-700 dark:text-teal-400 mb-1 flex items-center justify-between">
                                    <span className="truncate">{analysisData.doc_a.filename}</span>
                                    <span className="text-[0.65rem] font-normal text-[var(--text-muted)]">Source Quote</span>
                                  </div>
                                  <blockquote className="italic text-[0.7rem] text-[var(--text-secondary)] border-l-2 border-teal-500/40 pl-2">
                                    "{selectedLink.source_quote || srcSec?.content.slice(0, 160) || '...'}"
                                  </blockquote>
                                </div>

                                <div className="p-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 text-xs">
                                  <div className="font-bold text-sky-700 dark:text-sky-400 mb-1 flex items-center justify-between">
                                    <span className="truncate">{analysisData.doc_b.filename}</span>
                                    <span className="text-[0.65rem] font-normal text-[var(--text-muted)]">Target Quote</span>
                                  </div>
                                  <blockquote className="italic text-[0.7rem] text-[var(--text-secondary)] border-l-2 border-sky-500/40 pl-2">
                                    "{selectedLink.target_quote || tgtSec?.content.slice(0, 160) || '...'}"
                                  </blockquote>
                                </div>
                              </div>

                              {selectedLink.recommendation && (
                                <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300">
                                  <span className="font-bold mr-1">Recommended Action:</span>
                                  <span>{selectedLink.recommendation}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Document B Sections */}
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400 truncate">
                        {analysisData.doc_b.filename}
                      </span>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">
                        {analysisData.sections_b.length} sections
                      </span>
                    </div>
                    {analysisData.sections_b.map((sec) => {
                      const isHovered = hoveredSectionId === sec.id;
                      const hasActiveLink = selectedLink?.target_section_id === sec.id || activeSectionB === sec.id;
                      return (
                        <div
                          key={sec.id}
                          onMouseEnter={() => setHoveredSectionId(sec.id)}
                          onMouseLeave={() => setHoveredSectionId(null)}
                          onClick={() => {
                            setActiveSectionB(sec.id);
                            const link = analysisData.links.find((l) => l.target_section_id === sec.id);
                            if (link) setSelectedLink(link);
                          }}
                          className={clsx(
                            'p-3 rounded-lg border text-xs cursor-pointer transition-all',
                            hasActiveLink
                              ? 'border-sky-500 bg-sky-500/10 shadow-xs ring-1 ring-sky-500/40'
                              : isHovered
                              ? 'border-[var(--accent)] bg-[var(--bg-surface-hover)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]/80'
                          )}
                        >
                          <div className="font-bold text-[var(--text-primary)] mb-1 leading-snug">
                            {sec.heading}
                          </div>
                          <p className="line-clamp-2 text-[0.7rem] text-[var(--text-muted)]">
                            {sec.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View 2: Synchronized Dual Document Reader */}
              {activeTab === 'split' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  {/* Left Pane: Doc A */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-bold truncate max-w-[220px]">
                          {analysisData.doc_a.filename}
                        </span>
                      </div>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">Left Document</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {analysisData.sections_a.map((sec) => (
                        <div
                          key={sec.id}
                          className={clsx(
                            'p-3 rounded-lg border transition-all text-xs',
                            selectedLink?.source_section_id === sec.id
                              ? 'border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/30'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                          )}
                        >
                          <h4 className="font-bold text-[var(--text-primary)] mb-1.5 flex items-center justify-between">
                            <span>{sec.heading}</span>
                            {selectedLink?.source_section_id === sec.id && (
                              <span className="text-[0.65rem] text-teal-600 dark:text-teal-400 font-bold">
                                Active Cross-Ref
                              </span>
                            )}
                          </h4>
                          <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                            {sec.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Pane: Doc B */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-sky-600 dark:text-sky-400" />
                        <span className="text-xs font-bold truncate max-w-[220px]">
                          {analysisData.doc_b.filename}
                        </span>
                      </div>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">Right Document</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {analysisData.sections_b.map((sec) => (
                        <div
                          key={sec.id}
                          className={clsx(
                            'p-3 rounded-lg border transition-all text-xs',
                            selectedLink?.target_section_id === sec.id
                              ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/30'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                          )}
                        >
                          <h4 className="font-bold text-[var(--text-primary)] mb-1.5 flex items-center justify-between">
                            <span>{sec.heading}</span>
                            {selectedLink?.target_section_id === sec.id && (
                              <span className="text-[0.65rem] text-sky-600 dark:text-sky-400 font-bold">
                                Paired Target
                              </span>
                            )}
                          </h4>
                          <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                            {sec.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: Executive Conflict & Discrepancy Matrix */}
              {activeTab === 'matrix' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-rose-500" />
                      Critical Operational Discrepancies ({analysisData.discrepancies.length})
                    </h3>

                    {analysisData.discrepancies.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                        No critical discrepancies detected. Both documents exhibit high procedural alignment.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analysisData.discrepancies.map((d) => (
                          <div
                            key={d.id}
                            className={clsx(
                              'p-3.5 rounded-lg border text-xs space-y-2',
                              d.severity === 'high'
                                ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                                : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text-primary)] text-xs">
                                {d.topic}
                              </span>
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase',
                                  d.severity === 'high'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-amber-500 text-white'
                                )}
                              >
                                {d.severity} Severity
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                <div className="font-semibold text-teal-600 dark:text-teal-400 text-[0.7rem] mb-0.5">
                                  {analysisData.doc_a.filename}
                                </div>
                                <div className="text-[var(--text-secondary)] text-[0.7rem]">
                                  {d.doc_a_clause}
                                </div>
                              </div>

                              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                                <div className="font-semibold text-sky-600 dark:text-sky-400 text-[0.7rem] mb-0.5">
                                  {analysisData.doc_b.filename}
                                </div>
                                <div className="text-[var(--text-secondary)] text-[0.7rem]">
                                  {d.doc_b_clause}
                                </div>
                              </div>
                            </div>

                            <div className="text-[0.7rem] text-[var(--text-primary)]">
                              <span className="font-bold text-rose-600 dark:text-rose-400 mr-1">Risk Detail:</span>
                              {d.conflict_detail}
                            </div>

                            <div className="text-[0.7rem] text-emerald-700 dark:text-emerald-400 font-medium">
                              <span className="font-bold mr-1">Suggested Resolution:</span>
                              {d.suggested_action}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Drawer: Cross-Doc AI Copilot */}
        {isCopilotOpen && (
          <aside className="w-80 sm:w-96 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col z-20 shrink-0 shadow-lg">
            <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-xs font-bold">Cross-Doc AI Auditor</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCopilotOpen(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] border-none bg-transparent cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {copilotHistory.length === 0 ? (
                <div className="text-center p-4 text-[var(--text-muted)] space-y-2">
                  <p>Ask comparative questions contrasting both documents.</p>
                  <div className="space-y-1 text-left text-[0.7rem]">
                    <button
                      type="button"
                      onClick={() => setCopilotQuestion('What are the key policy contradictions between these documents?')}
                      className="w-full text-left p-2 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] cursor-pointer text-[var(--text-secondary)]"
                    >
                      "What are the key policy contradictions between these documents?"
                    </button>
                    <button
                      type="button"
                      onClick={() => setCopilotQuestion('Which document has stricter financial approval thresholds?')}
                      className="w-full text-left p-2 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] cursor-pointer text-[var(--text-secondary)]"
                    >
                      "Which document has stricter financial approval thresholds?"
                    </button>
                  </div>
                </div>
              ) : (
                copilotHistory.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="p-2 rounded-lg bg-[var(--accent)] text-white font-medium ml-6">
                      {item.q}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {item.a}
                    </div>
                  </div>
                ))
              )}
              {isCopilotLoading && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-2 animate-pulse">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Comparing clauses...</span>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleAskCopilot} className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 focus-within:border-[var(--accent)]">
                <input
                  type="text"
                  placeholder="Ask comparative question..."
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  disabled={isCopilotLoading}
                  className="flex-1 bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder-[var(--text-muted)]"
                />
                <button
                  type="submit"
                  disabled={!copilotQuestion.trim() || isCopilotLoading}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-40 border-none bg-transparent cursor-pointer p-0.5"
                >
                  <Send size={13} />
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
