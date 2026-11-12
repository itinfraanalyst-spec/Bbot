
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  Upload,
  FileText,
  X,
  Download,
  FileImage,
  RefreshCw,
  GitFork,
  GitBranch,
  Clock,
  Layers,
  Network,
  Share2,
  Columns,
  ListOrdered,
  BarChart3,
  TrendingUp,
  PieChart,
  HelpCircle,
  Check,
  AlertCircle,
  RotateCcw,
  RotateCw,
  LayoutGrid,
  Filter,
  Grid2x2,
  Zap,
  FileCode,
  Copy,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Bookmark,
  Undo2,
  Redo2,
  FolderOpen,
  Trash2,
  Play,
  Save,
  GitCompare,
  Shield,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { DiagramCanvas, type DiagramCanvasRef } from '../components/studio/DiagramCanvas';
import { useTheme } from '../contexts/ThemeContext';
import { applyTemplateToDataset, scaleTemplateToStepCount, sanitizeDiagramBlueprint } from '../components/studio/templateMapper';
import type { DiagramSpec, RecommendationResponse, VisualTypeInfo } from '../components/studio/types';

const STUDIO_STORAGE_KEY = 'bbot_visual_studio_state';

interface StudioPersistedState {
  prompt: string;
  uploadedDoc: { id: string; name: string; preview: string } | null;
  selectedType: string;
  recommendation: RecommendationResponse | null;
  diagram: DiagramSpec | null;
}

const loadSavedStudioState = (): Partial<StudioPersistedState> => {
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading visual studio state:', e);
  }
  return {};
};

const VISUAL_TYPES: VisualTypeInfo[] = [
  { id: 'process_flow', name: 'Process Flowchart', description: 'Sequential workflows & lifecycles', icon: 'GitFork', category: 'flow' },
  { id: 'decision_flow', name: 'Decision Flowchart', description: 'Branching logic & condition trees', icon: 'GitBranch', category: 'flow' },
  { id: 'timeline', name: 'Timeline / Roadmap', description: 'Chronological phases & milestones', icon: 'Clock', category: 'temporal' },
  { id: 'funnel', name: 'Conversion / Funnel Pipeline', description: 'Staged qualification & throughput funnels', icon: 'Filter', category: 'flow' },
  { id: 'quadrant', name: '2x2 Strategic Matrix', description: 'Impact vs Effort prioritization map', icon: 'Grid2x2', category: 'comparison' },
  { id: 'circular_loop', name: 'Circular Flywheel / Loop', description: 'Continuous agile cycles & feedback loops', icon: 'RotateCw', category: 'flow' },
  { id: 'bento_grid', name: 'Executive Bento Grid', description: 'Modular Apple-style metric showcase', icon: 'LayoutGrid', category: 'structure' },
  { id: 'hierarchy', name: 'Hierarchy / Org Chart', description: 'Top-down tiers & management trees', icon: 'Layers', category: 'structure' },
  { id: 'mindmap', name: 'Mind Map', description: 'Central core with radiating subtopics', icon: 'Network', category: 'structure' },
  { id: 'concept_map', name: 'Concept Relationship Map', description: 'Actors, systems & connections', icon: 'Share2', category: 'relationship' },
  { id: 'comparison', name: 'Comparison / Matrix', description: 'Side-by-side feature matrix', icon: 'Columns', category: 'comparison' },
  { id: 'sequence', name: 'Step-by-Step Sequence', description: 'Ordered instructions & checklists', icon: 'ListOrdered', category: 'flow' },
  { id: 'bar_chart', name: 'Bar Chart', description: 'Categorical metrics & quantities', icon: 'BarChart3', category: 'chart' },
  { id: 'line_chart', name: 'Line Chart', description: 'Trends & continuous telemetry', icon: 'TrendingUp', category: 'chart' },
  { id: 'pie_chart', name: 'Pie / Donut Chart', description: 'Proportions & distribution shares', icon: 'PieChart', category: 'chart' },
];

const VISUAL_CATEGORY_THEMES: Record<string, {
  badge: string;
  dotColor: string;
  iconBg: string;
  iconText: string;
  selectedRing: string;
  selectedBg: string;
  hoverBorder: string;
}> = {
  flow: {
    badge: 'Flow',
    dotColor: 'bg-cyan-600 dark:bg-cyan-400 dark:shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    iconBg: 'bg-cyan-50 border border-cyan-300 text-cyan-800 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-400',
    iconText: 'text-cyan-800 dark:text-cyan-400',
    selectedRing: 'ring-cyan-500 border-cyan-500 dark:ring-cyan-500/60 dark:border-cyan-500/80',
    selectedBg: 'bg-cyan-50/90 dark:bg-cyan-500/10',
    hoverBorder: 'hover:border-cyan-400 hover:bg-cyan-50/60 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-500/5',
  },
  temporal: {
    badge: 'Timeline',
    dotColor: 'bg-amber-600 dark:bg-amber-400 dark:shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    iconBg: 'bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400',
    iconText: 'text-amber-900 dark:text-amber-400',
    selectedRing: 'ring-amber-500 border-amber-500 dark:ring-amber-500/60 dark:border-amber-500/80',
    selectedBg: 'bg-amber-50/90 dark:bg-amber-500/10',
    hoverBorder: 'hover:border-amber-400 hover:bg-amber-50/60 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/5',
  },
  structure: {
    badge: 'Structure',
    dotColor: 'bg-violet-600 dark:bg-violet-400 dark:shadow-[0_0_8px_rgba(168,85,247,0.8)]',
    iconBg: 'bg-violet-50 border border-violet-300 text-violet-900 dark:bg-violet-500/15 dark:border-violet-500/30 dark:text-violet-400',
    iconText: 'text-violet-900 dark:text-violet-400',
    selectedRing: 'ring-violet-500 border-violet-500 dark:ring-violet-500/60 dark:border-violet-500/80',
    selectedBg: 'bg-violet-50/90 dark:bg-violet-500/10',
    hoverBorder: 'hover:border-violet-400 hover:bg-violet-50/60 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/5',
  },
  relationship: {
    badge: 'Network',
    dotColor: 'bg-sky-600 dark:bg-sky-400 dark:shadow-[0_0_8px_rgba(56,189,248,0.8)]',
    iconBg: 'bg-sky-50 border border-sky-300 text-sky-900 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-400',
    iconText: 'text-sky-900 dark:text-sky-400',
    selectedRing: 'ring-sky-500 border-sky-500 dark:ring-sky-500/60 dark:border-sky-500/80',
    selectedBg: 'bg-sky-50/90 dark:bg-sky-500/10',
    hoverBorder: 'hover:border-sky-400 hover:bg-sky-50/60 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/5',
  },
  comparison: {
    badge: 'Matrix',
    dotColor: 'bg-rose-600 dark:bg-rose-400 dark:shadow-[0_0_8px_rgba(251,113,133,0.8)]',
    iconBg: 'bg-rose-50 border border-rose-300 text-rose-900 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400',
    iconText: 'text-rose-900 dark:text-rose-400',
    selectedRing: 'ring-rose-500 border-rose-500 dark:ring-rose-500/60 dark:border-rose-500/80',
    selectedBg: 'bg-rose-50/90 dark:bg-rose-500/10',
    hoverBorder: 'hover:border-rose-400 hover:bg-rose-50/60 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/5',
  },
  chart: {
    badge: 'Metric',
    dotColor: 'bg-emerald-600 dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    iconBg: 'bg-emerald-50 border border-emerald-300 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400',
    iconText: 'text-emerald-900 dark:text-emerald-400',
    selectedRing: 'ring-emerald-500 border-emerald-500 dark:ring-emerald-500/60 dark:border-emerald-500/80',
    selectedBg: 'bg-emerald-50/90 dark:bg-emerald-500/10',
    hoverBorder: 'hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/5',
  },
};

export function VisualStudioPage() {
  const { theme } = useTheme();
  const diagramCanvasRef = React.useRef<DiagramCanvasRef>(null);
  const initialSaved = React.useMemo(() => loadSavedStudioState(), []);
  const [prompt, setPrompt] = useState(initialSaved.prompt || '');
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; name: string; preview: string } | null>(
    initialSaved.uploadedDoc || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(initialSaved.selectedType || 'process_flow');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(
    initialSaved.recommendation || null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [diagram, setDiagram] = useState<DiagramSpec | null>(initialSaved.diagram || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'fast' | 'deep'>('deep');

  // Undo / Redo History Stack (up to 50 snapshots)
  const [history, setHistory] = useState<DiagramSpec[]>([]);
  const [redoStack, setRedoStack] = useState<DiagramSpec[]>([]);
  const [undoToast, setUndoToast] = useState<string | null>(null);

  const updateDiagramWithHistory = React.useCallback(
    (newDiagram: DiagramSpec, previousSnapshot?: DiagramSpec) => {
      setDiagram((currentDiagram) => {
        const snapshotToSave = previousSnapshot || currentDiagram;
        if (snapshotToSave && JSON.stringify(newDiagram) === JSON.stringify(snapshotToSave)) {
          return currentDiagram || newDiagram;
        }
        if (snapshotToSave) {
          setHistory((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(snapshotToSave))]);
          setRedoStack([]);
        }
        setHasUnsavedEdits(true);
        return newDiagram;
      });
    },
    []
  );

  const handleUndo = React.useCallback(() => {
    if (history.length === 0 || !diagram) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [JSON.parse(JSON.stringify(diagram)), ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setDiagram(previous);
    setHasUnsavedEdits(true);
    setUndoToast('Reverted change');
    setTimeout(() => setUndoToast(null), 2500);
  }, [history, diagram]);

  const handleRedo = React.useCallback(() => {
    if (redoStack.length === 0 || !diagram) return;
    const next = redoStack[0];
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(diagram))]);
    setRedoStack((prev) => prev.slice(1));
    setDiagram(next);
    setHasUnsavedEdits(true);
    setUndoToast('Restored change');
    setTimeout(() => setUndoToast(null), 2500);
  }, [redoStack, diagram]);

  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  // Save Confirmation Guard State (prevents accidental loss on Clear/New Canvas, Regenerate, or Navigation)
  const navigate = useNavigate();
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [savePromptName, setSavePromptName] = useState('');
  const [isSavingFromPrompt, setIsSavingFromPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'clear' | 'generate' | 'leave';
    title: string;
    description: string;
    execute: () => void;
  } | null>(null);

  const hasDiagramContent = Boolean(
    diagram && ((Array.isArray(diagram.nodes) && diagram.nodes.length > 0) || diagram.chartData)
  );

  const { userId } = useAuth();
  const [projectsModalTab, setProjectsModalTab] = useState<'my_projects' | 'community_templates'>('my_projects');

  // Saved Template Blueprints for Cross-Dataset Generation
  const [savedTemplates, setSavedTemplates] = useState<{
    id: string;
    name: string;
    diagram: DiagramSpec;
    category?: string;
    createdAt?: string;
    nodeCount?: number;
    is_public?: boolean;
    created_by?: string;
    created_by_name?: string;
  }[]>([]);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isSavingProgressTop, setIsSavingProgressTop] = useState(false);
  const [saveProgressToastTop, setSaveProgressToastTop] = useState<string | null>(null);

  const fetchWorkspaceProjects = async () => {
    try {
      const res = await fetch('/api/visual-studio/templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedTemplates((prev) => {
            const serverItems = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              category: d.category,
              createdAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : undefined,
              nodeCount: d.node_count || d.diagram?.nodes?.length || 0,
              diagram: d.diagram,
              is_public: Boolean(d.is_public),
              created_by: d.created_by,
              created_by_name: d.created_by_name,
            }));
            const map = new Map<string, any>();
            serverItems.forEach((it: any) => map.set(it.id, it));
            prev.forEach((it) => {
              if (!map.has(it.id)) map.set(it.id, it);
            });
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  };

  const handleTopSaveProgress = async () => {
    if (!diagram) return;
    setIsSavingProgressTop(true);
    try {
      const titleName = diagram.title || 'Visual Project';
      const templateId = `proj_${Date.now()}`;
      const newEntry = {
        id: templateId,
        name: titleName,
        createdAt: new Date().toLocaleDateString(),
        nodeCount: diagram.nodes?.length || 0,
        diagram: JSON.parse(JSON.stringify(diagram)),
        is_public: true,
      };
      setSavedTemplates((prev) => [newEntry, ...prev.filter((p) => p.id !== templateId)]);

      const snapshot = {
        diagram,
        timestamp: Date.now(),
        lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      localStorage.setItem('bbot_visual_studio_state', JSON.stringify({ diagram, selectedType: diagram.diagramType }));
      localStorage.setItem('bbot_studio_saved_progress', JSON.stringify(snapshot));

      await fetch('/api/visual-studio/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: titleName,
          description: diagram.summary || 'User saved visual studio project',
          category: diagram.diagramType || 'process_flow',
          diagram: diagram,
          is_public: true,
        }),
      });

      setSaveProgressToastTop('Saved to Team Templates!');
      setTimeout(() => setSaveProgressToastTop(null), 2500);
      setHasUnsavedEdits(false);
    } catch (e) {
      console.error('Save error:', e);
      setSaveProgressToastTop('Save failed');
      setTimeout(() => setSaveProgressToastTop(null), 2500);
    } finally {
      setIsSavingProgressTop(false);
    }
  };

  const handleOpenSavedProject = (item: any) => {
    if (item.diagram) {
      setDiagram(JSON.parse(JSON.stringify(item.diagram)));
      if (item.diagram.diagramType) {
        setSelectedType(item.diagram.diagramType);
      }
      setHasUnsavedEdits(false);
      setIsProjectsModalOpen(false);
    }
  };

  const handleApplyCommunityDesign = (item: any) => {
    if (!item.diagram) return;
    const sanitized = sanitizeDiagramBlueprint(item.diagram, item.name);
    setDiagram(sanitized);
    if (sanitized.diagramType) {
      setSelectedType(sanitized.diagramType);
    }
    setHasUnsavedEdits(false);
    setIsProjectsModalOpen(false);
    setExportNotice({
      type: 'success',
      message: `✨ Applied "${item.name}" design blueprint (Data-Sanitized & Ready)!`,
    });
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleAdaptTemplateToActiveCanvas = (item: any) => {
    if (!item.diagram) return;
    if (diagram && diagram.nodes && diagram.nodes.length > 0) {
      const adapted = applyTemplateToDataset(item.diagram, diagram);
      setDiagram(adapted);
      setHasUnsavedEdits(true);
      setIsProjectsModalOpen(false);
      setExportNotice({
        type: 'success',
        message: `⚡ Adapted "${item.name}" design to your current canvas data!`,
      });
      setTimeout(() => setExportNotice(null), 4000);
    } else {
      handleApplyCommunityDesign(item);
    }
  };

  const handleScaleAndApplyTemplate = (item: any, count: number) => {
    if (!item.diagram) return;
    const sanitized = sanitizeDiagramBlueprint(item.diagram, item.name);
    const scaled = scaleTemplateToStepCount(sanitized, count);
    setDiagram(scaled);
    if (scaled.diagramType) {
      setSelectedType(scaled.diagramType);
    }
    setHasUnsavedEdits(false);
    setIsProjectsModalOpen(false);
    setExportNotice({
      type: 'success',
      message: `🎯 Adapted "${item.name}" design to exact ${count} stages!`,
    });
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleDeleteSavedProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved project?')) return;
    setSavedTemplates((prev) => prev.filter((p) => p.id !== id));
    try {
      const raw = localStorage.getItem('bbot_user_templates');
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem('bbot_user_templates', JSON.stringify(parsed.filter((p: any) => p.id !== id)));
      }
    } catch { }
    try {
      await fetch(`/api/visual-studio/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch { }
  };
  const [selectedTemplateBlueprintId, setSelectedTemplateBlueprintId] = useState<string>('auto');

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('bbot_user_templates');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedTemplates(parsed);
      }
    } catch { }

    fetch('/api/visual-studio/templates', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedTemplates((prev) => {
            const serverItems = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              diagram: d.diagram,
            }));
            const map = new Map<string, any>();
            serverItems.forEach((it: any) => map.set(it.id, it));
            prev.forEach((it) => {
              if (!map.has(it.id)) map.set(it.id, it);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => { });
  }, []);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close export dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportOpen]);

  // Auto-persist studio state to localStorage so switching to chat never loses user work
  React.useEffect(() => {
    try {
      localStorage.setItem(
        STUDIO_STORAGE_KEY,
        JSON.stringify({
          prompt,
          uploadedDoc,
          selectedType,
          recommendation,
          diagram,
        })
      );
    } catch (e) {
      console.error('Failed to persist visual studio state:', e);
    }
  }, [prompt, uploadedDoc, selectedType, recommendation, diagram]);

  // Check for 1-Click Handoff from Chat
  React.useEffect(() => {
    try {
      const handoffRaw = sessionStorage.getItem('bbot_studio_handoff');
      if (handoffRaw) {
        sessionStorage.removeItem('bbot_studio_handoff');
        const handoff = JSON.parse(handoffRaw);
        if (handoff.sourceText && handoff.sourceText.trim()) {
          const rawText = handoff.sourceText.trim();
          setPrompt(rawText);
          setUploadedDoc(null);
          setErrorMsg(null);
          setIsGenerating(true);

          // Fast instant draft (<15ms)
          fetch('/api/visual-studio/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ raw_text: rawText, visual_type: 'process_flow' }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((draftData: DiagramSpec | null) => {
              if (draftData) {
                setDiagram(draftData);
              }
            })
            .catch(() => { })
            .finally(() => {
              setIsGenerating(false);
            });

          // Intelligent recommendation analysis
          fetch('/api/visual-studio/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ prompt: rawText }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((recData: RecommendationResponse | null) => {
              if (recData) {
                setRecommendation(recData);
                if (recData.recommendedType) {
                  setSelectedType(recData.recommendedType);
                }
              }
            })
            .catch(() => { });
        }
      }
    } catch (e) {
      console.error('Failed to parse studio handoff:', e);
    }
  }, []);

  // Check for 1-Click Diagram Load from Chat (Workflow / DFD "Open in Studio")
  React.useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem('pending_studio_diagram');
      if (pendingRaw) {
        sessionStorage.removeItem('pending_studio_diagram');
        const spec = JSON.parse(pendingRaw);
        if (spec && typeof spec === 'object' && Array.isArray(spec.nodes)) {
          setDiagram(spec);
          if (spec.title) {
            setPrompt(spec.title);
          }
          if (spec.diagram_type) {
            setSelectedType(spec.diagram_type);
          }
          setExportNotice({
            type: 'success',
            message: `🎨 Loaded "${spec.title || 'Chat Diagram'}" directly into Visual Studio Canvas!`,
          });
          setTimeout(() => setExportNotice(null), 5000);
        }
      }
    } catch (e) {
      console.error('Failed to load pending studio diagram:', e);
    }
  }, []);

  const performClearAll = () => {
    setPrompt('');
    setUploadedDoc(null);
    setRecommendation(null);
    setDiagram(null);
    setSelectedType('process_flow');
    setErrorMsg(null);
    setExportNotice(null);
    setHasUnsavedEdits(false);
    try {
      localStorage.removeItem(STUDIO_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing visual studio storage:', e);
    }
  };

  const handleClearAll = () => {
    if (hasDiagramContent) {
      setSavePromptName(diagram?.title || 'Visual Flow');
      setPendingAction({
        type: 'clear',
        title: 'Save Visual Before Clearing?',
        description: 'delete and reset your canvas',
        execute: performClearAll,
      });
      setIsSavePromptOpen(true);
    } else {
      performClearAll();
    }
  };

  const handleConfirmSaveAndProceed = async () => {
    if (!diagram) return;
    setIsSavingFromPrompt(true);
    const name = savePromptName.trim() || diagram.title || 'Saved Visual Blueprint';
    const newEntry = {
      id: `tmpl_${Date.now()}`,
      name,
      createdAt: new Date().toLocaleDateString(),
      nodeCount: diagram.nodes?.length || 0,
      diagram: JSON.parse(JSON.stringify({ ...diagram, title: name })),
    };

    try {
      const raw = localStorage.getItem('bbot_user_templates');
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [newEntry, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem('bbot_user_templates', JSON.stringify(updated));
      setSavedTemplates(updated);
    } catch (err) {
      console.error('Failed to save template to localStorage:', err);
    }

    try {
      await fetch('/api/visual-studio/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          category: diagram.diagramType || selectedType || 'process_flow',
          diagram: { ...diagram, title: name },
          is_public: true,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync template to server:', err);
    }

    setExportNotice({
      type: 'success',
      message: `💾 Saved "${name}" to Blueprint Templates!`,
    });
    setTimeout(() => setExportNotice(null), 4500);

    setIsSavingFromPrompt(false);
    setIsSavePromptOpen(false);
    setHasUnsavedEdits(false);

    if (pendingAction) {
      const actionToRun = pendingAction.execute;
      setPendingAction(null);
      actionToRun();
    }
  };

  const handleDownloadBackupOnly = () => {
    if (!diagram) return;
    try {
      const fileName = `${(savePromptName.trim() || diagram.title || 'diagram').toLowerCase().replace(/\s+/g, '_')}_backup.json`;
      const jsonStr = JSON.stringify(diagram, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportNotice({
        type: 'success',
        message: `📥 Downloaded "${fileName}"!`,
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch (e) {
      console.error('Failed to download JSON backup:', e);
    }
  };

  const handleDiscardAndProceed = () => {
    setIsSavePromptOpen(false);
    setHasUnsavedEdits(false);
    if (pendingAction) {
      const actionToRun = pendingAction.execute;
      setPendingAction(null);
      actionToRun();
    }
  };

  const handleBackToChat = (e: React.MouseEvent) => {
    if (hasDiagramContent && hasUnsavedEdits) {
      e.preventDefault();
      setSavePromptName(diagram?.title || 'Visual Flow');
      setPendingAction({
        type: 'leave',
        title: 'Save Visual Before Leaving?',
        description: 'leave Visual Studio and return to Chat',
        execute: () => navigate('/'),
      });
      setIsSavePromptOpen(true);
    }
  };

  // Warn before browser tab close / refresh if unsaved work exists
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDiagramContent && hasUnsavedEdits) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDiagramContent, hasUnsavedEdits]);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setExportNotice(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/visual-studio/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to upload document.');
      }

      const data = await res.json();
      setUploadedDoc({
        id: data.document_id,
        name: data.filename,
        preview: data.preview,
      });

      // Automatically trigger recommendation analysis for uploaded doc
      triggerAnalyze(data.document_id, prompt);
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  // Analyze & Recommend Handler
  const triggerAnalyze = async (docId?: string, userPrompt?: string) => {
    const activeDocId = docId !== undefined ? docId : uploadedDoc?.id;
    const activePrompt = userPrompt !== undefined ? userPrompt : prompt;

    if (!activeDocId && !activePrompt.trim()) {
      setErrorMsg('Please upload a document or enter a prompt first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setExportNotice(null);
    try {
      const res = await fetch('/api/visual-studio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: activePrompt.trim() || undefined,
          document_id: activeDocId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Analysis failed.');
      }

      const data: RecommendationResponse = await res.json();
      setRecommendation(data);
      if (data.recommendedType) {
        setSelectedType(data.recommendedType);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate Visual Handler (High-Performance Parallel Pipeline)
  const performGenerate = async () => {
    if (!uploadedDoc && !prompt.trim()) {
      setErrorMsg('Please provide a document or a prompt to generate a visual.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setExportNotice(null);

    const payload = {
      prompt: prompt.trim() || undefined,
      document_id: uploadedDoc?.id || undefined,
      visual_type: selectedType,
    };

    const applyBlueprintIfSelected = (incoming: DiagramSpec): DiagramSpec => {
      if (selectedTemplateBlueprintId === 'auto') return incoming;
      const tpl = savedTemplates.find((t) => t.id === selectedTemplateBlueprintId);
      if (!tpl || !tpl.diagram) return incoming;
      return applyTemplateToDataset(tpl.diagram, incoming);
    };

    // ⚡ Fast Mode (<10ms): Instant Whole-Lifecycle Heuristic Synthesizer
    if (generationMode === 'fast') {
      try {
        const draftRes = await fetch('/api/visual-studio/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!draftRes.ok) {
          const err = await draftRes.json().catch(() => ({}));
          throw new Error(err.detail || 'Fast visual generation failed.');
        }
        const draftData: DiagramSpec = await draftRes.json();
        setDiagram(applyBlueprintIfSelected(draftData));
      } catch (err: any) {
        setErrorMsg(err.message || 'Generation error');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // ✨ Deep AI Mode: Parallel Optimistic Draft (<15ms) + Concurrent LLM Refinement
    let deepDone = false;
    fetch('/api/visual-studio/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((draftData: DiagramSpec | null) => {
        if (draftData && !deepDone) {
          setDiagram(applyBlueprintIfSelected(draftData));
        }
      })
      .catch(() => { });

    try {
      const res = await fetch('/api/visual-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Visual generation failed.');
      }

      const data: DiagramSpec = await res.json();
      deepDone = true;
      setDiagram(applyBlueprintIfSelected(data));
      setHasUnsavedEdits(true);
    } catch (err: any) {
      if (!diagram) {
        setErrorMsg(err.message || 'Generation error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (hasDiagramContent && hasUnsavedEdits) {
      setSavePromptName(diagram?.title || 'Visual Flow');
      setPendingAction({
        type: 'generate',
        title: 'Save Visual Before Generating?',
        description: 'replace your current visual with a newly generated diagram',
        execute: performGenerate,
      });
      setIsSavePromptOpen(true);
    } else {
      performGenerate();
    }
  };

  // Keyboard shortcut: Ctrl+Enter to generate; Ctrl+Z / Ctrl+Y for Undo/Redo
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (!isInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerating && (uploadedDoc || prompt.trim())) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGenerating, uploadedDoc, prompt, selectedType, generationMode, handleUndo, handleRedo]);

  // Export Handler (PNG / PDF / SVG / Copy to Clipboard) - Guarantees exact WYSIWYG matching screen
  const handleExport = async (format: 'png' | 'pdf' | 'svg' | 'copy') => {
    if (!diagram) return;
    setExportingFormat(format);
    setErrorMsg(null);
    setExportNotice(null);
    try {
      let exported = false;

      // 1. Direct High-Fidelity Capture via DiagramCanvasRef
      if (diagramCanvasRef.current) {
        if (format === 'copy') {
          const blob = await diagramCanvasRef.current.exportPng();
          if (blob) {
            try {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              setExportNotice({ type: 'success', message: 'Diagram copied! Press Ctrl+V in Word, Docs, or Notion.' });
              setTimeout(() => setExportNotice(null), 4500);
              exported = true;
            } catch (clipErr) {
              console.warn('Clipboard write restricted, falling back to download:', clipErr);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${(diagram.title || 'diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 5000);
              setExportNotice({ type: 'success', message: 'Diagram downloaded (clipboard access restricted).' });
              setTimeout(() => setExportNotice(null), 4500);
              exported = true;
            }
          }
        } else if (format === 'png') {
          const blob = await diagramCanvasRef.current.exportPng();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(diagram.title || 'diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            exported = true;
          }
        } else if (format === 'svg') {
          const rawSvg = await diagramCanvasRef.current.exportSvg();
          if (rawSvg) {
            const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(diagram.title || 'diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            exported = true;
          }
        } else if (format === 'pdf') {
          const blob = await diagramCanvasRef.current.exportPdf();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(diagram.title || 'diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            exported = true;
          }
        }
      }

      // 2. Fallback to server export
      if (!exported) {
        const res = await fetch('/api/visual-studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagram,
            format,
            theme: theme === 'light' ? 'light' : 'dark',
            width: 1400,
            height: 900,
          }),
        });

        if (!res.ok) {
          let msg = `Export request failed (${res.status})`;
          try {
            const errData = await res.json();
            if (errData?.detail) msg = errData.detail;
          } catch { }
          throw new Error(msg);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(diagram.title || 'diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }

      setExportNotice({
        type: 'success',
        message: `${format.toUpperCase()} downloaded successfully!`,
      });
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err: any) {
      const msg = `Export failed: ${err.message || 'Unknown error'}`;
      setErrorMsg(msg);
      setExportNotice({
        type: 'error',
        message: msg,
      });
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setExportingFormat(null);
    }
  };

  const getFormatIcon = (iconName: string) => {
    switch (iconName) {
      case 'GitFork': return <GitFork size={13} />;
      case 'GitBranch': return <GitBranch size={13} />;
      case 'Clock': return <Clock size={13} />;
      case 'Layers': return <Layers size={13} />;
      case 'Network': return <Network size={13} />;
      case 'Share2': return <Share2 size={13} />;
      case 'Columns': return <Columns size={13} />;
      case 'ListOrdered': return <ListOrdered size={13} />;
      case 'BarChart3': return <BarChart3 size={13} />;
      case 'TrendingUp': return <TrendingUp size={13} />;
      case 'PieChart': return <PieChart size={13} />;
      case 'RotateCw': return <RotateCw size={13} />;
      case 'LayoutGrid': return <LayoutGrid size={13} />;
      case 'Filter': return <Filter size={13} />;
      case 'Grid2x2': return <Grid2x2 size={13} />;
      default: return <Sparkles size={13} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            onClick={handleBackToChat}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Chat
          </Link>
          <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5" />
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${isSidebarCollapsed
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-xs font-bold'
              : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
            title={isSidebarCollapsed ? 'Show Controls Sidebar (Ctrl+B)' : 'Collapse Sidebar for Full Canvas (Ctrl+B)'}
            aria-label={isSidebarCollapsed ? 'Show Controls Sidebar' : 'Collapse Sidebar for Full Canvas'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            <span className="hidden sm:inline">{isSidebarCollapsed ? 'Show Controls' : 'Hide Sidebar'}</span>
          </button>
          <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5" />
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="TRPW bbot Logo" className="w-[28px] h-[28px] rounded-full object-cover ring-1 ring-[var(--border-subtle)]" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                TRPW <span className="text-[var(--accent)] font-bold">bbot</span> <span className="text-xs font-normal text-[var(--text-secondary)]">Visual Studio</span>
              </h2>
              <span className="text-[0.65rem] text-[var(--text-muted)] font-medium">Text & Document Visual Architecture</span>
            </div>
          </div>
        </div>

        {/* Export and Action Controls */}
        <div className="flex items-center gap-2">
          {exportNotice && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all animate-fade-in ${exportNotice.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-400'
                }`}
            >
              {exportNotice.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{exportNotice.message}</span>
            </div>
          )}

          {undoToast && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 animate-fade-in shadow-sm shrink-0">
              <Sparkles size={11} />
              <span>{undoToast}</span>
            </div>
          )}

          {diagram && (
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 shadow-xs shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Undo last change (Ctrl+Z)"
                aria-label="Undo last change"
              >
                <Undo2 size={13} />
                <span className="hidden sm:inline">Undo</span>
                {history.length > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 dark:text-amber-400 px-1 py-0.2 rounded-full font-mono font-bold">
                    {history.length}
                  </span>
                )}
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5" />
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Redo change (Ctrl+Y)"
                aria-label="Redo change"
              >
                <Redo2 size={13} />
                <span className="hidden sm:inline">Redo</span>
                {redoStack.length > 0 && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 px-1 py-0.2 rounded-full font-mono font-bold">
                    {redoStack.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* My Projects / Saved Progress Button */}
          <button
            type="button"
            onClick={() => {
              fetchWorkspaceProjects();
              setIsProjectsModalOpen(true);
            }}
            title="Open and resume saved projects"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 px-3 py-1.5 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <FolderOpen size={13} />
            <span>My Projects</span>
            {savedTemplates.length > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {savedTemplates.length}
              </span>
            )}
          </button>

          {/* Top Fixed Save Progress Button (Active when diagram exists) */}
          {diagram && (
            <button
              type="button"
              onClick={handleTopSaveProgress}
              disabled={isSavingProgressTop}
              title="Save current progress to workspace and cloud"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 px-3 py-1.5 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSavingProgressTop ? (
                <RefreshCw size={13} className="animate-spin text-emerald-400" />
              ) : (
                <Save size={13} className="text-emerald-400" />
              )}
              <span>{saveProgressToastTop || (isSavingProgressTop ? 'Saving...' : 'Save Progress')}</span>
            </button>
          )}

          {(uploadedDoc || prompt.trim() || diagram) && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all inputs and reset canvas"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw size={12} className="text-rose-400" /> New Canvas
            </button>
          )}

          {(uploadedDoc || prompt.trim()) && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#C87514] via-[#E39A3D] to-[#F59E0B] hover:brightness-110 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-[0_0_16px_rgba(200,117,20,0.35)] hover:shadow-[0_0_22px_rgba(200,117,20,0.55)] disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? <RefreshCw size={13} className="animate-spin text-white" /> : <Sparkles size={13} className="text-amber-200" />}
              {isGenerating ? 'Generating...' : (diagram ? 'Regenerate' : 'Generate Visual')}
            </button>
          )}

          {diagram && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportOpen((prev) => !prev);
                }}
                disabled={exportingFormat !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-300 hover:border-cyan-400 px-3 py-1.5 text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                aria-haspopup="true"
                aria-expanded={isExportOpen}
              >
                {exportingFormat ? (
                  <RefreshCw size={13} className="animate-spin text-cyan-400" />
                ) : (
                  <Download size={13} className="text-cyan-700 dark:text-cyan-400" />
                )}
                <span>{exportingFormat ? `Exporting (${exportingFormat.toUpperCase()})...` : 'Export'}</span>
                <ChevronDown size={11} className={`transition-transform duration-200 text-cyan-600 dark:text-cyan-400 ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportOpen && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-md"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1 flex items-center justify-between">
                    <span>Export & Share Visual</span>
                    <span className="text-[9px] font-normal text-[var(--text-muted)] font-mono">Hi-Res & Vector</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {/* Copy for Docs */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        handleExport('copy');
                      }}
                      disabled={exportingFormat !== null}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent transition-all group"
                      title="Copy high-res image directly to clipboard to paste (Ctrl+V) into Word, Google Docs, Notion, or PowerPoint"
                    >
                      <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                        <Copy size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                            Copy for Docs
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-primary)] px-1 py-0.5 rounded border border-[var(--border-subtle)]">
                            Ctrl+V
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                          High-res PNG to clipboard for Word, Notion, GDocs, Slides
                        </p>
                      </div>
                    </button>

                    {/* PNG Image */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        handleExport('png');
                      }}
                      disabled={exportingFormat !== null}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent transition-all group"
                      title="Export high-resolution PNG image with transparent or styled background"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <FileImage size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            Export PNG Image
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            Ultra-HD
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                          Crystal-clear raster image with crisp typography
                        </p>
                      </div>
                    </button>

                    {/* SVG Vector */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        handleExport('svg');
                      }}
                      disabled={exportingFormat !== null}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all group"
                      title="Export scalable vector SVG for Figma, Illustrator, Notion and web"
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                        <FileCode size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            Export SVG Vector
                          </span>
                          <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                            Scalable
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                          Infinitely scalable vector for Figma, Illustrator & web
                        </p>
                      </div>
                    </button>

                    {/* PDF Document */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        handleExport('pdf');
                      }}
                      disabled={exportingFormat !== null}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-sky-500/10 hover:border-sky-500/30 border border-transparent transition-all group"
                      title="Export presentation-ready PDF document"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                        <Download size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            Export PDF Document
                          </span>
                          <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400">
                            Document
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                          Print-ready executive presentation document
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cross-Reference Portal Shortcut */}
          <Link
            to="/cross-ref"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--accent)] px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs shrink-0"
            title="Open Cross-Document Intelligence Portal"
          >
            <GitCompare size={13} className="text-[var(--accent)]" />
            <span className="hidden md:inline">Cross-Ref Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout (Sidebar + Canvas) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Control Sidebar */}
        <aside
          className={`shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed
            ? 'w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none p-0'
            : 'w-[340px] md:w-[380px] p-4 gap-4 overflow-y-auto opacity-100'
            }`}
        >
          {/* Sidebar Header with Collapse Button */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Studio Controls
            </span>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              title="Collapse Sidebar (Ctrl+B)"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          {/* Document Upload Zone */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
              1. Source Document (Optional)
            </label>
            {uploadedDoc ? (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={16} className="text-[var(--accent)] shrink-0" />
                    <span className="truncate font-semibold text-[var(--text-primary)]" title={uploadedDoc.name}>
                      {uploadedDoc.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedDoc(null)}
                    className="rounded p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-surface-hover)] transition-colors"
                    title="Remove document"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[0.66rem] text-emerald-400 font-medium pt-1 border-t border-[color-mix(in_srgb,var(--accent)_20%,transparent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Whole-project scope synthesizer active (100% lifecycle coverage)
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--border-subtle)] rounded-lg hover:border-[var(--accent)] bg-[var(--bg-primary)] hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)] cursor-pointer transition-all">
                <Upload size={18} className="text-[var(--text-muted)] mb-1" />
                <span className="text-xs font-medium text-[var(--text-primary)]">Click to upload document</span>
                <span className="text-[0.65rem] text-[var(--text-muted)] mt-0.5">PDF, DOCX, TXT, CSV, XLSX (Max 15MB)</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
            {isUploading && <p className="text-[0.7rem] text-[var(--accent)] mt-1 animate-pulse">Extracting document text...</p>}
          </div>

          {/* Prompt Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                2. Instructions / Topic
              </label>
              {uploadedDoc && prompt && (
                <span className="text-[0.65rem] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Combined Mode
                </span>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Turn this into a sequence flowchart showing how orders move from customer to inventory..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none resize-none leading-relaxed"
            />
            {/* Quick Starters */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setPrompt('Complete Project Architecture & End-to-End Lifecycle')}
                className="group inline-flex items-center gap-1.5 text-[0.65rem] font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 hover:border-cyan-500 px-2.5 py-1 rounded-full transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/35 dark:hover:border-cyan-400 dark:shadow-[0_0_8px_rgba(6,182,212,0.15)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400 dark:shadow-[0_0_6px_rgba(6,182,212,0.8)] group-hover:scale-125 transition-transform" />
                + Whole Project Lifecycle
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Order Fulfillment & Inventory Restock Process')}
                className="group inline-flex items-center gap-1.5 text-[0.65rem] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:border-amber-500 px-2.5 py-1 rounded-full transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/35 dark:hover:border-amber-400 dark:shadow-[0_0_8px_rgba(245,158,11,0.15)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 dark:shadow-[0_0_6px_rgba(245,158,11,0.8)] group-hover:scale-125 transition-transform" />
                + Order Fulfillment
              </button>
              <button
                type="button"
                onClick={() => setPrompt('2026 Product Engineering Roadmap & Milestones')}
                className="group inline-flex items-center gap-1.5 text-[0.65rem] font-bold bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 hover:border-fuchsia-500 px-2.5 py-1 rounded-full transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] dark:bg-fuchsia-500/10 dark:hover:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/35 dark:hover:border-fuchsia-400 dark:shadow-[0_0_8px_rgba(217,70,239,0.15)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-600 dark:bg-fuchsia-400 dark:shadow-[0_0_6px_rgba(217,70,239,0.8)] group-hover:scale-125 transition-transform" />
                + Product Roadmap
              </button>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                3. AI Format Recommendation
              </label>
              <button
                type="button"
                onClick={() => triggerAnalyze()}
                disabled={isAnalyzing}
                className="text-[0.7rem] font-semibold text-amber-700 hover:text-amber-900 dark:text-[var(--accent)] dark:hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                {isAnalyzing ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} className="text-amber-600 dark:text-amber-400" />}
                {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
              </button>
            </div>

            {recommendation ? (
              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/90 shadow-xs dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:shadow-[0_0_15px_rgba(16,185,129,0.12)] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-400">
                    <Check size={13} className="text-emerald-700 dark:text-emerald-400" />
                    Recommended: {recommendation.recommendedType.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                <p className="text-[0.72rem] text-[var(--text-secondary)] leading-relaxed">
                  {recommendation.explanation}
                </p>
                {recommendation.keyEntities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {recommendation.keyEntities.map((ent, i) => (
                      <span key={i} className="text-[0.62rem] bg-emerald-100 text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 font-semibold dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                        {ent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.72rem] text-[var(--text-muted)] flex items-center gap-2">
                <HelpCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                Enter a prompt or upload a document to get an automated recommendation.
              </div>
            )}
          </div>

          {/* Visual Format Selector (Manual Override) */}
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
              4. Target Visual Type (Manual Override)
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {VISUAL_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                const isRec = recommendation?.recommendedType === type.id;
                const catTheme = VISUAL_CATEGORY_THEMES[type.category] || VISUAL_CATEGORY_THEMES.flow;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl border text-left transition-all ${isSelected
                      ? `${catTheme.selectedRing} ${catTheme.selectedBg} text-[var(--text-primary)] ring-1 shadow-[0_0_14px_rgba(0,0,0,0.3)]`
                      : `border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] ${catTheme.hoverBorder} hover:text-[var(--text-primary)]`
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg border transition-all ${isSelected
                        ? `${catTheme.iconBg} ${catTheme.iconText} shadow-xs`
                        : 'border-transparent text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                        }`}>
                        {getFormatIcon(type.icon)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                          {isSelected && <span className={`w-1.5 h-1.5 rounded-full ${catTheme.dotColor}`} />}
                          <span>{type.name}</span>
                        </div>
                        <div className="text-[0.65rem] text-[var(--text-muted)] truncate">{type.description}</div>
                      </div>
                    </div>
                    {isRec ? (
                      <span className="shrink-0 text-[0.6rem] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-xs dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40 dark:shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                        AI Choice
                      </span>
                    ) : (
                      <span className={`text-[0.58rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${catTheme.iconBg} ${catTheme.iconText}`}>
                        {catTheme.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button - Sticky at bottom */}
          <div className="sticky bottom-0 -mx-4 -mb-4 p-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] z-10 shadow-lg mt-auto">
            {errorMsg && (
              <div className="mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span className="line-clamp-2">{errorMsg}</span>
              </div>
            )}

            {/* Template Blueprint Selector for Cross-Dataset Visual Styling */}
            {savedTemplates.length > 0 && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                    <Bookmark size={11} className="text-amber-500" />
                    <span>Template Blueprint</span>
                  </label>
                  {selectedTemplateBlueprintId !== 'auto' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateBlueprintId('auto')}
                      className="text-[0.6rem] text-amber-500 hover:underline"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <select
                  value={selectedTemplateBlueprintId}
                  onChange={(e) => setSelectedTemplateBlueprintId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
                  title="Format this prompt / dataset into your saved template design"
                >
                  <option value="auto">Auto-Adaptive Blueprint (Default)</option>
                  {savedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      Use Template: {t.name} ({t.diagram.nodes?.length || 0} boxes)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speed Mode Selector */}
            <div className="mb-2.5 flex items-center justify-between rounded-xl bg-[var(--bg-primary)] p-1 border border-[var(--border-subtle)] text-[0.7rem] gap-1">
              <button
                type="button"
                onClick={() => setGenerationMode('fast')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all ${generationMode === 'fast'
                  ? 'bg-amber-100 text-amber-950 border border-amber-400 shadow-xs font-bold dark:bg-gradient-to-r dark:from-amber-500/25 dark:to-yellow-500/20 dark:text-amber-300 dark:border-amber-500/50 dark:shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-[var(--text-secondary)] hover:text-amber-950 hover:bg-amber-50 dark:text-[var(--text-muted)] dark:hover:text-amber-300 dark:hover:bg-amber-500/10'
                  }`}
                title="Synthesizes visual in <10ms without LLM latency"
              >
                <Zap size={12} className={generationMode === 'fast' ? 'text-amber-700 dark:text-amber-400 dark:drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]' : ''} />
                <span>Fast (&lt;10ms)</span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('deep')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all ${generationMode === 'deep'
                  ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 text-white shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-violet-950 hover:bg-violet-50 dark:text-[var(--text-muted)] dark:hover:text-violet-300 dark:hover:bg-violet-500/10'
                  }`}
                title="Uses local Qwen LLM for deep custom phrasing and domain reasoning"
              >
                <Sparkles size={12} className={generationMode === 'deep' ? 'text-violet-200' : ''} />
                <span>Deep AI</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C87514] via-[#E39A3D] to-[#F59E0B] hover:brightness-110 py-2.5 px-4 text-xs font-bold text-white shadow-[0_0_20px_rgba(200,117,20,0.4)] hover:shadow-[0_0_26px_rgba(200,117,20,0.6)] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw size={14} className="animate-spin text-white" /> : <Sparkles size={14} className="text-amber-100" />}
              {isGenerating ? 'Synthesizing Visual...' : (diagram ? 'Regenerate Visual' : 'Generate Visual')}
            </button>
          </div>
        </aside>

        {/* Main Canvas Viewport */}
        <main className="flex-1 flex flex-col p-3 md:p-4 min-h-0 overflow-hidden bg-[var(--bg-primary)] relative">
          {/* Floating Expand Sidebar Button when collapsed */}
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-xl hover:border-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all hover:scale-105 active:scale-95 animate-in fade-in"
              title="Expand Controls Sidebar (Ctrl+B)"
              aria-label="Expand Controls Sidebar"
            >
              <PanelLeftOpen size={14} className="text-[var(--accent)]" />
              <span>Controls</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
                Ctrl+B
              </kbd>
            </button>
          )}
          {diagram ? (
            <div className="flex-1 flex flex-col min-h-0 h-full relative">
              {isGenerating && (
                <div className="absolute top-2.5 right-4 z-20 flex items-center gap-2 bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--accent)]/50 px-3 py-1.5 rounded-full shadow-lg text-[0.7rem] text-[var(--accent)] font-semibold animate-pulse">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Synthesizing visual architecture...</span>
                </div>
              )}
              <DiagramCanvas
                ref={diagramCanvasRef}
                diagram={diagram}
                theme={theme}
                canUndo={history.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onUpdateDiagram={(updated, snapshot) => {
                  updateDiagramWithHistory(updated, snapshot);
                }}
                onRequestClearCanvas={handleClearAll}
              />
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] flex items-center justify-center text-[var(--accent)] animate-pulse shadow-[var(--energy-glow)]">
                  <Sparkles size={28} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Synthesizing Visual Model</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm leading-relaxed">
                  Composing visual architecture, entities, and operational stages...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto my-auto w-full animate-in fade-in">
              {/* Studio Welcome Header */}
              <div className="text-center mb-6 max-w-lg mx-auto">
                <div className="inline-flex h-12 w-12 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] items-center justify-center mb-3 shadow-[var(--energy-glow)]">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  TRPW <span className="text-[var(--accent)] font-extrabold">bbot</span> Visual Studio
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Start with an AI prompt or click any ready-to-edit starter template below:
                </p>
              </div>

              {/* Direct Prompt Input Bar on Canvas */}
              <div className="w-full max-w-2xl mx-auto mb-6">
                <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && prompt.trim() && !isGenerating) {
                        handleGenerate();
                      }
                    }}
                    placeholder="e.g. Customer support ticket resolution SOP, or Q1-Q4 product roadmap..."
                    className="flex-1 px-3 py-2 text-xs bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-md disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles size={13} />
                    <span>Create with AI</span>
                  </button>
                </div>

                {/* Prompt Quick Chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Try:</span>
                  {[
                    'Order Fulfillment Process',
                    '2026 Product Engineering Roadmap',
                    '3-Tier Cloud Architecture',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPrompt(chip)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Instant Starter Templates Grid */}
              <div className="w-full max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <span>⚡</span> 1-Click Starter Templates
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Instant launch • Fully editable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Template 1: SOP Pipeline */}
                  <div
                    onClick={() => {
                      updateDiagramWithHistory({
                        version: '1.0',
                        diagramType: 'process_flow',
                        title: 'Process Architecture Pipeline',
                        summary: 'Standard operating procedure from intake to deployment',
                        theme: 'dark',
                        viewMode: 'canvas',
                        nodes: [
                          { id: 'node_1', label: '1. Intake & Scope', sublabel: 'Requirements & mandate brief', type: 'start', order: 1, badge: '01', icon: 'Search', x: 100, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
                          { id: 'node_2', label: '2. Architecture & Design', sublabel: 'Core logic & modular specifications', type: 'process', order: 2, badge: '02', icon: 'Zap', x: 380, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 } },
                          { id: 'node_3', label: '3. Verification & QA', sublabel: 'Automated test suite & security audit', type: 'process', order: 3, badge: '03', icon: 'Shield', x: 660, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
                          { id: 'node_4', label: '4. Final Release', sublabel: 'Production rollout & SLA telemetry', type: 'end', order: 4, badge: '04', icon: 'Target', x: 940, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
                        ],
                        edges: [
                          { id: 'e1_2', source: 'node_1', target: 'node_2', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e2_3', source: 'node_2', target: 'node_3', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e3_4', source: 'node_3', target: 'node_4', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
                        ],
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-cyan-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 text-sm group-hover:scale-110 transition-transform">
                          🚀
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Flowchart
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                        Standard Operating Procedure (SOP)
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        Step-by-step workflow tracking progress from initial intake to deployment.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">4 Sequential Stages</span>
                      <button
                        type="button"
                        className="text-[11px] font-bold text-cyan-400 group-hover:underline cursor-pointer"
                      >
                        Start with Simple Canvas Template →
                      </button>
                    </div>
                  </div>

                  {/* Template 2: Product Roadmap */}
                  <div
                    onClick={() => {
                      updateDiagramWithHistory({
                        version: '1.0',
                        diagramType: 'timeline',
                        title: 'Product & Engineering Roadmap',
                        summary: 'Chronological roadmap milestones across quarterly phases',
                        theme: 'dark',
                        viewMode: 'canvas',
                        nodes: [
                          { id: 'r1', label: 'Phase 1: Architecture Alpha', sublabel: 'Deliverable: Core system foundation & APIs', type: 'start', order: 1, badge: 'Q1', icon: 'Layers', x: 100, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
                          { id: 'r2', label: 'Phase 2: Beta Launch', sublabel: 'Deliverable: Public preview & initial user cohort', type: 'process', order: 2, badge: 'Q2', icon: 'Zap', x: 380, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 } },
                          { id: 'r3', label: 'Phase 3: Scale & Hardening', sublabel: 'Deliverable: Enterprise SLAs & performance tuning', type: 'process', order: 3, badge: 'Q3', icon: 'Shield', x: 660, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
                          { id: 'r4', label: 'Phase 4: Global Availability', sublabel: 'Deliverable: Multi-region rollout & ecosystem', type: 'end', order: 4, badge: 'Q4', icon: 'Target', x: 940, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
                        ],
                        edges: [
                          { id: 'e_r1_r2', source: 'r1', target: 'r2', label: 'Proceed', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_r2_r3', source: 'r2', target: 'r3', label: 'Validate', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_r3_r4', source: 'r3', target: 'r4', label: 'Ship', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
                        ],
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 text-sm group-hover:scale-110 transition-transform">
                          📅
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Timeline
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
                        Product & Engineering Roadmap
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        Chronological milestone track showing quarterly deliveries and target goals.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Q1–Q4 Milestones</span>
                      <span className="text-[11px] font-bold text-amber-400 group-hover:underline">Load Roadmap →</span>
                    </div>
                  </div>

                  {/* Template 3: Organization Hierarchy */}
                  <div
                    onClick={() => {
                      updateDiagramWithHistory({
                        version: '1.0',
                        diagramType: 'hierarchy',
                        title: 'Team & Organization Structure',
                        summary: 'Hierarchical breakdown of leadership, product, engineering and operations',
                        theme: 'dark',
                        viewMode: 'canvas',
                        nodes: [
                          { id: 'h1', label: 'Executive Leadership', sublabel: 'Strategic vision & operational mandate', type: 'start', order: 1, badge: 'Tier 1', icon: 'Shield', x: 500, y: 120, width: 240, height: 110, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', textColor: '#c084fc', borderWidth: 2 } },
                          { id: 'h2', label: 'Product Engineering', sublabel: 'Platform architects & core engineering', type: 'process', order: 2, badge: 'Tier 2', icon: 'Zap', x: 220, y: 320, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
                          { id: 'h3', label: 'Product & Design', sublabel: 'User experience & feature specifications', type: 'process', order: 3, badge: 'Tier 2', icon: 'Layers', x: 500, y: 320, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
                          { id: 'h4', label: 'Client Success & Ops', sublabel: 'Implementation & enterprise customer support', type: 'end', order: 4, badge: 'Tier 2', icon: 'Target', x: 780, y: 320, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
                        ],
                        edges: [
                          { id: 'e_h1_h2', source: 'h1', target: 'h2', label: 'Leads', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_h1_h3', source: 'h1', target: 'h3', label: 'Leads', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_h1_h4', source: 'h1', target: 'h4', label: 'Leads', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                        ],
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-violet-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-violet-500/15 text-violet-400 text-sm group-hover:scale-110 transition-transform">
                          🏢
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          Org Chart
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-violet-400 transition-colors">
                        Organization & System Hierarchy
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        Top-down org tree showing reporting tiers, departmental roles, and services.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Hierarchical Tree</span>
                      <span className="text-[11px] font-bold text-violet-400 group-hover:underline">Load Hierarchy →</span>
                    </div>
                  </div>

                  {/* Template 4: Agile Continuous Flywheel */}
                  <div
                    onClick={() => {
                      updateDiagramWithHistory({
                        version: '1.0',
                        diagramType: 'circular_loop',
                        title: 'Continuous Agile Flywheel',
                        summary: 'Self-reinforcing agile feedback loop: Plan, Build, Launch, Measure',
                        theme: 'dark',
                        viewMode: 'canvas',
                        nodes: [
                          { id: 'f1', label: '1. Discover & Plan', sublabel: 'User feedback, telemetry & roadmap planning', type: 'start', order: 1, badge: 'Step 1', icon: 'Search', x: 490, y: 120, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
                          { id: 'f2', label: '2. Build & Test', sublabel: 'Iterative sprint engineering & code review', type: 'process', order: 2, badge: 'Step 2', icon: 'Zap', x: 740, y: 280, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 } },
                          { id: 'f3', label: '3. Deploy & Deliver', sublabel: 'Production rollout with zero downtime', type: 'process', order: 3, badge: 'Step 3', icon: 'Target', x: 490, y: 440, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
                          { id: 'f4', label: '4. Measure & Learn', sublabel: 'Usage analytics, user feedback & KPI review', type: 'end', order: 4, badge: 'Step 4', icon: 'RotateCw', x: 240, y: 280, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
                        ],
                        edges: [
                          { id: 'e_f1_f2', source: 'f1', target: 'f2', label: 'Build', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_f2_f3', source: 'f2', target: 'f3', label: 'Deploy', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_f3_f4', source: 'f3', target: 'f4', label: 'Analyze', style: 'solid', customStyle: { routing: 'curved', color: '#10b981', strokeWidth: 2, arrowMarker: 'arrow' } },
                          { id: 'e_f4_f1', source: 'f4', target: 'f1', label: 'Iterate', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
                        ],
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm group-hover:scale-110 transition-transform">
                          🔄
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Flywheel
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                        Continuous Agile Flywheel Loop
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        Circular cycle for agile sprints, user feedback, and continuous product improvement.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]/70 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">4-Stage Cycle</span>
                      <span className="text-[11px] font-bold text-emerald-400 group-hover:underline">Load Flywheel →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Save Confirmation Guard Modal */}
      {isSavePromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-prompt-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--bg-surface)] p-6 shadow-2xl shadow-amber-500/10 text-[var(--text-primary)]">
            {/* Close / Cancel X button */}
            <button
              type="button"
              onClick={() => {
                setIsSavePromptOpen(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Cancel"
            >
              <X size={16} />
            </button>

            {/* Header with amber bookmark icon */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-500 shrink-0">
                <Bookmark size={22} className="text-amber-500" />
              </div>
              <div>
                <h3 id="save-prompt-modal-title" className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {pendingAction?.title || 'Save your visual before continuing?'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  You are about to {pendingAction?.description || 'delete your canvas'}. Save a copy to your Blueprints library so your work is never lost.
                </p>
              </div>
            </div>

            {/* Diagram summary & name edit */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 mb-5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">Blueprint Name:</span>
                <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                  {diagram?.nodes?.length || 0} stages
                </span>
              </div>
              <input
                type="text"
                value={savePromptName}
                onChange={(e) => setSavePromptName(e.target.value)}
                placeholder="Blueprint name..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Save Blueprint and continue */}
              <button
                type="button"
                onClick={handleConfirmSaveAndProceed}
                disabled={isSavingFromPrompt}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#C87514] via-[#E39A3D] to-[#F59E0B] hover:brightness-110 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isSavingFromPrompt ? (
                  <RefreshCw size={14} className="animate-spin text-white" />
                ) : (
                  <Check size={14} className="text-white" />
                )}
                <span>{isSavingFromPrompt ? 'Saving to Blueprints...' : 'Save Blueprint & Continue'}</span>
              </button>

              {/* Download backup and Don't Save */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackupOnly}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title="Download diagram spec JSON to your computer"
                >
                  <Download size={13} className="text-cyan-500" />
                  <span>Download JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleDiscardAndProceed}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 transition-all cursor-pointer"
                  title="Discard without saving"
                >
                  <RotateCcw size={13} />
                  <span>Don't Save</span>
                </button>
              </div>

              {/* Keep editing / Cancel */}
              <button
                type="button"
                onClick={() => {
                  setIsSavePromptOpen(false);
                  setPendingAction(null);
                }}
                className="w-full text-center py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mt-1"
              >
                Keep Editing Canvas (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MY PROJECTS & SAVED PROGRESS MODAL                             */}
      {/* ============================================================== */}
      {isProjectsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsProjectsModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Workspace Projects & Shared Templates</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Switch between your saved visuals or apply team-shared design blueprints with automatic step scaling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProjectsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs: My Projects vs Team / Community Templates */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <button
                type="button"
                onClick={() => setProjectsModalTab('my_projects')}
                className={clsx(
                  "pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                  projectsModalTab === 'my_projects'
                    ? "border-amber-500 text-amber-500 dark:text-amber-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <FolderOpen size={13} />
                <span>My Projects</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 font-mono font-bold">
                  {savedTemplates.filter((t) => !t.created_by || t.created_by === userId).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProjectsModalTab('community_templates')}
                className={clsx(
                  "pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                  projectsModalTab === 'community_templates'
                    ? "border-cyan-500 text-cyan-500 dark:text-cyan-400"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Share2 size={13} />
                <span>Team & Community Templates</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 font-mono font-bold">
                  {savedTemplates.filter((t) => t.is_public).length}
                </span>
              </button>
            </div>

            {/* Project List / Community Template List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {projectsModalTab === 'community_templates' && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs mb-3">
                  <Shield size={16} className="shrink-0 text-cyan-500" />
                  <span className="leading-relaxed">
                    <strong>Strict Design Privacy:</strong> When applying shared templates, only the visual structure, layout geometry, colors, and styles are used. Proprietary user data is automatically sanitized into generic stage placeholders or mapped to your active document.
                  </span>
                </div>
              )}

              {projectsModalTab === 'my_projects' ? (
                savedTemplates.filter((t) => !t.created_by || t.created_by === userId).length === 0 ? (
                  <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                    <FolderOpen size={36} className="mx-auto opacity-30 text-amber-500" />
                    <p className="text-sm font-medium">No saved personal projects found</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Use the "Save Progress" button at top to save diagrams here!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedTemplates
                      .filter((t) => !t.created_by || t.created_by === userId)
                      .map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => handleOpenSavedProject(proj)}
                          className="group relative flex flex-col justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer shadow-xs hover:shadow-md"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-500 line-clamp-1">
                                {proj.name}
                              </h4>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedProject(proj.id, e)}
                                title="Delete project"
                                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-rose-500 rounded transition-opacity"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                              {proj.diagram?.summary || 'Saved custom architecture & workflow flow.'}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/60 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                            <span className="flex items-center gap-1">
                              <Layers size={11} className="text-amber-500" />
                              {proj.nodeCount || proj.diagram?.nodes?.length || 0} nodes
                            </span>
                            <span className="flex items-center gap-1.5 text-amber-500 font-bold group-hover:translate-x-0.5 transition-transform">
                              Open <Play size={10} />
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )
              ) : (
                /* Team & Community Templates Tab */
                savedTemplates.filter((t) => t.is_public).length === 0 ? (
                  <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                    <Share2 size={36} className="mx-auto opacity-30 text-cyan-500" />
                    <p className="text-sm font-medium">No team design templates published yet</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      When anyone in the workspace saves a diagram with "Save Progress", its design blueprint will appear here for the entire team!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedTemplates
                      .filter((t) => t.is_public)
                      .map((proj) => (
                        <div
                          key={proj.id}
                          className="group relative flex flex-col justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all shadow-xs hover:shadow-md"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-500 line-clamp-1">
                                {proj.name}
                              </h4>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
                                Design Only
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <Users size={10} /> {proj.created_by_name || 'Team Colleague'}
                              </span>
                              <span>•</span>
                              <span>{proj.nodeCount || proj.diagram?.nodes?.length || 0} stages</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                              {proj.diagram?.summary || 'Reusable visual architecture and workflow layout.'}
                            </p>
                          </div>

                          {/* Quick Scale Buttons (Data kam/zyada ho toh adapt kare) */}
                          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]/60">
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
                              <span>Auto-Scale Steps:</span>
                              <span className="text-[9px] font-mono">click step count</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[3, 4, 5, 6, 8].map((count) => (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => handleScaleAndApplyTemplate(proj, count)}
                                  className="flex-1 py-1 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-surface-hover)] hover:bg-cyan-500/20 hover:text-cyan-500 dark:hover:text-cyan-300 border border-[var(--border-subtle)] hover:border-cyan-500/40 transition-colors cursor-pointer text-center"
                                  title={`Adapt this template to exact ${count} steps`}
                                >
                                  {count}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Primary Apply Actions */}
                          <div className="mt-3 pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyCommunityDesign(proj)}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-bold text-[10px] transition-colors cursor-pointer"
                              title="Apply this template's design blueprint"
                            >
                              <Play size={10} /> Use Design
                            </button>

                            {diagram?.nodes && diagram.nodes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAdaptTemplateToActiveCanvas(proj)}
                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                                title="Map current canvas content into this template's visual design"
                              >
                                <Zap size={10} /> Adapt Data
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {savedTemplates.length} {savedTemplates.length === 1 ? 'project' : 'projects'} available
              </span>
              <button
                type="button"
                onClick={() => {
                  handleClearAll();
                  setIsProjectsModalOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all cursor-pointer"
              >
                <RotateCcw size={12} className="text-amber-500" /> Start Fresh Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
