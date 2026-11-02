import React, { useState, useRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toSvg } from 'html-to-image';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Play,
  CheckCircle2,
  GitBranch,
  Layers,
  Database,
  Trash2,
  Plus,
  Edit2,
  Clock,
  ArrowRight,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  ShieldCheck,
  UserCheck,
  Ticket,
  Zap,
  FileText,
  Send,
  Target,
  Search,
  Settings,
  Cpu,
  AlertTriangle,
  Users,
  Check,
  Milestone,
  Columns,
  RotateCw,
  LayoutGrid,
  Filter,
  Grid2x2,
  Share2,
  Code2,
  Copy,
  CheckCheck,
  Palette,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Undo2,
  Redo2,
  FileCode,
  Compass,
  Download,
  Sliders,
  Bookmark,
  BookmarkPlus,
  Save,
  UploadCloud,
  FileJson,
  HelpCircle,
  Keyboard,
  Paintbrush,
} from 'lucide-react';
import type { DiagramSpec, NodeSpec, NodeShape, EdgeStrokeStyle, ArrowMarkerType } from './types';
import { InteractiveCanvas, type InteractiveCanvasRef } from './InteractiveCanvas';
import { MapDatasetModal } from './MapDatasetModal';
import { applyTemplateToDataset } from './templateMapper';

export interface StudioTemplateItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  node_count: number;
  diagram: DiagramSpec;
  is_public: boolean;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export type AestheticTheme = 'bbot-dark' | 'whiteboard' | 'cyberpunk' | 'emerald' | 'gradient';

export interface SpectrumColor {
  border: string;
  bg: string;
  text: string;
  glow: string;
  badgeBg: string;
}

const SPECTRUM_THEME_PALETTES: Record<string, SpectrumColor[]> = {
  'bbot-dark': [
    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', text: '#22d3ee', glow: 'rgba(6, 182, 212, 0.35)', badgeBg: 'rgba(6, 182, 212, 0.15)' },
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', text: '#a78bfa', glow: 'rgba(139, 92, 246, 0.35)', badgeBg: 'rgba(139, 92, 246, 0.15)' },
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.35)', badgeBg: 'rgba(245, 158, 11, 0.15)' },
    { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)', text: '#fb7185', glow: 'rgba(244, 63, 94, 0.35)', badgeBg: 'rgba(244, 63, 94, 0.15)' },
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', text: '#34d399', glow: 'rgba(16, 185, 129, 0.35)', badgeBg: 'rgba(16, 185, 129, 0.15)' },
    { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', text: '#60a5fa', glow: 'rgba(59, 130, 246, 0.35)', badgeBg: 'rgba(59, 130, 246, 0.15)' },
  ],
  'whiteboard': [
    { border: '#0891b2', bg: '#f0fdfa', text: '#0e7490', glow: 'rgba(8, 145, 178, 0.12)', badgeBg: '#cffafe' },
    { border: '#7c3aed', bg: '#f5f3ff', text: '#6d28d9', glow: 'rgba(124, 58, 237, 0.12)', badgeBg: '#ede9fe' },
    { border: '#d97706', bg: '#fffbeb', text: '#b45309', glow: 'rgba(217, 119, 6, 0.12)', badgeBg: '#fef3c7' },
    { border: '#e11d48', bg: '#fff1f2', text: '#be123c', glow: 'rgba(225, 29, 72, 0.12)', badgeBg: '#ffe4e6' },
    { border: '#059669', bg: '#ecfdf5', text: '#047857', glow: 'rgba(5, 150, 105, 0.12)', badgeBg: '#d1fae5' },
    { border: '#2563eb', bg: '#eff6ff', text: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.12)', badgeBg: '#dbeafe' },
  ],
  'cyberpunk': [
    { border: '#00f0ff', bg: 'rgba(0, 240, 255, 0.12)', text: '#00f0ff', glow: 'rgba(0, 240, 255, 0.55)', badgeBg: 'rgba(0, 240, 255, 0.22)' },
    { border: '#ff007f', bg: 'rgba(255, 0, 127, 0.12)', text: '#ff007f', glow: 'rgba(255, 0, 127, 0.55)', badgeBg: 'rgba(255, 0, 127, 0.22)' },
    { border: '#ffe600', bg: 'rgba(255, 230, 0, 0.12)', text: '#ffe600', glow: 'rgba(255, 230, 0, 0.55)', badgeBg: 'rgba(255, 230, 0, 0.22)' },
    { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', glow: 'rgba(168, 85, 247, 0.55)', badgeBg: 'rgba(168, 85, 247, 0.22)' },
    { border: '#00ff66', bg: 'rgba(0, 255, 102, 0.12)', text: '#00ff66', glow: 'rgba(0, 255, 102, 0.55)', badgeBg: 'rgba(0, 255, 102, 0.22)' },
    { border: '#ff3366', bg: 'rgba(255, 51, 102, 0.12)', text: '#ff3366', glow: 'rgba(255, 51, 102, 0.55)', badgeBg: 'rgba(255, 51, 102, 0.22)' },
  ],
  'emerald': [
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.09)', text: '#34d399', glow: 'rgba(16, 185, 129, 0.4)', badgeBg: 'rgba(16, 185, 129, 0.18)' },
    { border: '#059669', bg: 'rgba(5, 150, 105, 0.09)', text: '#10b981', glow: 'rgba(5, 150, 105, 0.4)', badgeBg: 'rgba(5, 150, 105, 0.18)' },
    { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.09)', text: '#2dd4bf', glow: 'rgba(20, 184, 166, 0.4)', badgeBg: 'rgba(20, 184, 166, 0.18)' },
    { border: '#065f46', bg: 'rgba(6, 95, 70, 0.14)', text: '#6ee7b7', glow: 'rgba(6, 95, 70, 0.4)', badgeBg: 'rgba(6, 95, 70, 0.25)' },
    { border: '#34d399', bg: 'rgba(52, 211, 153, 0.09)', text: '#a7f3d0', glow: 'rgba(52, 211, 153, 0.4)', badgeBg: 'rgba(52, 211, 153, 0.18)' },
    { border: '#047857', bg: 'rgba(4, 120, 87, 0.12)', text: '#34d399', glow: 'rgba(4, 120, 87, 0.4)', badgeBg: 'rgba(4, 120, 87, 0.2)' },
  ],
};
SPECTRUM_THEME_PALETTES['gradient'] = SPECTRUM_THEME_PALETTES['cyberpunk'];

function getSpectrumColor(index: number, _total?: number, theme: AestheticTheme = 'bbot-dark'): SpectrumColor {
  const activePalette = SPECTRUM_THEME_PALETTES[theme] || SPECTRUM_THEME_PALETTES['bbot-dark'];
  return activePalette[index % activePalette.length];
}

interface FlowConnectorProps {
  sourceId: string;
  targetId: string;
  label?: string;
  color?: string;
  onInsertBetween?: (sourceId: string, targetId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  onUpdateLabel?: (sourceId: string, targetId: string, newLabel: string) => void;
  strokeStyle?: EdgeStrokeStyle;
  strokeWidth?: number;
  arrowMarker?: ArrowMarkerType;
  onUpdateMarker?: (sourceId: string, targetId: string, marker: ArrowMarkerType) => void;
}

function FlowConnector({
  sourceId,
  targetId,
  label,
  color = 'var(--accent)',
  onInsertBetween,
  orientation = 'horizontal',
  onUpdateLabel,
  strokeStyle = 'animated',
  strokeWidth = 2,
  arrowMarker = 'arrow',
  onUpdateMarker,
}: FlowConnectorProps) {
  const markerId = `arrow-${sourceId.replace(/[^a-zA-Z0-9_-]/g, '')}-${targetId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [edgeText, setEdgeText] = useState(label || '');

  React.useEffect(() => {
    setEdgeText(label || '');
  }, [label]);

  const handleSaveLabel = () => {
    setIsEditingLabel(false);
    if (onUpdateLabel) {
      onUpdateLabel(sourceId, targetId, edgeText);
    }
  };

  const handleCycleMarker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateMarker) return;
    const nextMarker: ArrowMarkerType =
      arrowMarker === 'arrow' ? 'both' : arrowMarker === 'both' ? 'none' : 'arrow';
    onUpdateMarker(sourceId, targetId, nextMarker);
  };

  if (orientation === 'vertical') {
    return (
      <div className="relative group/conn flex flex-col items-center justify-center shrink-0 py-1 px-2 my-0.5">
        <div className="flex items-center gap-1 mb-1">
          {isEditingLabel ? (
          <input
            type="text"
            value={edgeText}
            onChange={(e) => setEdgeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') {
                setIsEditingLabel(false);
                setEdgeText(label || '');
              }
            }}
            onBlur={handleSaveLabel}
            autoFocus
            className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full border border-[var(--accent)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md w-24 text-center focus:outline-none mb-1 z-30"
          />
        ) : label ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingLabel(true);
            }}
            className={`cursor-pointer text-[0.62rem] font-bold px-2 py-0.5 rounded-full border shadow-xs mb-1 transition-all hover:scale-105 hover:border-[var(--accent)] ${/yes|approved|critical|high/i.test(label)
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                : /no|rework|escalat|fail/i.test(label)
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-muted)] dark:border-[var(--border-subtle)]'
              }`}
            title="Click to edit connector label inline"
          >
            {label}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEdgeText('');
              setIsEditingLabel(true);
            }}
            className="opacity-0 group-hover/conn:opacity-100 text-[0.58rem] font-medium px-1.5 py-0.2 rounded-full border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] mb-1 transition-all cursor-pointer bg-[var(--bg-surface)]/80"
            title="Add connector label"
          >
            + label
          </button>
        )}

          {/* Quick Arrow Head Changer */}
          {onUpdateMarker && (
            <button
              type="button"
              data-interactive="true"
              data-export-exclude="true"
              onClick={handleCycleMarker}
              className="opacity-0 group-hover/conn:opacity-100 transition-all text-[0.58rem] font-bold px-1.5 py-0.2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 cursor-pointer shadow-xs mb-1"
              title={`Arrowhead: ${arrowMarker || 'arrow'} (Click to cycle: Single ⟶ | Dual ⟷ | None)`}
            >
              {arrowMarker === 'both' ? '⟷ Dual' : arrowMarker === 'none' ? '─ Line' : '⟶ Single'}
            </button>
          )}
        </div>

        <div className="relative flex flex-col items-center justify-center">
          <svg width="24" height="42" className="overflow-visible">
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="7.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 L 3.2 5 Z" fill={color} stroke={color} strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
              </marker>
              <marker
                id={`${markerId}-start`}
                viewBox="0 0 10 10"
                refX="2.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 8.5 1.8 L 2 5 L 8.5 8.2 L 6.8 5 Z" fill={color} stroke={color} strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
              </marker>
            </defs>
            <line
              x1="12"
              y1="2"
              x2="12"
              y2="34"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity="0.3"
            />
            <line
              x1="12"
              y1="2"
              x2="12"
              y2="34"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeStyle === 'dashed' ? '5 4' : strokeStyle === 'solid' ? undefined : '4 3'}
              className={strokeStyle === 'solid' ? undefined : 'flow-connector-line'}
              markerEnd={arrowMarker !== 'none' ? `url(#${markerId})` : undefined}
              markerStart={arrowMarker === 'both' ? `url(#${markerId}-start)` : undefined}
            />
          </svg>

          {onInsertBetween && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInsertBetween(sourceId, targetId);
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/conn:opacity-100 transition-all duration-150 scale-75 group-hover/conn:scale-100 h-5 w-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg z-20 cursor-pointer"
              title="Insert stage here (+)"
            >
              <Plus size={12} strokeWidth={2.8} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/conn flex flex-col items-center justify-center shrink-0 px-1 py-1">
      <div className="flex items-center gap-1 mb-1.5">
        {isEditingLabel ? (
        <input
          type="text"
          value={edgeText}
          onChange={(e) => setEdgeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveLabel();
            if (e.key === 'Escape') {
              setIsEditingLabel(false);
              setEdgeText(label || '');
            }
          }}
          onBlur={handleSaveLabel}
          autoFocus
          className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full border border-[var(--accent)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md w-24 text-center focus:outline-none mb-1.5 z-30"
        />
      ) : label ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingLabel(true);
          }}
          className={`cursor-pointer text-[0.62rem] font-bold px-2 py-0.5 rounded-full border shadow-xs mb-1.5 transition-all hover:scale-105 hover:border-[var(--accent)] ${/yes|approved|critical|high/i.test(label)
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
              : /no|rework|escalat|fail/i.test(label)
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                : 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-muted)] dark:border-[var(--border-subtle)]'
            }`}
          title="Click to edit connector label inline"
        >
          {label}
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEdgeText('');
            setIsEditingLabel(true);
          }}
          className="opacity-0 group-hover/conn:opacity-100 text-[0.58rem] font-medium px-1.5 py-0.2 rounded-full border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] mb-1.5 transition-all cursor-pointer bg-[var(--bg-surface)]/80"
          title="Add connector label"
        >
          + label
        </button>
      )}

        {/* Quick Arrow Head Changer */}
        {onUpdateMarker && (
          <button
            type="button"
            data-interactive="true"
            data-export-exclude="true"
            onClick={handleCycleMarker}
            className="opacity-0 group-hover/conn:opacity-100 transition-all text-[0.58rem] font-bold px-1.5 py-0.2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 cursor-pointer shadow-xs mb-1.5 ml-1"
            title={`Arrowhead: ${arrowMarker || 'arrow'} (Click to switch: Single ⟶ | Dual ⟷ | None)`}
          >
            {arrowMarker === 'both' ? '⟷ Dual' : arrowMarker === 'none' ? '─ Line' : '⟶ Single'}
          </button>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <svg width="44" height="20" className="overflow-visible">
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 L 3.2 5 Z" fill={color} stroke={color} strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
            </marker>
            <marker
              id={`${markerId}-start`}
              viewBox="0 0 10 10"
              refX="2.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 8.5 1.8 L 2 5 L 8.5 8.2 L 6.8 5 Z" fill={color} stroke={color} strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
            </marker>
          </defs>
          <line
            x1="2"
            y1="10"
            x2="38"
            y2="10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity="0.3"
          />
          <line
            x1="2"
            y1="10"
            x2="38"
            y2="10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeStyle === 'dashed' ? '5 4' : strokeStyle === 'solid' ? undefined : '4 3'}
            className={strokeStyle === 'solid' ? undefined : 'flow-connector-line'}
            markerEnd={arrowMarker !== 'none' ? `url(#${markerId})` : undefined}
            markerStart={arrowMarker === 'both' ? `url(#${markerId}-start)` : undefined}
          />
        </svg>

        {onInsertBetween && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInsertBetween(sourceId, targetId);
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/conn:opacity-100 transition-all duration-150 scale-75 group-hover/conn:scale-100 h-5 w-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg z-20 cursor-pointer"
            title="Insert stage here (+)"
          >
            <Plus size={12} strokeWidth={2.8} />
          </button>
        )}
      </div>
    </div>
  );
}

export interface DiagramCanvasRef {
  exportPng: () => Promise<Blob | null>;
  exportPngDataUrl: () => Promise<string | null>;
  exportSvg: () => Promise<string | null>;
  exportPdf: () => Promise<Blob | null>;
  getViewMode: () => 'template' | 'canvas';
  undo: () => void;
  redo: () => void;
  saveProgress: () => Promise<void>;
}

export interface DiagramCanvasProps {
  diagram: DiagramSpec;
  theme?: string;
  onUpdateDiagram: (updated: DiagramSpec, previousSnapshot?: DiagramSpec) => void;
  onRequestClearCanvas?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const PALETTE_COLORS = [
  '#C87514', // bbot Warm Amber
  '#E39A3D', // bbot Golden Amber
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#d946ef', // Fuchsia
  '#8b5cf6', // Violet
];

const AVAILABLE_ICONS = [
  { name: 'ShieldCheck', label: 'Security' },
  { name: 'Database', label: 'Database' },
  { name: 'UserCheck', label: 'User / HR' },
  { name: 'Ticket', label: 'Ticket' },
  { name: 'Zap', label: 'Fast / Urgent' },
  { name: 'GitBranch', label: 'Decision' },
  { name: 'Settings', label: 'Config / Sys' },
  { name: 'CheckCircle2', label: 'Complete' },
  { name: 'Clock', label: 'Time / SLA' },
  { name: 'FileText', label: 'Document' },
  { name: 'Send', label: 'Deliver' },
  { name: 'Target', label: 'Goal' },
  { name: 'Search', label: 'Diagnose' },
  { name: 'Layers', label: 'Structure' },
  { name: 'Cpu', label: 'Hardware' },
  { name: 'AlertTriangle', label: 'Risk' },
  { name: 'Filter', label: 'Funnel' },
  { name: 'Grid2x2', label: 'Matrix' },
];

function resolveSemanticIcon(label: string, sublabel?: string, nodeType?: string): string {
  const combined = `${label} ${sublabel || ''} ${nodeType || ''}`.toLowerCase();
  if (/(funnel|filter|pipeline|qualification|intake|drop-off)/.test(combined)) return 'Filter';
  if (/(matrix|quadrant|grid|prioritization|evaluation)/.test(combined)) return 'Grid2x2';
  if (/(security|shield|protect|auth|permission|credential|compliance|firewall)/.test(combined)) return 'ShieldCheck';
  if (/(database|store|storage|sql|record|repository|archive|backup)/.test(combined)) return 'Database';
  if (/(user|employee|hr|member|customer|person|joiner|mover|leaver|hiring|lead|manager)/.test(combined)) return 'UserCheck';
  if (/(ticket|helpdesk|intake|log|support request)/.test(combined)) return 'Ticket';
  if (/(urgent|critical|emergency|p1|p2|breach|threat|outage|escalat|zap)/.test(combined)) return 'Zap';
  if (/(decision|triage|assess|criteria|validate|check|condition|branch|review)/.test(combined)) return 'GitBranch';
  if (/(configure|setup|system|hardware|network|patch|infrastructure|tool|device)/.test(combined)) return 'Settings';
  if (/(complete|close|resolve|resolved|verified|accept|sign-off|done|finish)/.test(combined)) return 'CheckCircle2';
  if (/(time|schedule|period|timeline|delay|phase|quarter|milestone)/.test(combined)) return 'Clock';
  if (/(document|doc|sop|policy|guideline|manual|report|file|contract)/.test(combined)) return 'FileText';
  if (/(send|deliver|ship|dispatch|transmit|handoff|notify)/.test(combined)) return 'Send';
  if (/(target|goal|objective|priority|kpi|mission)/.test(combined)) return 'Target';
  if (/(diagnose|investigate|troubleshoot|root cause|search|inspect)/.test(combined)) return 'Search';
  if (nodeType === 'start') return 'Play';
  if (nodeType === 'decision') return 'GitBranch';
  if (nodeType === 'end') return 'CheckCircle2';
  return 'Layers';
}

function renderSemanticIcon(iconName: string, size = 15, className = '') {
  switch (iconName) {
    case 'ShieldCheck': return <ShieldCheck size={size} className={className} />;
    case 'Database': return <Database size={size} className={className} />;
    case 'UserCheck': return <UserCheck size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'Ticket': return <Ticket size={size} className={className} />;
    case 'Zap': return <Zap size={size} className={className} />;
    case 'GitBranch': return <GitBranch size={size} className={className} />;
    case 'Settings': return <Settings size={size} className={className} />;
    case 'CheckCircle2': return <CheckCircle2 size={size} className={className} />;
    case 'Clock': return <Clock size={size} className={className} />;
    case 'FileText': return <FileText size={size} className={className} />;
    case 'Send': return <Send size={size} className={className} />;
    case 'Target': return <Target size={size} className={className} />;
    case 'Search': return <Search size={size} className={className} />;
    case 'Layers': return <Layers size={size} className={className} />;
    case 'Cpu': return <Cpu size={size} className={className} />;
    case 'AlertTriangle': return <AlertTriangle size={size} className={className} />;
    case 'Play': return <Play size={size} className={className} />;
    case 'Filter': return <Filter size={size} className={className} />;
    case 'Grid2x2': return <Grid2x2 size={size} className={className} />;
    default: return <Layers size={size} className={className} />;
  }
}

function polishNodeLocally(node: NodeSpec): NodeSpec {
  let label = node.label.trim();
  const acronyms: Array<{ regex: RegExp; rep: string }> = [
    { regex: /\bapi\b/gi, rep: 'API' },
    { regex: /\bui\b/gi, rep: 'UI' },
    { regex: /\bux\b/gi, rep: 'UX' },
    { regex: /\bdb\b/gi, rep: 'DB' },
    { regex: /\bsla\b/gi, rep: 'SLA' },
    { regex: /\bslo\b/gi, rep: 'SLO' },
    { regex: /\bkpi\b/gi, rep: 'KPI' },
    { regex: /\biam\b/gi, rep: 'IAM' },
    { regex: /\bsso\b/gi, rep: 'SSO' },
    { regex: /\brbac\b/gi, rep: 'RBAC' },
    { regex: /\bci\/cd\b/gi, rep: 'CI/CD' },
    { regex: /\bjwt\b/gi, rep: 'JWT' },
    { regex: /\baws\b/gi, rep: 'AWS' },
    { regex: /\bgcp\b/gi, rep: 'GCP' },
    { regex: /\bsql\b/gi, rep: 'SQL' },
  ];
  acronyms.forEach(({ regex, rep }) => {
    label = label.replace(regex, rep);
  });

  if (/^(start|begin)$/i.test(label)) label = 'Initialize System Pipeline';
  if (/^(process|execute)$/i.test(label)) label = 'Execute Core Processing Engine';
  if (/^(verify|check)$/i.test(label)) label = 'Perform Validation & Integrity Audit';
  if (/^(store|save)$/i.test(label)) label = 'Persist Transaction State in DB';
  if (/^(end|finish)$/i.test(label)) label = 'Finalize Output & Disseminate';

  let sublabel = (node.sublabel || '').trim();
  if (!sublabel || sublabel.length < 15) {
    const combined = `${label} ${node.type || ''}`.toLowerCase();
    if (/(auth|security|token|login)/.test(combined)) {
      sublabel = 'Enforces zero-trust authentication, JWT rotation, and RBAC audits.';
    } else if (/(data|db|store|persist|sql)/.test(combined)) {
      sublabel = 'Sub-10ms query latency with ACID compliance and automated failover.';
    } else if (/(validat|check|verify|audit)/.test(combined)) {
      sublabel = 'Executes schema validation, boundary checks, and automated compliance logging.';
    } else if (/(api|gateway|ingress)/.test(combined)) {
      sublabel = 'High-throughput edge routing with rate-limiting and TLS termination.';
    } else if (/(report|analytics|metric)/.test(combined)) {
      sublabel = 'Aggregates key operational KPIs into real-time executive dashboard telemetry.';
    } else {
      sublabel = 'Optimized for high-availability throughput and deterministic execution.';
    }
  } else {
    acronyms.forEach(({ regex, rep }) => {
      sublabel = sublabel.replace(regex, rep);
    });
    if (!sublabel.endsWith('.')) sublabel += '.';
  }

  let badge = node.badge;
  const combinedAll = `${label} ${sublabel}`.toLowerCase();
  if (!badge || /^\d+$/.test(badge) || badge.length <= 2) {
    if (/(sec|auth|token|shield)/.test(combinedAll)) badge = 'Zero-Trust';
    else if (/(latency|speed|fast|ms|sub-)/.test(combinedAll)) badge = 'SLA < 50ms';
    else if (/(critical|p1|urgent)/.test(combinedAll)) badge = 'P1 Critical';
    else if (/(data|db|sql|persist)/.test(combinedAll)) badge = '99.99% Avail';
    else if (node.type === 'start') badge = 'EntryPoint';
    else if (node.type === 'end') badge = 'FinalState';
    else if (node.order) badge = `Stage 0${node.order}`;
    else badge = 'Active';
  }

  const icon = resolveSemanticIcon(label, sublabel, node.type);

  let group = node.group;
  if (!group) {
    if (/(auth|sec|perm|token)/.test(combinedAll)) group = 'Security & Governance';
    else if (/(db|store|data|cache)/.test(combinedAll)) group = 'Data Infrastructure';
    else if (/(api|client|ui|gateway)/.test(combinedAll)) group = 'Ingress & Edge';
    else group = 'Core Operations';
  }

  return {
    ...node,
    label,
    sublabel,
    badge,
    icon,
    group,
  };
}

export interface StudioStarterPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  diagram: Partial<DiagramSpec>;
}

const STUDIO_STARTER_PRESETS: StudioStarterPreset[] = [
  {
    id: 'pipeline',
    name: 'Linear SOP Pipeline (4 Stages)',
    category: 'Workflows & Process',
    description: 'Intake & Scope → Architecture → Automated QA → Production Rollout',
    emoji: '🚀',
    diagram: {
      diagramType: 'process_flow',
      title: 'Standard Operating Procedure (SOP) Pipeline',
      summary: 'Structured linear lifecycle from requirement intake to production monitoring.',
      nodes: [
        {
          id: 'node_1',
          label: '1. Intake & Scope',
          sublabel: 'Requirements, inputs & mandate',
          type: 'start',
          order: 1,
          badge: '01',
          icon: 'Search',
          x: 100,
          y: 200,
          width: 230,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 },
        },
        {
          id: 'node_2',
          label: '2. Architecture & Build',
          sublabel: 'System design & core modules',
          type: 'process',
          order: 2,
          badge: '02',
          icon: 'Zap',
          x: 390,
          y: 200,
          width: 230,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 },
        },
        {
          id: 'node_3',
          label: '3. Verification & QA',
          sublabel: 'Automated test suite & audits',
          type: 'process',
          order: 3,
          badge: '03',
          icon: 'Shield',
          x: 680,
          y: 200,
          width: 230,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 },
        },
        {
          id: 'node_4',
          label: '4. Production Release',
          sublabel: 'Deployment & SLA monitoring',
          type: 'end',
          order: 4,
          badge: '04',
          icon: 'Target',
          x: 970,
          y: 200,
          width: 230,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 },
        },
      ],
      edges: [
        { id: 'e1_2', source: 'node_1', target: 'node_2', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e2_3', source: 'node_2', target: 'node_3', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e3_4', source: 'node_3', target: 'node_4', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
      ],
    },
  },
  {
    id: 'decision',
    name: 'Decision Gateway Flow',
    category: 'Workflows & Process',
    description: 'Condition gate branching to Approved Execution vs Escalation Review',
    emoji: '💎',
    diagram: {
      diagramType: 'process_flow',
      title: 'Risk Policy & Decision Gateway',
      summary: 'Automated policy validation and branch routing.',
      nodes: [
        {
          id: 'node_1',
          label: 'Service Request',
          sublabel: 'User submits transaction or ticket',
          type: 'start',
          order: 1,
          badge: 'IN',
          icon: 'Activity',
          x: 100,
          y: 200,
          width: 220,
          height: 105,
          customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 },
        },
        {
          id: 'node_2',
          label: 'Policy & Risk Gate',
          sublabel: 'Is request verified and approved?',
          type: 'decision',
          order: 2,
          badge: 'GATE',
          icon: 'GitBranch',
          x: 390,
          y: 190,
          width: 220,
          height: 125,
          customStyle: { shape: 'diamond', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', textColor: '#fbbf24', borderWidth: 2 },
        },
        {
          id: 'node_3',
          label: 'Instant Execution',
          sublabel: 'Approved: Dispatch task & notify',
          type: 'process',
          order: 3,
          badge: 'OK',
          icon: 'Zap',
          x: 700,
          y: 120,
          width: 230,
          height: 105,
          customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', textColor: '#34d399', borderWidth: 2 },
        },
        {
          id: 'node_4',
          label: 'Escalation Review',
          sublabel: 'Failed check: Route to manual triage',
          type: 'process',
          order: 4,
          badge: 'REVIEW',
          icon: 'Shield',
          x: 700,
          y: 290,
          width: 230,
          height: 105,
          customStyle: { shape: 'card', borderColor: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.15)', textColor: '#fb7185', borderWidth: 2 },
        },
      ],
      edges: [
        { id: 'e1_2', source: 'node_1', target: 'node_2', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e2_3', source: 'node_2', target: 'node_3', label: 'Approved (Yes)', style: 'solid', customStyle: { routing: 'curved', color: '#10b981', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e2_4', source: 'node_2', target: 'node_4', label: 'Escalate (No)', style: 'dashed', customStyle: { routing: 'curved', color: '#f43f5e', strokeWidth: 2, arrowMarker: 'arrow' } },
      ],
    },
  },
  {
    id: 'architecture',
    name: '3-Tier Cloud Architecture',
    category: 'System Architecture',
    description: 'Client WebApp → API Gateway (Proxy) → Order Engine → Distributed Database',
    emoji: '🏗️',
    diagram: {
      diagramType: 'concept_map',
      title: 'High-Availability 3-Tier Architecture',
      summary: 'Tiered architecture with secure ingress, business compute, and database persistence.',
      nodes: [
        {
          id: 'node_1',
          label: 'Client WebApp & Mobile',
          sublabel: 'React / Next.js user interface',
          type: 'start',
          order: 1,
          badge: 'CLIENT',
          icon: 'Users',
          x: 100,
          y: 200,
          width: 220,
          height: 105,
          customStyle: { shape: 'card', borderColor: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)', textColor: '#60a5fa', borderWidth: 2 },
        },
        {
          id: 'node_2',
          label: 'API Gateway & Ingress',
          sublabel: 'Reverse proxy, TLS & rate limit',
          type: 'process',
          order: 2,
          badge: 'PROXY',
          icon: 'Terminal',
          x: 390,
          y: 195,
          width: 220,
          height: 115,
          customStyle: { shape: 'terminal', borderColor: '#06b6d4', bgColor: '#18181b', textColor: '#22d3ee', borderWidth: 2 },
        },
        {
          id: 'node_3',
          label: 'Core Microservice Engine',
          sublabel: 'Business logic & task worker',
          type: 'process',
          order: 3,
          badge: 'ENGINE',
          icon: 'Box',
          x: 680,
          y: 195,
          width: 230,
          height: 115,
          customStyle: { shape: 'cuboid', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 },
        },
        {
          id: 'node_4',
          label: 'Database & State Store',
          sublabel: 'PostgreSQL primary & Redis cache',
          type: 'store',
          order: 4,
          badge: 'DATA',
          icon: 'Database',
          x: 980,
          y: 195,
          width: 220,
          height: 115,
          customStyle: { shape: 'cylinder', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 },
        },
      ],
      edges: [
        { id: 'e1_2', source: 'node_1', target: 'node_2', label: 'HTTPS /api', style: 'solid', customStyle: { routing: 'curved', color: '#3b82f6', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e2_3', source: 'node_2', target: 'node_3', label: 'gRPC Dispatch', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e3_4', source: 'node_3', target: 'node_4', label: 'SQL Connection', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
      ],
    },
  },
  {
    id: 'cicd',
    name: 'DevOps CI/CD Automation',
    category: 'DevOps & Infrastructure',
    description: 'Code Commit & PR → Automated Tests → Docker Build → Kubernetes Deploy',
    emoji: '🔄',
    diagram: {
      diagramType: 'timeline',
      title: 'Automated CI/CD Delivery Pipeline',
      summary: 'Continuous integration and zero-downtime deployment stages.',
      nodes: [
        { id: 'node_1', label: '1. Git Commit & PR', sublabel: 'Developer pushes branch & passes review', badge: 'VCS', icon: 'FileCode', x: 100, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
        { id: 'node_2', label: '2. Unit & Integration Tests', sublabel: 'Automated Vitest & Pytest suite execution', badge: 'TEST', icon: 'ShieldCheck', x: 380, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 } },
        { id: 'node_3', label: '3. Docker Container Build', sublabel: 'Multi-stage image compilation & vulnerability scan', badge: 'BUILD', icon: 'Layers', x: 660, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
        { id: 'node_4', label: '4. Kubernetes Cluster Rollout', sublabel: 'Canary deployment & live healthcheck verification', badge: 'PROD', icon: 'Target', x: 940, y: 200, width: 220, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
      ],
      edges: [
        { id: 'e1_2', source: 'node_1', target: 'node_2', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e2_3', source: 'node_2', target: 'node_3', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'e3_4', source: 'node_3', target: 'node_4', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
      ],
    },
  },
  {
    id: 'funnel',
    name: 'Customer Conversion Funnel',
    category: 'Product & Growth',
    description: 'Traffic Discovery → Account Signup → Product Tour → First Conversion',
    emoji: '🎯',
    diagram: {
      diagramType: 'funnel',
      title: 'Product Conversion & Retention Funnel',
      summary: 'Five-stage user acquisition, activation, and monetization pipeline.',
      nodes: [
        { id: 'f1', label: 'Top of Funnel: Website Visits', sublabel: 'Organic search & marketing campaigns', badge: '100% Vol', x: 100, y: 200, width: 210, height: 105, customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 } },
        { id: 'f2', label: 'Account Signup & Verification', sublabel: 'User creates credentials & verifies email', badge: '42% Conv', x: 350, y: 200, width: 210, height: 105, customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 } },
        { id: 'f3', label: 'Interactive Onboarding Tour', sublabel: 'User completes workspace configuration', badge: '28% Act', x: 600, y: 200, width: 210, height: 105, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
        { id: 'f4', label: 'First Core Action Milestone', sublabel: 'User creates their first document or visual', badge: '18% Value', x: 850, y: 200, width: 210, height: 105, customStyle: { shape: 'card', borderColor: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)', textColor: '#60a5fa', borderWidth: 2 } },
        { id: 'f5', label: 'Paid Subscription Retention', sublabel: 'Quarterly/annual plan renewal and advocacy', badge: '9% Ret', x: 1100, y: 200, width: 210, height: 105, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
      ],
      edges: [
        { id: 'ef_1_2', source: 'f1', target: 'f2', style: 'solid', customStyle: { routing: 'curved', color: '#06b6d4', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'ef_2_3', source: 'f2', target: 'f3', style: 'solid', customStyle: { routing: 'curved', color: '#8b5cf6', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'ef_3_4', source: 'f3', target: 'f4', style: 'solid', customStyle: { routing: 'curved', color: '#f59e0b', strokeWidth: 2, arrowMarker: 'arrow' } },
        { id: 'ef_4_5', source: 'f4', target: 'f5', style: 'solid', customStyle: { routing: 'curved', color: '#3b82f6', strokeWidth: 2, arrowMarker: 'arrow' } },
      ],
    },
  },
  {
    id: 'matrix',
    name: '2x2 Strategic Prioritization Matrix',
    category: 'Strategy & Analysis',
    description: 'Quick Wins, Major Bets, Low-Hanging Fruit, and Money Pits',
    emoji: '📊',
    diagram: {
      diagramType: 'quadrant',
      title: 'Impact vs Effort 2x2 Strategic Matrix',
      summary: 'Actionable feature prioritization framework.',
      nodes: [
        { id: 'q1', label: 'Quick Wins (High Impact, Low Effort)', sublabel: 'Streamlined visual export; Keyboard shortcuts; Dark theme', badge: 'DO NOW', x: 180, y: 160, width: 250, height: 115, customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 } },
        { id: 'q2', label: 'Major Bets (High Impact, High Effort)', sublabel: 'Realtime collaborative canvas; Custom LLM finetuning', badge: 'PLAN', x: 500, y: 160, width: 250, height: 115, customStyle: { shape: 'card', borderColor: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)', textColor: '#60a5fa', borderWidth: 2 } },
        { id: 'q3', label: 'Fill-Ins (Low Impact, Low Effort)', sublabel: 'Minor tooltip polish; Custom cursor trails', badge: 'DELEGATE', x: 180, y: 330, width: 250, height: 115, customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 } },
        { id: 'q4', label: 'Time Traps (Low Impact, High Effort)', sublabel: 'Legacy browser polyfills; Bespoke custom animation engines', badge: 'AVOID', x: 500, y: 330, width: 250, height: 115, customStyle: { shape: 'card', borderColor: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.12)', textColor: '#fb7185', borderWidth: 2 } },
      ],
      edges: [],
    },
  },
];

export const DiagramCanvas = React.forwardRef<DiagramCanvasRef, DiagramCanvasProps>(function DiagramCanvas(
  {
    diagram,
    theme: propTheme,
    onUpdateDiagram,
    onRequestClearCanvas,
    canUndo: propCanUndo,
    canRedo: propCanRedo,
    onUndo: propOnUndo,
    onRedo: propOnRedo,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const interactiveCanvasRef = useRef<InteractiveCanvasRef>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isMinimapOpen, setIsMinimapOpen] = useState<boolean>(true);
  const [enhancingNodeId, setEnhancingNodeId] = useState<string | null>(null);
  const [polishToast, setPolishToast] = useState<{ label: string; text: string } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>('');
  const [editSublabel, setEditSublabel] = useState<string>('');
  const [editType, setEditType] = useState<string>('process');
  const [editIcon, setEditIcon] = useState<string>('Layers');
  const [editBadge, setEditBadge] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showDataTable, setShowDataTable] = useState<boolean>(true);
  const isLightMode = propTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  const [aestheticTheme, setAestheticTheme] = useState<AestheticTheme>(() => isLightMode ? 'whiteboard' : 'bbot-dark');

  React.useEffect(() => {
    if (propTheme) {
      setAestheticTheme(propTheme === 'light' ? 'whiteboard' : 'bbot-dark');
    }
  }, [propTheme]);

  const [viewMode, setViewMode] = useState<'template' | 'canvas'>(() => diagram.viewMode || 'canvas');

  React.useEffect(() => {
    if (diagram.viewMode && diagram.viewMode !== viewMode) {
      setViewMode(diagram.viewMode);
    }
  }, [diagram.viewMode]);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [presentingIndex, setPresentingIndex] = useState<number>(0);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [copyMermaidSuccess, setCopyMermaidSuccess] = useState<boolean>(false);
  const [copySvgSuccess, setCopySvgSuccess] = useState<boolean>(false);
  const [isCopyingSvg, setIsCopyingSvg] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInput, setCopilotInput] = useState<string>('');
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [copilotNotice, setCopilotNotice] = useState<{ explanation: string; applied: string[] } | null>(null);
  const copilotInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Custom Styling State
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [customAccentColor, setCustomAccentColor] = useState<string>('#f59e0b');
  const [selectedNodeShape, setSelectedNodeShape] = useState<NodeShape>('card');
  const [connectorStrokeStyle, setConnectorStrokeStyle] = useState<EdgeStrokeStyle>('animated');
  const [connectorStrokeWidth, setConnectorStrokeWidth] = useState<number>(2);

  // Step 2: Template Library State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [templateTab, setTemplateTab] = useState<'presets' | 'saved' | 'json'>('presets');
  const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; createdAt: string; nodeCount: number; diagram: DiagramSpec }>>(() => {
    try {
      const stored = localStorage.getItem('bbot_user_templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [studioTemplates, setStudioTemplates] = useState<StudioTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState<string>('');
  const [saveTemplateCategory, setSaveTemplateCategory] = useState<string>('process_flow');
  const [saveTemplateIsPublic, setSaveTemplateIsPublic] = useState<boolean>(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonCopyToast, setJsonCopyToast] = useState<boolean>(false);
  const [mapDatasetTemplate, setMapDatasetTemplate] = useState<{ diagram: DiagramSpec; name: string } | null>(null);

  // Auto-Tidy State
  const [autoTidyToast, setAutoTidyToast] = useState<boolean>(false);
  // @ts-ignore
  const [_isSavingProgress, setIsSavingProgress] = useState<boolean>(false);
  // @ts-ignore
  const [_saveProgressToast, setSaveProgressToast] = useState<string | null>(null);

  // Dedicated 1-Click Save Progress Handler
  const handleSaveProgress = async () => {
    setIsSavingProgress(true);
    try {
      // 1. Save to studio localStorage snapshot
      const snapshot = {
        diagram,
        timestamp: Date.now(),
        lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      localStorage.setItem('bbot_visual_studio_state', JSON.stringify({ diagram, selectedType: diagram.diagramType }));
      localStorage.setItem('bbot_studio_saved_progress', JSON.stringify(snapshot));

      // 2. Also register in Saved Templates library so it persists across workspaces
      const titleName = diagram.title || 'Untitled Visual Diagram';
      const templateId = `prog_${Date.now()}`;
      const newEntry = {
        id: templateId,
        name: `${titleName} (Saved)`,
        createdAt: new Date().toLocaleDateString(),
        nodeCount: diagram.nodes?.length || 0,
        diagram: JSON.parse(JSON.stringify(diagram)),
      };
      const updatedLocal = [newEntry, ...savedTemplates.filter((s) => s.id !== templateId)];
      setSavedTemplates(updatedLocal);
      try {
        localStorage.setItem('bbot_user_templates', JSON.stringify(updatedLocal));
      } catch {}

      // 3. Sync to backend templates database
      try {
        await fetch('/api/visual-studio/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `${titleName}`,
            description: diagram.summary || 'Saved user canvas progress',
            category: diagram.diagramType || 'process_flow',
            diagram: diagram,
            is_public: false,
          }),
        });
      } catch {}

      setSaveProgressToast('Saved!');
      setTimeout(() => setSaveProgressToast(null), 2500);
    } catch (e) {
      console.error('Save progress error:', e);
      setSaveProgressToast('Save failed');
      setTimeout(() => setSaveProgressToast(null), 2500);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Fetch team & server templates on mount
  const fetchStudioTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const origin = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'http://localhost:8000';
      const endpoint = `${origin}/api/visual-studio/templates`;
      const res = await fetch(endpoint, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStudioTemplates(data);
        }
      }
    } catch {
      // Gracefully handle offline or unit test environments
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  React.useEffect(() => {
    fetchStudioTemplates();
  }, []);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const bgMenuRef = useRef<HTMLDivElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const bgDropdownRef = useRef<HTMLDivElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleToolbarWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Ignore events that bubbled from React portals or popovers outside the physical toolbar element
    if (!toolbarRef.current || !toolbarRef.current.contains(e.target as Node)) {
      return;
    }
    if ((e.target as HTMLElement)?.closest?.('[data-studio-popover]')) {
      return;
    }
    if (e.deltaY !== 0) {
      toolbarRef.current.scrollLeft += e.deltaY;
    }
  };

  const getDropdownFixedStyle = (
    ref: React.RefObject<HTMLDivElement | null>,
    width: number,
    alignRight = false
  ): React.CSSProperties => {
    if (!ref.current || typeof window === 'undefined') {
      return { position: 'fixed', top: 52, left: 16, zIndex: 9999 };
    }
    const rect = ref.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    let left = alignRight ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, winWidth - width - 12));
    const top = rect.bottom + 6;
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    };
  };

  const [showOnboardingTip, setShowOnboardingTip] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bbot_studio_tip_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [isFloatingCopilotDismissed, setIsFloatingCopilotDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bbot_floating_ai_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Close popovers on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!target) return;

      if (isExportMenuOpen) {
        const inTrigger = exportMenuRef.current?.contains(target);
        const inDropdown = exportDropdownRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsExportMenuOpen(false);
        }
      }
      if (isThemeMenuOpen) {
        const inTrigger = themeMenuRef.current?.contains(target);
        const inDropdown = themeDropdownRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsThemeMenuOpen(false);
        }
      }
      if (isBgMenuOpen) {
        const inTrigger = bgMenuRef.current?.contains(target);
        const inDropdown = bgDropdownRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsBgMenuOpen(false);
        }
      }
      if (isTemplateModalOpen) {
        const inTrigger = templateMenuRef.current?.contains(target);
        const inDropdown = templateDropdownRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsTemplateModalOpen(false);
        }
      }
      if (isStyleModalOpen) {
        const inTrigger = styleMenuRef.current?.contains(target);
        const inDropdown = styleDropdownRef.current?.contains(target);
        if (!inTrigger && !inDropdown) {
          setIsStyleModalOpen(false);
        }
      }
    };

    if (isExportMenuOpen || isThemeMenuOpen || isBgMenuOpen || isTemplateModalOpen || isStyleModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen, isThemeMenuOpen, isBgMenuOpen, isTemplateModalOpen, isStyleModalOpen]);

  // Undo / Redo History Stack (up to 50 snapshots)
  const [history, setHistory] = useState<DiagramSpec[]>([]);
  const [redoStack, setRedoStack] = useState<DiagramSpec[]>([]);

  const effectiveCanUndo = propCanUndo !== undefined ? propCanUndo : history.length > 0;
  const effectiveCanRedo = propCanRedo !== undefined ? propCanRedo : redoStack.length > 0;

  const updateDiagramWithHistory = (newDiagram: DiagramSpec, previousSnapshot?: DiagramSpec) => {
    const snapshotToSave = previousSnapshot || diagram;
    // Don't push duplicate identical states
    if (JSON.stringify(newDiagram) === JSON.stringify(snapshotToSave)) {
      return;
    }
    setHistory((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(snapshotToSave))]);
    setRedoStack([]);
    if (previousSnapshot) {
      onUpdateDiagram(newDiagram, snapshotToSave);
    } else {
      onUpdateDiagram(newDiagram);
    }
  };

  const liveUpdateDiagram = (newDiagram: DiagramSpec) => {
    onUpdateDiagram(newDiagram);
  };

  const handleUndo = () => {
    if (propOnUndo) {
      propOnUndo();
      return;
    }
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [JSON.parse(JSON.stringify(diagram)), ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    onUpdateDiagram(previous);
  };

  const handleRedo = () => {
    if (propOnRedo) {
      propOnRedo();
      return;
    }
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(diagram))]);
    setRedoStack((prev) => prev.slice(1));
    onUpdateDiagram(next);
  };

  // Step 1: Custom Styling Handlers
  const handleApplyShape = (shape: NodeShape) => {
    setSelectedNodeShape(shape);
    const updatedNodes = diagram.nodes.map((n) => ({
      ...n,
      customStyle: {
        ...(n.customStyle || {}),
        shape,
      },
    }));
    updateDiagramWithHistory({
      ...diagram,
      nodes: updatedNodes,
    });
  };

  const handleApplyAccentColor = (hex: string) => {
    setCustomAccentColor(hex);
    const updatedNodes = diagram.nodes.map((n) => ({
      ...n,
      customStyle: {
        ...(n.customStyle || {}),
        borderColor: hex,
        glowColor: `${hex}40`,
      },
    }));
    const updatedEdges = diagram.edges.map((e) => ({
      ...e,
      customStyle: {
        ...(e.customStyle || {}),
        color: hex,
      },
    }));
    updateDiagramWithHistory({
      ...diagram,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
  };

  const handleApplyConnectorStyle = (strokeStyle: EdgeStrokeStyle, strokeWidth: number) => {
    setConnectorStrokeStyle(strokeStyle);
    setConnectorStrokeWidth(strokeWidth);
    const updatedEdges = diagram.edges.map((e) => ({
      ...e,
      customStyle: {
        ...(e.customStyle || {}),
        strokeStyle,
        strokeWidth,
        animated: strokeStyle === 'animated',
      },
    }));
    updateDiagramWithHistory({
      ...diagram,
      edges: updatedEdges,
    });
  };

  // Step 2: Template Library Handlers
  const handleApplyPreset = (preset: StudioStarterPreset) => {
    updateDiagramWithHistory({
      ...diagram,
      ...preset.diagram,
      nodes: preset.diagram.nodes || diagram.nodes,
      edges: preset.diagram.edges || diagram.edges,
      title: preset.diagram.title || diagram.title,
      summary: preset.diagram.summary || diagram.summary,
      diagramType: preset.diagram.diagramType || diagram.diagramType,
    });
    setIsTemplateModalOpen(false);
  };

  const handleSaveNewStudioTemplate = async () => {
    const nameToUse = (saveTemplateName || diagram.title || 'Custom Template').trim();
    if (!nameToUse) return;
    setIsSavingTemplate(true);
    try {
      const payload = {
        name: nameToUse,
        description: saveTemplateDesc.trim() || undefined,
        category: saveTemplateCategory || diagram.diagramType || 'process_flow',
        diagram: diagram,
        is_public: saveTemplateIsPublic,
      };
      const res = await fetch('/api/visual-studio/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedItem: StudioTemplateItem = await res.json();
        setStudioTemplates((prev) => [savedItem, ...prev.filter((t) => t.id !== savedItem.id)]);

        const localEntry = {
          id: savedItem.id,
          name: savedItem.name,
          createdAt: new Date().toLocaleDateString(),
          nodeCount: diagram.nodes.length,
          diagram: JSON.parse(JSON.stringify(diagram)),
        };
        const updated = [localEntry, ...savedTemplates.filter((t) => t.id !== localEntry.id)];
        setSavedTemplates(updated);
        try {
          localStorage.setItem('bbot_user_templates', JSON.stringify(updated));
        } catch {
          // ignore
        }
        setIsSaveTemplateModalOpen(false);
        setSaveSuccessMsg(`Template "${savedItem.name}" saved! Shared with team.`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        setIsTemplateModalOpen(true);
        setTemplateTab('saved');
      } else {
        handleSaveCurrentAsTemplate();
        setIsSaveTemplateModalOpen(false);
      }
    } catch (e) {
      console.error('Error saving template, falling back to local storage', e);
      handleSaveCurrentAsTemplate();
      setIsSaveTemplateModalOpen(false);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!newTemplateName.trim()) return;
    const tplName = newTemplateName.trim();
    const newEntry = {
      id: `tmpl_${Date.now()}`,
      name: tplName,
      createdAt: new Date().toLocaleDateString(),
      nodeCount: diagram.nodes.length,
      diagram: JSON.parse(JSON.stringify(diagram)),
    };
    const updated = [newEntry, ...savedTemplates];
    setSavedTemplates(updated);
    try {
      localStorage.setItem('bbot_user_templates', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save template to localStorage', e);
    }
    setNewTemplateName('');
    setSaveSuccessMsg(`Saved template: "${newEntry.name}"`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setTemplateTab('saved');

    // Also sync to server in the background
    try {
      const res = await fetch('/api/visual-studio/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: tplName,
          category: diagram.diagramType || 'process_flow',
          diagram: diagram,
          is_public: true,
        }),
      });
      if (res.ok) {
        const savedItem: StudioTemplateItem = await res.json();
        setStudioTemplates((prev) => [savedItem, ...prev.filter((t) => t.id !== savedItem.id)]);
      }
    } catch {
      // offline / fallback
    }
  };

  const handleDeleteSavedTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem('bbot_user_templates', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove template from localStorage', e);
    }
  };

  const handleDeleteStudioTemplate = async (id: string) => {
    if (id.startsWith('tpl_')) {
      try {
        await fetch(`/api/visual-studio/templates/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (e) {
        console.warn('Failed to delete template from server', e);
      }
    }
    setStudioTemplates((prev) => prev.filter((t) => t.id !== id));
    handleDeleteSavedTemplate(id);
  };

  const handleApplySavedTemplate = (saved: DiagramSpec) => {
    updateDiagramWithHistory(JSON.parse(JSON.stringify(saved)));
    setIsTemplateModalOpen(false);
  };

  const handleCopyDiagramJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(diagram, null, 2));
      setJsonCopyToast(true);
      setTimeout(() => setJsonCopyToast(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  const handleImportDiagramJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed || !Array.isArray(parsed.nodes)) {
        throw new Error('Invalid diagram JSON: must contain a "nodes" array.');
      }
      updateDiagramWithHistory(parsed);
      setIsTemplateModalOpen(false);
      setJsonInput('');
    } catch (err: any) {
      setJsonError(err?.message || 'Invalid JSON format. Please verify and try again.');
    }
  };

  // Re-order node left/earlier or right/later
  const handleMoveNode = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= diagram.nodes.length) return;
    const newNodes = [...diagram.nodes];
    const temp = newNodes[index];
    newNodes[index] = newNodes[targetIndex];
    newNodes[targetIndex] = temp;

    const reindexedNodes = newNodes.map((n, idx) => ({
      ...n,
      order: idx + 1,
      badge: /^\d+$/.test(n.badge || '') || !n.badge ? String(idx + 1).padStart(2, '0') : n.badge,
    }));

    const updatedEdges = reindexedNodes.slice(0, -1).map((n, idx) => ({
      id: `e_${n.id}_${reindexedNodes[idx + 1].id}`,
      source: n.id,
      target: reindexedNodes[idx + 1].id,
      label: diagram.edges[idx]?.label && diagram.edges[idx]?.label !== 'Next Phase' ? diagram.edges[idx].label : '',
      style: 'solid' as const,
    }));

    updateDiagramWithHistory({
      ...diagram,
      nodes: reindexedNodes,
      edges: updatedEdges.length > 0 ? updatedEdges : diagram.edges,
    });
  };

  // 1-Click Duplicate stage
  const handleDuplicateNode = (index: number) => {
    const sourceNode = diagram.nodes[index];
    const newId = `node_${Date.now().toString(36)}`;
    const duplicatedNode: NodeSpec = {
      ...sourceNode,
      id: newId,
      label: `${sourceNode.label} (Copy)`,
      order: index + 2,
      badge: String(index + 2).padStart(2, '0'),
    };
    const newNodes = [...diagram.nodes];
    newNodes.splice(index + 1, 0, duplicatedNode);

    const reindexedNodes = newNodes.map((n, idx) => ({
      ...n,
      order: idx + 1,
      badge: /^\d+$/.test(n.badge || '') || !n.badge ? String(idx + 1).padStart(2, '0') : n.badge,
    }));

    const updatedEdges = reindexedNodes.slice(0, -1).map((n, idx) => ({
      id: `e_${n.id}_${reindexedNodes[idx + 1].id}`,
      source: n.id,
      target: reindexedNodes[idx + 1].id,
      label: '',
      style: 'solid' as const,
    }));

    updateDiagramWithHistory({
      ...diagram,
      nodes: reindexedNodes,
      edges: updatedEdges,
    });
  };

  // Variations Bar Horizontal Carousel Scroll
  const variationsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkVariationsScroll = () => {
    if (variationsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = variationsRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  React.useEffect(() => {
    checkVariationsScroll();
    window.addEventListener('resize', checkVariationsScroll);
    return () => window.removeEventListener('resize', checkVariationsScroll);
  }, []);

  const scrollVariations = (direction: 'left' | 'right') => {
    if (variationsRef.current) {
      const amount = direction === 'left' ? -240 : 240;
      variationsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkVariationsScroll, 250);
    }
  };

  // Category 2: Auto-Tidy / Symmetrical Spacing Handler
  const handleAutoTidy = () => {
    if (!diagram.nodes || diagram.nodes.length === 0) return;
    const nodes = [...diagram.nodes];
    const edges = diagram.edges || [];

    const inDegree = new Map<string, number>();
    nodes.forEach((n) => inDegree.set(n.id, 0));
    edges.forEach((e) => inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1));

    const levels = new Map<string, number>();
    nodes.forEach((n) => {
      if ((inDegree.get(n.id) || 0) === 0) {
        levels.set(n.id, 0);
      }
    });

    let changed = true;
    let iteration = 0;
    while (changed && iteration < 10) {
      changed = false;
      iteration++;
      edges.forEach((e) => {
        const srcLevel = levels.get(e.source);
        if (srcLevel !== undefined) {
          const tgtLevel = levels.get(e.target) ?? -1;
          if (srcLevel + 1 > tgtLevel) {
            levels.set(e.target, srcLevel + 1);
            changed = true;
          }
        }
      });
    }

    nodes.forEach((n, idx) => {
      if (!levels.has(n.id)) {
        levels.set(n.id, idx % 4);
      }
    });

    const levelBuckets = new Map<number, NodeSpec[]>();
    nodes.forEach((n) => {
      const lvl = levels.get(n.id) || 0;
      if (!levelBuckets.has(lvl)) levelBuckets.set(lvl, []);
      levelBuckets.get(lvl)!.push(n);
    });

    const updatedNodes: NodeSpec[] = [];
    const sortedLevels = Array.from(levelBuckets.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((lvl) => {
      const bucket = levelBuckets.get(lvl)!;
      const count = bucket.length;
      const xPos = 120 + lvl * 310;
      const totalH = (count - 1) * 160;
      const startY = Math.max(80, 280 - totalH / 2);

      bucket.forEach((n, idx) => {
        updatedNodes.push({
          ...n,
          x: xPos,
          y: Math.round(startY + idx * 160),
        });
      });
    });

    updateDiagramWithHistory({
      ...diagram,
      nodes: updatedNodes,
    });

    setAutoTidyToast(true);
    setTimeout(() => setAutoTidyToast(false), 3200);
  };

  

  // Canvas Pan & Drag
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number }>({ x: 0, y: 0, ox: 0, oy: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select, [data-interactive="true"]')) return;
    setIsPanning(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.ox + dx,
      y: dragStartRef.current.oy + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(2.5, Math.max(0.4, Number((prev + delta).toFixed(2)))));
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 2.2));
    if (viewMode === 'canvas' && interactiveCanvasRef.current?.zoomIn) {
      interactiveCanvasRef.current.zoomIn();
    }
  };
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
    if (viewMode === 'canvas' && interactiveCanvasRef.current?.zoomOut) {
      interactiveCanvasRef.current.zoomOut();
    }
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    if (viewMode === 'canvas' && interactiveCanvasRef.current?.resetZoom) {
      interactiveCanvasRef.current.resetZoom();
    }
  };

  // 1-Click Auto-Fit to Screen Viewport
  const handleFitToScreen = () => {
    if (viewMode === 'canvas' && interactiveCanvasRef.current?.fitToScreen) {
      interactiveCanvasRef.current.fitToScreen();
      return;
    }
    if (!containerRef.current) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const contentW = contentRef.current ? contentRef.current.scrollWidth || 900 : 900;
    const contentH = contentRef.current ? contentRef.current.scrollHeight || 650 : 650;

    const availableW = Math.max(300, containerW - 60);
    const availableH = Math.max(200, containerH - 160);

    const scale = Math.min(1.2, Math.max(0.42, Math.min(availableW / contentW, availableH / contentH)));
    setZoom(Number(scale.toFixed(2)));
    setPanOffset({ x: 0, y: 0 });
  };

  // 1-Click AI Polish Node
  const handleEnhanceNode = async (node: NodeSpec) => {
    setEnhancingNodeId(node.id);
    try {
      const res = await fetch('/api/visual-studio/enhance-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          node,
          diagram_type: diagram.diagramType,
          diagram_title: diagram.title,
        }),
      });
      let enhancedNode: NodeSpec = node;
      let improvementsText = 'Polished typography, visual hierarchy & operational SLAs.';
      if (res.ok) {
        const data = await res.json();
        if (data && data.node) {
          enhancedNode = data.node;
          if (Array.isArray(data.improvements) && data.improvements.length > 0) {
            improvementsText = data.improvements.join(' • ');
          }
        }
      } else {
        enhancedNode = polishNodeLocally(node);
      }
      const updatedNodes = diagram.nodes.map((n) => (n.id === node.id ? enhancedNode : n));
      updateDiagramWithHistory({ ...diagram, nodes: updatedNodes });
      setPolishToast({ label: enhancedNode.label, text: improvementsText });
      setTimeout(() => setPolishToast(null), 3800);
    } catch (err) {
      console.warn('API enhance-node unavailable, applying client polish:', err);
      const enhancedNode = polishNodeLocally(node);
      const updatedNodes = diagram.nodes.map((n) => (n.id === node.id ? enhancedNode : n));
      updateDiagramWithHistory({ ...diagram, nodes: updatedNodes });
      setPolishToast({ label: enhancedNode.label, text: 'Polished typography, operational SLAs & active badges.' });
      setTimeout(() => setPolishToast(null), 3800);
    } finally {
      setEnhancingNodeId(null);
    }
  };

  const COPILOT_PRESETS = [
    { label: '⚡ Add SLA Badges', prompt: 'Add SLA and latency badges to all stages' },
    { label: '🛡️ Add Security Gate', prompt: 'Add security compliance review gate between stages' },
    { label: '🔄 Add Rollback Branch', prompt: 'Add rollback and incident escalation branch' },
    { label: '🎨 Cyberpunk Glow', prompt: 'Switch to Cyberpunk neon glow theme' },
    { label: '📝 Executive Polish', prompt: 'Polish node descriptions with executive vocabulary and SLAs' },
    { label: '🏢 Emerald Theme', prompt: 'Switch to Emerald Enterprise theme' },
  ];

  // Canvas AI Copilot Executor (Deterministic <15ms + LLM Fallback)
  const handleRunCopilot = async (customInstruction?: string) => {
    const query = (customInstruction !== undefined ? customInstruction : copilotInput).trim();
    if (!query || isCopilotLoading) return;

    setIsCopilotLoading(true);
    try {
      const res = await fetch('/api/visual-studio/canvas-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          diagram,
          instruction: query,
        }),
      });
      if (!res.ok) {
        throw new Error(`Copilot request failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data && data.diagram) {
        updateDiagramWithHistory(data.diagram);
        if (data.diagram.theme) {
          if (data.diagram.theme === 'cyberpunk' || data.diagram.theme === 'gradient') {
            setAestheticTheme('cyberpunk');
          } else if (data.diagram.theme === 'emerald') {
            setAestheticTheme('emerald');
          } else if (data.diagram.theme === 'whiteboard' || data.diagram.theme === 'light') {
            setAestheticTheme('whiteboard');
          } else if (data.diagram.theme === 'bbot-dark' || data.diagram.theme === 'dark') {
            setAestheticTheme('bbot-dark');
          }
        }
        setCopilotNotice({
          explanation: data.explanation || 'bbot Studio diagram updated successfully.',
          applied: data.appliedChanges || [],
        });
        setIsCopilotOpen(false);
        setCopilotInput('');
        setTimeout(() => setCopilotNotice(null), 5000);
      }
    } catch (err: any) {
      console.error('Error invoking Canvas Copilot:', err);
      setCopilotNotice({
        explanation: 'Failed to apply transformation. Please check server or try again.',
        applied: [String(err.message || 'Error occurred')],
      });
      setTimeout(() => setCopilotNotice(null), 5000);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Inline Edge Label Update
  const handleUpdateEdgeLabel = (sourceId: string, targetId: string, newLabel: string) => {
    const existingIndex = diagram.edges.findIndex((e) => e.source === sourceId && e.target === targetId);
    let updatedEdges: typeof diagram.edges;
    if (existingIndex !== -1) {
      updatedEdges = diagram.edges.map((e, idx) =>
        idx === existingIndex ? { ...e, label: newLabel.trim() || undefined } : e
      );
    } else {
      updatedEdges = [
        ...diagram.edges,
        {
          id: `e_${sourceId}_${targetId}`,
          source: sourceId,
          target: targetId,
          label: newLabel.trim() || undefined,
        },
      ];
    }
    updateDiagramWithHistory({ ...diagram, edges: updatedEdges });
  };

  // Inline Arrow Head Marker Update
  const handleUpdateEdgeMarker = (sourceId: string, targetId: string, marker: ArrowMarkerType) => {
    const existingIndex = diagram.edges.findIndex((e) => e.source === sourceId && e.target === targetId);
    let updatedEdges: typeof diagram.edges;
    if (existingIndex !== -1) {
      updatedEdges = diagram.edges.map((e, idx) =>
        idx === existingIndex
          ? { ...e, customStyle: { ...(e.customStyle || {}), arrowMarker: marker } }
          : e
      );
    } else {
      updatedEdges = [
        ...diagram.edges,
        {
          id: `e_${sourceId}_${targetId}`,
          source: sourceId,
          target: targetId,
          customStyle: { arrowMarker: marker },
        },
      ];
    }
    updateDiagramWithHistory({ ...diagram, edges: updatedEdges });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingNodeCount = normalizedQuery
    ? diagram.nodes.filter((n) =>
      `${n.label} ${n.sublabel || ''} ${n.group || ''}`.toLowerCase().includes(normalizedQuery)
    ).length
    : diagram.nodes.length;

  const isChart = ['bar_chart', 'line_chart', 'pie_chart'].includes(diagram.diagramType);

  // Focus Copilot input when opened
  React.useEffect(() => {
    if (isCopilotOpen) {
      setTimeout(() => {
        copilotInputRef.current?.focus();
      }, 60);
    }
  }, [isCopilotOpen]);

  // Keyboard navigation & Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Canvas AI Copilot shortcut Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (!['INPUT', 'TEXTAREA'].includes(tag)) {
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
        const tag = (e.target as HTMLElement)?.tagName;
        if (!['INPUT', 'TEXTAREA'].includes(tag)) {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      // Quick Search shortcut Ctrl+F
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (!['INPUT', 'TEXTAREA'].includes(tag)) {
          e.preventDefault();
          setIsSearchOpen((prev) => !prev);
          return;
        }
      }

      // Don't intercept typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        if (e.key === 'Escape') {
          setEditingNodeId(null);
          setIsSearchOpen(false);
          setIsCopilotOpen(false);
        }
        return;
      }

      // Keyboard Shortcuts Cheatsheet toggle: '?' or Shift+'/'
      if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (isExportMenuOpen) {
          setIsExportMenuOpen(false);
          return;
        }
        if (isThemeMenuOpen) {
          setIsThemeMenuOpen(false);
          return;
        }
        if (isBgMenuOpen) {
          setIsBgMenuOpen(false);
          return;
        }
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isCopilotOpen) {
          setIsCopilotOpen(false);
          return;
        }
        if (isStyleModalOpen) {
          setIsStyleModalOpen(false);
          return;
        }
        if (isTemplateModalOpen) {
          setIsTemplateModalOpen(false);
          return;
        }
        if (isPresenting) setIsPresenting(false);
        if (isFullscreen) setIsFullscreen(false);
        if (isSearchOpen) setIsSearchOpen(false);
        if (editingNodeId) setEditingNodeId(null);
      } else if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isChart && diagram.nodes.length > 0) {
          setIsPresenting((prev) => !prev);
          setPresentingIndex(0);
        }
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid((prev) => !prev);
      } else if (isPresenting) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setPresentingIndex((prev) => Math.min(prev + 1, diagram.nodes.length - 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPresentingIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === '1' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleFitToScreen();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, isChart, diagram, isFullscreen, isSearchOpen, editingNodeId, history, redoStack, isCopilotOpen, isShortcutsModalOpen, isStyleModalOpen, isTemplateModalOpen, isExportMenuOpen, isThemeMenuOpen]);

  // Auto-scroll highlighted card into comfortable view during presentation mode
  React.useEffect(() => {
    if (isPresenting && diagram.nodes[presentingIndex]) {
      const activeNode = diagram.nodes[presentingIndex];
      const el = document.getElementById(`stage-card-${activeNode.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [isPresenting, presentingIndex]);

  const getCanvasBgColor = () => {
    if (diagram.canvasBg) return diagram.canvasBg;
    return aestheticTheme === 'whiteboard'
      ? '#FDFCF7'
      : aestheticTheme === 'cyberpunk' || aestheticTheme === 'gradient'
        ? '#060814'
        : aestheticTheme === 'emerald'
          ? '#07130e'
          : '#181a1f';
  };

  const activeCanvasBg = diagram.canvasBg || getCanvasBgColor();

  const handleCopyMermaid = async () => {
    try {
      let mermaid = '';
      if (diagram.mermaid_code && diagram.mermaid_code.trim()) {
        mermaid = diagram.mermaid_code.trim();
      } else {
        const isHorizontal = ['process_flow', 'timeline', 'sequence'].includes(diagram.diagramType);
        mermaid = `graph ${isHorizontal ? 'LR' : 'TD'}\n`;
        diagram.nodes.forEach((n) => {
          const safeId = (n.id || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
          const clean = (n.label || '').replace(/[[\]()"]/g, ' ').trim();
          mermaid += `  ${safeId}["${clean}"]\n`;
        });
        diagram.edges.forEach((e) => {
          const safeSource = (e.source || '').replace(/[^a-zA-Z0-9_]/g, '_');
          const safeTarget = (e.target || '').replace(/[^a-zA-Z0-9_]/g, '_');
          if (e.label && e.label.trim()) {
            const cleanEdgeLabel = e.label.replace(/[[\]()|"]/g, ' ').trim();
            mermaid += `  ${safeSource} -->|${cleanEdgeLabel}| ${safeTarget}\n`;
          } else {
            mermaid += `  ${safeSource} --> ${safeTarget}\n`;
          }
        });
      }
      await navigator.clipboard.writeText(mermaid);
      setCopyMermaidSuccess(true);
      setTimeout(() => setCopyMermaidSuccess(false), 2200);
    } catch (err) {
      console.error('Failed to copy mermaid markdown:', err);
    }
  };

  const getCanvasPngDataUrl = async (): Promise<string | null> => {
    if (viewMode === 'canvas' && interactiveCanvasRef.current) {
      return await interactiveCanvasRef.current.exportPngDataUrl();
    }
    const canvasEl = document.getElementById('bbot-studio-canvas-content');
    const captureNode = isChart ? chartRef.current : (contentRef.current || canvasEl);
    if (!captureNode) return null;
    try {
      const isCanvas = viewMode === 'canvas';
      return await toPng(captureNode, {
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: false,
        backgroundColor: getCanvasBgColor(),
        filter: (domNode: HTMLElement) => {
          if (!domNode) return true;
          if (domNode.dataset?.interactive === 'true' || domNode.getAttribute?.('data-interactive') === 'true') {
            return false;
          }
          return true;
        },
        style: isCanvas
          ? undefined
          : {
            transform: 'none',
            transformOrigin: 'top center',
            margin: '0 auto',
            padding: '32px',
            maxWidth: '1280px',
            width: '100%',
          },
      });
    } catch (e) {
      console.warn('Capture PNG failed:', e);
      return null;
    }
  };

  const getCanvasPngBlob = async (): Promise<Blob | null> => {
    if (viewMode === 'canvas' && interactiveCanvasRef.current) {
      const blob = await interactiveCanvasRef.current.exportPng();
      if (blob) return blob;
    }
    const dataUrl = await getCanvasPngDataUrl();
    if (dataUrl) {
      const res = await fetch(dataUrl);
      return await res.blob();
    }
    return null;
  };

  const getCanvasSvgString = async (): Promise<string | null> => {
    if (viewMode === 'canvas' && interactiveCanvasRef.current) {
      const svg = await interactiveCanvasRef.current.exportSvg();
      if (svg) return svg;
    }
    const canvasEl = document.getElementById('bbot-studio-canvas-content');
    const captureNode = isChart ? chartRef.current : (contentRef.current || canvasEl);
    if (!captureNode) return null;
    try {
      const isCanvas = viewMode === 'canvas';
      const svgDataUri = await toSvg(captureNode, {
        backgroundColor: getCanvasBgColor(),
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: false,
        filter: (domNode: HTMLElement) => {
          if (!domNode) return true;
          if (domNode.dataset?.interactive === 'true' || domNode.getAttribute?.('data-interactive') === 'true') {
            return false;
          }
          return true;
        },
        style: isCanvas
          ? undefined
          : {
            transform: 'none',
            transformOrigin: 'top center',
            margin: '0 auto',
            padding: '32px',
            maxWidth: '1280px',
            width: '100%',
          },
      });
      if (svgDataUri) {
        let rawSvg = svgDataUri;
        if (svgDataUri.startsWith('data:image/svg+xml;charset=utf-8,')) {
          rawSvg = decodeURIComponent(svgDataUri.replace('data:image/svg+xml;charset=utf-8,', ''));
        } else if (svgDataUri.startsWith('data:image/svg+xml;base64,')) {
          rawSvg = atob(svgDataUri.replace('data:image/svg+xml;base64,', ''));
        }
        return rawSvg;
      }
    } catch (e) {
      console.warn('Capture SVG failed:', e);
    }
    return null;
  };

  const getCanvasPdfBlob = async (): Promise<Blob | null> => {
    const dataUrl = await getCanvasPngDataUrl();
    if (!dataUrl) return null;
    try {
      const res = await fetch('/api/visual-studio/export-image-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image_data_uri: dataUrl }),
      });
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn('Export image to PDF failed:', e);
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    getViewMode: () => viewMode,
    exportPng: getCanvasPngBlob,
    exportPngDataUrl: getCanvasPngDataUrl,
    exportSvg: getCanvasSvgString,
    exportPdf: getCanvasPdfBlob,
    undo: handleUndo,
    redo: handleRedo,
    saveProgress: handleSaveProgress,
  }));

  const handleCopyImage = async () => {
    setIsCopying(true);
    try {
      let blob = await getCanvasPngBlob();
      if (!blob) {
        const res = await fetch('/api/visual-studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagram: { ...diagram, viewMode },
            format: 'png',
            theme: aestheticTheme === 'whiteboard' ? 'light' : 'dark',
            width: 1600,
            height: 1000,
          }),
        });
        if (res.ok) blob = await res.blob();
      }

      if (blob) {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
        } catch (clipErr) {
          console.warn('Direct clipboard write blocked, falling back to download:', clipErr);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(diagram.title || 'bbot_diagram').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
        }
      }
    } catch (err: any) {
      console.error('Failed to copy image to clipboard:', err);
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopySvg = async () => {
    setIsCopyingSvg(true);
    try {
      let rawSvg = await getCanvasSvgString();
      if (!rawSvg) {
        const res = await fetch('/api/visual-studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagram: { ...diagram, viewMode },
            format: 'svg',
            theme: aestheticTheme === 'whiteboard' ? 'light' : 'dark',
            width: 1400,
            height: 900,
          }),
        });
        if (res.ok) rawSvg = await res.text();
      }

      if (rawSvg) {
        await navigator.clipboard.writeText(rawSvg);
        setCopySvgSuccess(true);
        setTimeout(() => setCopySvgSuccess(false), 2200);
      }
    } catch (err: any) {
      console.error('Failed to copy SVG to clipboard:', err);
    } finally {
      setIsCopyingSvg(false);
    }
  };

  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      let blob = await getCanvasPngBlob();
      if (!blob) {
        const res = await fetch('/api/visual-studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagram: { ...diagram, viewMode },
            format: 'png',
            theme: aestheticTheme === 'whiteboard' ? 'light' : 'dark',
            width: 1600,
            height: 1000,
          }),
        });
        if (res.ok) blob = await res.blob();
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(diagram.title || 'bbot_diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2200);
      }
    } catch (err) {
      console.error('Failed to download PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSvg = async () => {
    setIsDownloading(true);
    try {
      let rawSvg = await getCanvasSvgString();
      if (!rawSvg) {
        const res = await fetch('/api/visual-studio/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagram: { ...diagram, viewMode },
            format: 'svg',
            theme: aestheticTheme === 'whiteboard' ? 'light' : 'dark',
            width: 1400,
            height: 900,
          }),
        });
        if (res.ok) rawSvg = await res.text();
      }

      if (rawSvg) {
        const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(diagram.title || 'bbot_diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2200);
      }
    } catch (err) {
      console.error('Failed to download SVG:', err);
    } finally {
      setIsDownloading(false);
    }
  };



  // Edit Node
  const startEditingNode = (node: NodeSpec) => {
    setEditingNodeId(node.id);
    setEditLabel(node.label);
    setEditSublabel(node.sublabel || '');
    setEditType(node.type || 'process');
    setEditIcon(node.icon || resolveSemanticIcon(node.label, node.sublabel, node.type));
    setEditBadge(node.badge || '');
  };

  const saveEditingNode = () => {
    if (!editingNodeId) return;
    const updatedNodes = diagram.nodes.map((n) =>
      n.id === editingNodeId
        ? {
          ...n,
          label: editLabel.trim() || n.label,
          sublabel: editSublabel.trim(),
          type: editType,
          icon: editIcon,
          badge: editBadge.trim() || undefined,
        }
        : n
    );
    updateDiagramWithHistory({ ...diagram, nodes: updatedNodes });
    setEditingNodeId(null);
  };

  // Add Node at the end
  const handleAddNode = () => {
    const newId = `node_${Date.now().toString(36)}`;
    const lastNode = diagram.nodes[diagram.nodes.length - 1];
    const newIndex = diagram.nodes.length + 1;
    const newNode: NodeSpec = {
      id: newId,
      label: 'New Stage',
      sublabel: 'Add operational details here',
      type: 'process',
      order: newIndex,
      icon: 'Layers',
      badge: String(newIndex).padStart(2, '0'),
    };
    const updatedEdges = lastNode
      ? [
        ...diagram.edges,
        {
          id: `e_${lastNode.id}_${newId}`,
          source: lastNode.id,
          target: newId,
          label: 'Next',
        },
      ]
      : diagram.edges;

    updateDiagramWithHistory({
      ...diagram,
      nodes: [...diagram.nodes, newNode],
      edges: updatedEdges,
    });
  };

  // In-Between Step Inserter: Split edge between source & target and insert node
  const handleInsertNodeBetween = (sourceId: string, targetId: string) => {
    const sourceIndex = diagram.nodes.findIndex((n) => n.id === sourceId);
    if (sourceIndex === -1) return;

    const newId = `node_${Date.now().toString(36)}`;
    const newNode: NodeSpec = {
      id: newId,
      label: 'New Stage',
      sublabel: 'Add operational details here',
      type: 'process',
      order: sourceIndex + 2,
      icon: 'Layers',
      badge: String(sourceIndex + 2).padStart(2, '0'),
    };

    const newNodes = [...diagram.nodes];
    newNodes.splice(sourceIndex + 1, 0, newNode);

    const reindexedNodes = newNodes.map((n, idx) => ({
      ...n,
      order: idx + 1,
      badge: /^\d+$/.test(n.badge || '') || !n.badge ? String(idx + 1).padStart(2, '0') : n.badge,
    }));

    const filteredEdges = diagram.edges.filter(
      (e) => !(e.source === sourceId && e.target === targetId)
    );
    const updatedEdges = [
      ...filteredEdges,
      { id: `e_${sourceId}_${newId}`, source: sourceId, target: newId, label: 'Next' },
      { id: `e_${newId}_${targetId}`, source: newId, target: targetId, label: 'Proceed' },
    ];

    updateDiagramWithHistory({
      ...diagram,
      nodes: reindexedNodes,
      edges: updatedEdges,
    });

    startEditingNode(newNode);
  };

  // Delete Node
  const handleDeleteNode = (id: string) => {
    if (diagram.nodes.length <= 1 && onRequestClearCanvas) {
      onRequestClearCanvas();
      return;
    }
    const updatedNodes = diagram.nodes.filter((n) => n.id !== id);
    const updatedEdges = diagram.edges.filter((e) => e.source !== id && e.target !== id);
    updateDiagramWithHistory({
      ...diagram,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
  };

  // Chart Data Row Edit
  const handleUpdateChartRow = (index: number, key: string, value: any) => {
    if (!diagram.chartData) return;
    const updatedRows = [...diagram.chartData.rows];
    updatedRows[index] = { ...updatedRows[index], [key]: value };
    updateDiagramWithHistory({
      ...diagram,
      chartData: { ...diagram.chartData, rows: updatedRows },
    });
  };

  const handleAddChartRow = () => {
    if (!diagram.chartData) return;
    const xKey = diagram.chartData.xAxisKey || 'Category';
    const dKey = diagram.chartData.dataKeys[0] || 'Value';
    const newRow = {
      [xKey]: `Item ${diagram.chartData.rows.length + 1}`,
      [dKey]: 50,
    };
    updateDiagramWithHistory({
      ...diagram,
      chartData: {
        ...diagram.chartData,
        rows: [...diagram.chartData.rows, newRow],
      },
    });
  };

  const handleDeleteChartRow = (index: number) => {
    if (!diagram.chartData) return;
    const updatedRows = diagram.chartData.rows.filter((_, i) => i !== index);
    updateDiagramWithHistory({
      ...diagram,
      chartData: { ...diagram.chartData, rows: updatedRows },
    });
  };

  // Sanitize Chart Data and dynamically compute robust Y-axis boundaries
  const sanitizedChartData = React.useMemo(() => {
    if (!diagram.chartData?.rows) return { rows: [], yMin: 0, yMax: 100 };
    const dataKeys = diagram.chartData.dataKeys || [];
    let min = Infinity;
    let max = -Infinity;

    const rows = diagram.chartData.rows.map((row) => {
      const cleanRow: Record<string, any> = { ...row };
      dataKeys.forEach((key) => {
        const raw = row[key];
        let num = 0;
        if (typeof raw === 'number') {
          num = raw;
        } else if (typeof raw === 'string') {
          const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ''));
          num = isNaN(parsed) ? 0 : parsed;
        }
        cleanRow[key] = num;
        if (num < min) min = num;
        if (num > max) max = num;
      });
      return cleanRow;
    });

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 100;

    // Headroom calculation: ensure the highest value is never clipped by the top edge
    const padding = Math.max(10, Math.ceil((max * 0.15) / 5) * 5);
    const yMax = Math.max(10, Math.ceil((max + padding) / 10) * 10);
    const yMin = min < 0 ? Math.floor((min * 1.1) / 10) * 10 : 0;

    return { rows, yMin, yMax };
  }, [diagram.chartData]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-md overflow-hidden transition-all ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'flex-1 min-h-0'
        }`}
    >
      {/* Tier 1: Document Header Bar (Identity, Scope, View Mode & Global Actions) */}
      <div
        ref={toolbarRef}
        onWheel={handleToolbarWheel}
        className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur-md shrink-0 relative z-30 toolbar-scrollbar"
      >
        <div className="flex items-center justify-between min-w-max px-3.5 py-2 gap-3">
          {/* Left: Identity, Badges & Mode Switcher */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] shadow-xs shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex items-center min-w-0 max-w-[200px] sm:max-w-[320px]">
            <span
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-[var(--text-primary)] truncate"
              title={diagram.title || 'Interactive Visual'}
            >
              {diagram.title || 'Interactive Visual'}
            </span>
          </div>
        </div>

        {/* Center: Unified Canvas Tools Bar (All tools styled with the exact same visual design as Export) */}
        <div className="flex items-center gap-1.5 shrink-0 relative overflow-visible">
          {!isChart ? (
            <button
              type="button"
              onClick={handleAddNode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[#E39A3D] hover:from-[#E39A3D] hover:to-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white transition-all shadow-[var(--energy-glow)] hover:shadow-md active:scale-95 cursor-pointer shrink-0"
              title="Add a new step to the diagram"
            >
              <Plus size={13} />
              <span>Add Node</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDataTable(!showDataTable)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
            >
              <TableIcon size={12} />
              <span>{showDataTable ? 'Hide Data' : 'Edit Data'}</span>
            </button>
          )}

          {/* Undo / Redo in Primary Center Toolbar */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!effectiveCanUndo}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 size={13} />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5" />
            <button
              type="button"
              onClick={handleRedo}
              disabled={!effectiveCanRedo}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 size={13} />
              <span className="hidden sm:inline">Redo</span>
            </button>
          </div>

          {/* 1. Templates Dropdown Button (Exact same design as Export) */}
          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTemplateModalOpen((prev) => !prev);
                setIsStyleModalOpen(false);
                setIsExportMenuOpen(false);
                setIsThemeMenuOpen(false);
                setIsBgMenuOpen(false);
                if (!isTemplateModalOpen) {
                  fetchStudioTemplates();
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isTemplateModalOpen
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              title="Load architectural starter presets, team templates, or map datasets"
            >
              <Sparkles size={12} className="text-cyan-500" />
              <span>Templates</span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${isTemplateModalOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Template Library Popover */}
            {isTemplateModalOpen && (() => {
              const combinedTemplates = [
                ...studioTemplates.map((st) => ({
                  id: st.id,
                  name: st.name,
                  description: st.description,
                  category: st.category,
                  nodeCount: st.node_count || st.diagram?.nodes?.length || 0,
                  diagram: st.diagram,
                  isPublic: Boolean(st.is_public),
                  author: st.created_by_name || 'Team Colleague',
                  dateStr: st.created_at ? new Date(st.created_at).toLocaleDateString() : 'Shared',
                  isServer: true,
                })),
                ...savedTemplates
                  .filter((lt) => !studioTemplates.some((st) => st.id === lt.id))
                  .map((lt) => ({
                    id: lt.id,
                    name: lt.name,
                    description: undefined,
                    category: 'process_flow',
                    nodeCount: lt.nodeCount || lt.diagram?.nodes?.length || 0,
                    diagram: lt.diagram,
                    isPublic: false,
                    author: 'Saved in Browser',
                    dateStr: lt.createdAt,
                    isServer: false,
                  })),
              ];

              return typeof document !== 'undefined' ? createPortal(
                <div
                  ref={templateDropdownRef}
                  data-studio-popover="template"
                  style={getDropdownFixedStyle(templateMenuRef, 480, false)}
                  className="w-[92vw] sm:w-[480px] rounded-2xl bg-[var(--bg-surface)]/98 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-3 animate-in fade-in zoom-in-95 pointer-events-auto max-h-[520px] flex flex-col overscroll-contain"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]/70 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-cyan-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Template Library</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTemplateModalOpen(false)}
                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setTemplateTab('presets')}
                      className={`flex-1 py-1 rounded text-[0.65rem] font-bold transition-all cursor-pointer ${templateTab === 'presets'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateTab('saved');
                        fetchStudioTemplates();
                      }}
                      className={`flex-1 py-1 rounded text-[0.65rem] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${templateTab === 'saved'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <span>Team & Saved</span>
                      {combinedTemplates.length > 0 && (
                        <span className="px-1 py-0.2 rounded-full bg-black/20 text-[0.6rem]">
                          {combinedTemplates.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateTab('json')}
                      className={`flex-1 py-1 rounded text-[0.65rem] font-bold transition-all cursor-pointer ${templateTab === 'json'
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      JSON
                    </button>
                  </div>

                  {/* Tab 1: Presets */}
                  {templateTab === 'presets' && (
                    <div
                      className="space-y-1.5 overflow-y-auto pr-1 max-h-72 scrollbar-thin overscroll-contain"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {STUDIO_STARTER_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className="w-full text-left p-2 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-all border border-transparent hover:border-cyan-500/30 group flex items-start gap-2.5 cursor-pointer"
                        >
                          <span className="text-base p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] group-hover:scale-110 transition-transform shrink-0">
                            {p.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors truncate">
                                {p.name}
                              </p>
                              <span className="text-[0.6rem] font-mono text-[var(--text-muted)] shrink-0">
                                {p.diagram.nodes?.length || 0} nodes
                              </span>
                            </div>
                            <p className="text-[0.65rem] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Saved & Team Templates */}
                  {templateTab === 'saved' && (
                    <div
                      className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-72 scrollbar-thin overscroll-contain"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {/* Top Action: Save Current Diagram as Template */}
                      <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1">
                            <BookmarkPlus size={12} className="text-amber-500" />
                            Save Canvas as Template
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSaveTemplateName(diagram.title || '');
                              setSaveTemplateDesc(diagram.summary || '');
                              setSaveTemplateCategory(diagram.diagramType || 'process_flow');
                              setIsSaveTemplateModalOpen(true);
                            }}
                            className="px-2 py-0.5 text-[0.65rem] font-bold rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer shadow-xs"
                          >
                            Details & Share...
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Quick name (e.g., Auth Flow)..."
                            className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCurrentAsTemplate}
                            disabled={!newTemplateName.trim()}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0"
                          >
                            Quick Save
                          </button>
                        </div>
                        {saveSuccessMsg && (
                          <span className="text-[0.65rem] text-emerald-400 font-medium">
                            ✓ {saveSuccessMsg}
                          </span>
                        )}
                      </div>

                      {/* Templates List */}
                      {isLoadingTemplates && combinedTemplates.length === 0 ? (
                        <div className="py-6 text-center text-[var(--text-muted)] text-xs">
                          Loading workspace templates...
                        </div>
                      ) : combinedTemplates.length === 0 ? (
                        <div className="py-6 text-center text-[var(--text-muted)] text-xs flex flex-col items-center gap-1.5">
                          <Bookmark size={18} className="opacity-40" />
                          <span>No saved templates yet.</span>
                          <span className="text-[0.65rem]">Save your diagram above to reuse or share with colleagues!</span>
                        </div>
                      ) : (
                        combinedTemplates.map((t) => (
                          <div
                            key={t.id}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-amber-500/50 hover:shadow-md transition-all group"
                          >
                            {/* Card Header: Title & Badges & Delete */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors truncate max-w-[240px]">
                                    {t.name}
                                  </h4>
                                  {t.isPublic && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[0.62rem] font-semibold">
                                      <Users size={9} />
                                      <span>Team</span>
                                    </span>
                                  )}
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[0.62rem] font-mono">
                                    {t.nodeCount} stages
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-[0.68rem] text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudioTemplate(t.id)}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0"
                                title="Delete template"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Card Meta row: Author & Date */}
                            <div className="flex items-center gap-1.5 text-[0.62rem] text-[var(--text-muted)] pt-0.5">
                              <span className="font-medium text-[var(--text-secondary)] truncate max-w-[160px]">{t.author}</span>
                              <span>•</span>
                              <span>{t.dateStr}</span>
                            </div>

                            {/* Action Buttons Toolbar: Separate, crisp, full-width actions */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]/60">
                              <button
                                type="button"
                                onClick={() => handleApplySavedTemplate(t.diagram)}
                                className="flex-1 py-1.5 px-2 text-[0.68rem] font-bold rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer text-center"
                                title="Load this template onto canvas"
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const adapted = applyTemplateToDataset(t.diagram, diagram);
                                  updateDiagramWithHistory(adapted);
                                  setIsTemplateModalOpen(false);
                                }}
                                className="flex-1 py-1.5 px-2 text-[0.68rem] font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 dark:text-amber-300 border border-amber-500/35 transition-all cursor-pointer text-center"
                                title="Keep current diagram labels, but adopt this template's box styles and layout"
                              >
                                Apply Style
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMapDatasetTemplate({ diagram: t.diagram, name: t.name });
                                  setIsTemplateModalOpen(false);
                                }}
                                className="flex-1 py-1.5 px-2 text-[0.68rem] font-bold rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-500 dark:text-indigo-300 border border-indigo-500/35 transition-all cursor-pointer flex items-center justify-center gap-1"
                                title="Map a new dataset onto this template"
                              >
                                <Database size={11} />
                                <span>Map Data</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Import / Export JSON */}
                  {templateTab === 'json' && (
                    <div
                      className="flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-72 scrollbar-thin overscroll-contain"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[0.68rem] font-bold text-[var(--text-primary)] flex items-center gap-1">
                          <FileJson size={11} className="text-cyan-400" />
                          Export / Share
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyDiagramJson}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.65rem] font-bold rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                        >
                          <Copy size={10} />
                          <span>{jsonCopyToast ? 'Copied!' : 'Copy JSON'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <textarea
                          readOnly
                          rows={4}
                          value={JSON.stringify(diagram, null, 2)}
                          className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[0.62rem] font-mono text-[var(--text-secondary)] resize-none select-all focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-[0.68rem] font-bold text-[var(--text-primary)] flex items-center gap-1">
                          <UploadCloud size={11} className="text-purple-400" />
                          Import Diagram JSON
                        </span>
                        <textarea
                          rows={3}
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          placeholder="Paste a valid DiagramSpec JSON here..."
                          className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[0.62rem] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-400 resize-none"
                        />
                        {jsonError && (
                          <span className="text-[0.65rem] text-rose-400 font-medium">
                            {jsonError}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleImportDiagramJson}
                          disabled={!jsonInput.trim()}
                          className="self-end px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                        >
                          Apply JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>,
                document.body
              ) : null;
            })()}
          </div>

          {/* 2. Style Dropdown Button (Exact same design as Export) */}
          <div className="relative" ref={styleMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStyleModalOpen((prev) => !prev);
                setIsTemplateModalOpen(false);
                setIsExportMenuOpen(false);
                setIsThemeMenuOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isStyleModalOpen
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              title="Customize diagram colors, node shapes, and connector stroke styles"
            >
              <Sliders size={12} className="text-purple-500" />
              <span>Style</span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${isStyleModalOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Style Customizer Popover */}
            {isStyleModalOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={styleDropdownRef}
                data-studio-popover="style"
                style={getDropdownFixedStyle(styleMenuRef, 320, false)}
                className="w-80 rounded-2xl bg-[var(--bg-surface)]/98 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-3 animate-in fade-in zoom-in-95 pointer-events-auto flex flex-col gap-3 overscroll-contain"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]/70">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={13} className="text-purple-400" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Diagram Styling & Geometries</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStyleModalOpen(false)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Section 1: Color Palette */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.68rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Accent & Glow Color
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { hex: '#f59e0b', name: 'Amber' },
                      { hex: '#06b6d4', name: 'Cyan' },
                      { hex: '#8b5cf6', name: 'Violet' },
                      { hex: '#10b981', name: 'Emerald' },
                      { hex: '#f43f5e', name: 'Rose' },
                      { hex: '#3b82f6', name: 'Blue' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleApplyAccentColor(c.hex)}
                        className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 border cursor-pointer ${customAccentColor === c.hex ? 'ring-2 ring-white scale-110' : 'border-white/20'
                          }`}
                        style={{ backgroundColor: c.hex }}
                        title={`Apply ${c.name} palette`}
                      />
                    ))}
                    <label
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] cursor-pointer text-[0.65rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title="Choose custom hex color"
                    >
                      <input
                        type="color"
                        value={customAccentColor}
                        onChange={(e) => handleApplyAccentColor(e.target.value)}
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-[0.6rem]">{customAccentColor}</span>
                    </label>
                  </div>
                </div>

                {/* Section 2: Node Geometry / Shape */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.68rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Node Geometry Shape
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'card' as NodeShape, label: 'Modern Card', emoji: '🪪' },
                      { id: 'pill' as NodeShape, label: 'Capsule Pill', emoji: '💊' },
                      { id: 'sharp' as NodeShape, label: 'Minimal Box', emoji: '▭' },
                      { id: 'cuboid' as NodeShape, label: '3D Cuboid', emoji: '🧊' },
                      { id: 'glass' as NodeShape, label: 'Glassmorphism', emoji: '🪟' },
                      { id: 'terminal' as NodeShape, label: 'CLI Console', emoji: '💻' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleApplyShape(s.id)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${selectedNodeShape === s.id
                            ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-400/40'
                          }`}
                      >
                        <span className="text-xs">{s.emoji}</span>
                        <span className="text-[0.65rem] truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Connector Line Style */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.68rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Connector Lines
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'animated' as EdgeStrokeStyle, label: 'Animated' },
                      { id: 'solid' as EdgeStrokeStyle, label: 'Solid' },
                      { id: 'dashed' as EdgeStrokeStyle, label: 'Dashed' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleApplyConnectorStyle(st.id, connectorStrokeWidth)}
                        className={`flex-1 py-1 px-1.5 rounded-lg border text-center text-[0.65rem] font-semibold transition-all cursor-pointer ${connectorStrokeStyle === st.id
                            ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[0.65rem] text-[var(--text-muted)] pt-1">
                    <span>Line Width:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleApplyConnectorStyle(connectorStrokeStyle, w)}
                          className={`px-2 py-0.5 rounded border text-[0.62rem] font-mono cursor-pointer ${connectorStrokeWidth === w
                              ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-bold'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* 3. Theme Dropdown Button (Exact same design as Export) */}
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsThemeMenuOpen((prev) => !prev);
                setIsExportMenuOpen(false);
                setIsTemplateModalOpen(false);
                setIsStyleModalOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isThemeMenuOpen
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              title="Switch Canvas Aesthetic Theme"
            >
              <Palette size={12} className="text-amber-500" />
              <span className="capitalize hidden sm:inline">
                Theme: {aestheticTheme === 'bbot-dark'
                  ? 'Obsidian'
                  : aestheticTheme === 'whiteboard'
                    ? 'Paper'
                    : aestheticTheme === 'cyberpunk'
                      ? 'Cyber'
                      : 'Emerald'}
              </span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isThemeMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={themeDropdownRef}
                data-studio-popover="theme"
                style={getDropdownFixedStyle(themeMenuRef, 192, true)}
                className="w-48 rounded-xl bg-[var(--bg-surface)]/98 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-2 animate-in fade-in zoom-in-95 flex flex-col gap-1 text-xs overscroll-contain pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/70 pb-1 mb-1">
                  Aesthetic Theme
                </div>
                {[
                  { id: 'bbot-dark' as AestheticTheme, label: 'Obsidian', icon: Moon, dot: 'bg-amber-500' },
                  { id: 'whiteboard' as AestheticTheme, label: 'Paper', icon: Sun, dot: 'bg-neutral-300' },
                  { id: 'cyberpunk' as AestheticTheme, label: 'Cyber', icon: Palette, dot: 'bg-violet-500' },
                  { id: 'emerald' as AestheticTheme, label: 'Emerald', icon: ShieldCheck, dot: 'bg-emerald-500' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = aestheticTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setAestheticTheme(t.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${isSelected
                          ? 'bg-[var(--accent)] text-white font-bold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={12} />
                        <span>{t.label}</span>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
          </div>

          {/* 4. Canvas Background Customizer Button */}
          <div className="relative" ref={bgMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBgMenuOpen((prev) => !prev);
                setIsExportMenuOpen(false);
                setIsThemeMenuOpen(false);
                setIsTemplateModalOpen(false);
                setIsStyleModalOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isBgMenuOpen
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              title="Change Canvas Background Color & Pattern"
            >
              <Paintbrush size={12} className="text-cyan-400" />
              <span className="hidden sm:inline">Background</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs shrink-0"
                style={{ backgroundColor: activeCanvasBg }}
              />
              <ChevronDown size={11} className={`transition-transform duration-150 ${isBgMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBgMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={bgDropdownRef}
                data-studio-popover="bg"
                style={getDropdownFixedStyle(bgMenuRef, 288, false)}
                className="w-72 rounded-2xl bg-[var(--bg-surface)]/98 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-3 animate-in fade-in zoom-in-95 flex flex-col gap-3 text-xs pointer-events-auto overscroll-contain"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]/70">
                  <div className="flex items-center gap-1.5">
                    <Paintbrush size={13} className="text-cyan-400" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Canvas Background</span>
                  </div>
                  {diagram.canvasBg && (
                    <button
                      type="button"
                      onClick={() => updateDiagramWithHistory({ ...diagram, canvasBg: undefined })}
                      className="text-[0.62rem] text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                      title="Reset to Theme Default"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                </div>

                {/* Color Presets */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Color Presets
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { hex: '#181a1f', name: 'Obsidian' },
                      { hex: '#090a0f', name: 'OLED Black' },
                      { hex: '#0b1220', name: 'Midnight' },
                      { hex: '#1e293b', name: 'Slate' },
                      { hex: '#07130e', name: 'Emerald' },
                      { hex: '#060814', name: 'Cyber Night' },
                      { hex: '#FDFCF7', name: 'Paper White' },
                      { hex: '#FFFFFF', name: 'Pure White' },
                    ].map((c) => {
                      const isSelected = activeCanvasBg.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => updateDiagramWithHistory({ ...diagram, canvasBg: c.hex })}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-400/30 font-bold'
                              : 'border-[var(--border-subtle)] hover:border-cyan-400/50'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-md border border-white/20 shadow-xs"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[0.58rem] truncate max-w-full text-[var(--text-secondary)]">
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/70">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Custom Hex Color
                  </span>
                  <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] cursor-pointer">
                    <input
                      type="color"
                      value={activeCanvasBg.startsWith('#') && activeCanvasBg.length === 7 ? activeCanvasBg : '#181a1f'}
                      onChange={(e) => updateDiagramWithHistory({ ...diagram, canvasBg: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-[0.62rem] text-[var(--text-primary)]">
                      {activeCanvasBg}
                    </span>
                  </label>
                </div>

                {/* Background Grid Pattern */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border-subtle)]/70">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Grid Style
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'dots', label: '• Dots' },
                      { id: 'grid', label: '# Grid' },
                      { id: 'clean', label: '◻ Clean' },
                    ].map((gp) => {
                      const isCurrent = (diagram.canvasGridPattern || 'dots') === gp.id;
                      return (
                        <button
                          key={gp.id}
                          type="button"
                          onClick={() => updateDiagramWithHistory({ ...diagram, canvasGridPattern: gp.id as any })}
                          className={`py-1 px-1.5 rounded-lg border text-center text-[0.65rem] font-semibold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {gp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>



          {/* 5. Export Dropdown Button (Reference design) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen((prev) => !prev);
                setIsThemeMenuOpen(false);
                setIsTemplateModalOpen(false);
                setIsStyleModalOpen(false);
                setIsBgMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isExportMenuOpen
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              title="Export diagram as PNG, SVG, Mermaid markdown, or JSON"
            >
              <Share2 size={12} className="text-emerald-500" />
              <span>Export</span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={exportDropdownRef}
                data-studio-popover="export"
                style={getDropdownFixedStyle(exportMenuRef, 256, true)}
                className="w-64 rounded-xl bg-[var(--bg-surface)]/98 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl p-2 animate-in fade-in zoom-in-95 flex flex-col gap-1 text-xs overscroll-contain pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/70 pb-1.5 mb-1 flex items-center justify-between">
                  <span>Export & Share Visual</span>
                  <span className="text-[0.6rem] text-emerald-400 font-mono">Hi-Res Vector</span>
                </div>

                {/* Copy PNG */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopyImage();
                  }}
                  disabled={isCopying}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Copy size={13} className="text-emerald-500" />
                    <span>Copy PNG Image</span>
                  </div>
                  {copySuccess ? (
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-500">
                      <CheckCheck size={11} /> Copied!
                    </span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">Clipboard</span>
                  )}
                </button>

                {/* Download PNG */}
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPng();
                  }}
                  disabled={isDownloading}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download size={13} className="text-teal-500" />
                    <span>Download PNG</span>
                  </div>
                  {downloadSuccess ? (
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-teal-500">
                      <CheckCheck size={11} /> Saved!
                    </span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">.png</span>
                  )}
                </button>

                {/* Copy SVG */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopySvg();
                  }}
                  disabled={isCopyingSvg}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={13} className="text-sky-500" />
                    <span>Copy Vector SVG</span>
                  </div>
                  {copySvgSuccess ? (
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-500">
                      <CheckCheck size={11} /> Copied!
                    </span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">XML</span>
                  )}
                </button>

                {/* Download SVG */}
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSvg();
                  }}
                  disabled={isDownloading}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download size={13} className="text-cyan-500" />
                    <span>Download SVG</span>
                  </div>
                  <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">.svg</span>
                </button>

                <div className="border-t border-[var(--border-subtle)]/70 my-1 pt-1" />

                {/* Copy Mermaid */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopyMermaid();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Code2 size={13} className="text-indigo-400" />
                    <span>Copy Mermaid Markdown</span>
                  </div>
                  {copyMermaidSuccess ? (
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-500">
                      <CheckCheck size={11} /> Copied!
                    </span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">Docs</span>
                  )}
                </button>

                {/* Copy Diagram JSON */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopyDiagramJson();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileJson size={13} className="text-amber-400" />
                    <span>Copy Diagram JSON</span>
                  </div>
                  {jsonCopyToast ? (
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-500">
                      <CheckCheck size={11} /> Copied!
                    </span>
                  ) : (
                    <span className="text-[0.62rem] text-[var(--text-muted)] font-mono">Spec</span>
                  )}
                </button>
              </div>,
              document.body
            )}
          </div>

          {/* 6. Symmetrical Auto-Tidy Button */}
          {!isChart && (
            <button
              type="button"
              onClick={handleAutoTidy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title="Auto-Tidy: Symmetrical Leveling & Equal Spacing (1-Click Clean)"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span className="hidden sm:inline">Auto-Tidy</span>
            </button>
          )}

          {/* 7. Clear Canvas Button */}
          {onRequestClearCanvas && (
            <button
              type="button"
              onClick={onRequestClearCanvas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-rose-500/10 hover:border-rose-500/30 text-[var(--text-muted)] hover:text-rose-400 px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
              title="Clear or delete canvas (prompts to save first)"
              aria-label="Clear Canvas"
            >
              <RotateCcw size={12} className="text-rose-400" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

        </div>

        {/* Right: bbot Studio AI, In-Canvas Search, Utilities Cluster, Presentation, Fullscreen, Shortcuts */}
        <div className="flex items-center gap-1.5 shrink-0 relative overflow-visible">
          {/* bbot Studio AI Copilot Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 text-xs font-bold shadow-xs hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer shrink-0"
            title="bbot Studio Visual Assistant (Ctrl+K)"
          >
            <Sparkles size={12} className="text-amber-500 animate-pulse" />
            <span className="hidden sm:inline">bbot Studio AI</span>
            <kbd className="hidden md:inline font-mono text-[0.6rem] px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
              Ctrl+K
            </kbd>
          </button>

          {/* In-Canvas Search */}
          {!isChart && (
            <div className="flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-xs">
                  <Search size={11} className="text-[var(--text-muted)] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="w-20 sm:w-28 bg-transparent text-[0.68rem] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                  {searchQuery && (
                    <span className="text-[0.6rem] font-mono text-[var(--accent)] font-semibold shrink-0">
                      {matchingNodeCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                  title="Search stages (Ctrl+F)"
                >
                  <Search size={12} />
                </button>
              )}
            </div>
          )}

          {/* Canvas Utilities: Dot Grid Toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`rounded p-1 transition-colors cursor-pointer ${showGrid
                  ? 'bg-amber-500/20 text-amber-500 font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              title={`Toggle Dot Grid (${showGrid ? 'On' : 'Off'}) (G)`}
            >
              <Grid2x2 size={12} />
            </button>
          </div>

          {/* Presentation Mode Toggle */}
          {!isChart && diagram.nodes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsPresenting(!isPresenting);
                setPresentingIndex(0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 ${isPresenting
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-violet-400 shadow-[0_0_16px_rgba(139,92,246,0.4)]'
                  : 'border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-900 hover:text-violet-950 dark:border-violet-500/40 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:text-violet-300'
                }`}
              title="Interactive Presentation Walkthrough Mode (Keyboard: P / ← / → / Space)"
            >
              <Play size={11} className={isPresenting ? 'fill-current' : ''} />
              <span className="hidden sm:inline">{isPresenting ? 'Presenting...' : 'Present'}</span>
              <kbd className="font-mono text-[0.6rem] px-1 py-0.2 rounded bg-black/10 dark:bg-black/20 text-neutral-800 dark:text-white/80">
                P
              </kbd>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer shrink-0"
            title={isFullscreen ? 'Exit full screen' : 'Full screen canvas (F)'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Keyboard Shortcuts Cheatsheet Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer shrink-0"
            title="Keyboard Shortcuts Cheatsheet (?)"
            aria-label="Keyboard Shortcuts Cheatsheet"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>
    </div>

{/* Friendly First-Time User Tip Banner */}
      {showOnboardingTip && (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 text-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px]">💡</span>
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">Quick Tip:</strong> Double-click any stage card to edit text • Click <strong>+ Add Node</strong> to insert steps • Click <strong>Export</strong> when done.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowOnboardingTip(false);
              try { localStorage.setItem('bbot_studio_tip_dismissed', 'true'); } catch {}
            }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
            title="Dismiss tip"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Auto-Tidy Success Notification Pill */}
      {autoTidyToast && (
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 text-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[var(--text-primary)] font-bold">
              Canvas Auto-Tidied: Symmetrical Levels & Equal Gutters Applied ✨
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAutoTidyToast(false)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Instant View Variations (0ms Client-Side Transformation) - Only rendered in Template Mode */}
      {!isChart && viewMode === 'template' && (() => {
        const VARIATION_THEMES: Record<string, { active: string; inactive: string; dot: string }> = {
          timeline: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-amber-400/50',
            dot: 'bg-amber-500',
          },
          funnel: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-rose-400/50',
            dot: 'bg-rose-500',
          },
          bento_grid: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-purple-400/50',
            dot: 'bg-purple-500',
          },
          quadrant: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-emerald-400/50',
            dot: 'bg-emerald-500',
          },
          circular_loop: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-cyan-400/50',
            dot: 'bg-cyan-500',
          },
          concept_map: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-blue-400/50',
            dot: 'bg-blue-500',
          },
          hierarchy: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-indigo-400/50',
            dot: 'bg-indigo-500',
          },
          mindmap: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-fuchsia-400/50',
            dot: 'bg-fuchsia-500',
          },
          comparison: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-orange-400/50',
            dot: 'bg-orange-500',
          },
          sequence: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-teal-400/50',
            dot: 'bg-teal-500',
          },
          process_flow: {
            active: 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold',
            inactive: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:border-amber-400/50',
            dot: 'bg-amber-500',
          },
        };

        return (
          <div className="relative flex items-center bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-2.5 py-1.5 shrink-0 overflow-hidden">
            <span className="font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1 shrink-0 text-[0.65rem] px-2.5 border-r border-[var(--border-subtle)] mr-1">
              <Sparkles size={11} /> Variations:
            </span>

            {/* Left Scroll Arrow */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollVariations('left')}
                className="absolute left-[138px] z-20 p-1 rounded-full bg-[var(--bg-surface)]/95 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-md hover:scale-110 transition-all backdrop-blur-xs"
                title="Scroll left"
              >
                <ChevronLeft size={13} />
              </button>
            )}

            {/* Scrollable Variations Carousel */}
            <div
              ref={variationsRef}
              onScroll={checkVariationsScroll}
              onWheel={(e) => {
                if (!variationsRef.current || !variationsRef.current.contains(e.target as Node)) {
                  return;
                }
                if (e.deltaY !== 0) {
                  variationsRef.current.scrollLeft += e.deltaY;
                  checkVariationsScroll();
                }
              }}
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-1 scrollbar-none scroll-smooth flex-1"
            >
              {[
                { id: 'timeline', label: 'Roadmap Track' },
                { id: 'funnel', label: 'Conversion Funnel' },
                { id: 'bento_grid', label: 'Bento Grid' },
                { id: 'quadrant', label: '2x2 Matrix' },
                { id: 'circular_loop', label: 'Circular Flywheel' },
                { id: 'concept_map', label: 'Architecture Map' },
                { id: 'hierarchy', label: 'Org Tree' },
                { id: 'mindmap', label: 'Mind Map' },
                { id: 'comparison', label: 'Comparison' },
                { id: 'sequence', label: 'SOP Stepper' },
                { id: 'process_flow', label: 'Process Flow' },
              ].map((t) => {
                const isSelected = diagram.diagramType === t.id;
                const theme = VARIATION_THEMES[t.id] || VARIATION_THEMES['process_flow'];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={(e) => {
                      updateDiagramWithHistory({ ...diagram, diagramType: t.id });
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                    className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all duration-150 shrink-0 text-[0.68rem] border shadow-xs ${isSelected ? theme.active : theme.inactive
                      }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${theme.dot} transition-transform group-hover:scale-125 ${isSelected ? 'shadow-[0_0_6px_rgba(255,255,255,0.8)]' : ''}`} />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                );
              })}
              {/* Generous right spacer so the last pill (Process Flow) is never clipped */}
              <div className="w-12 shrink-0 pointer-events-none" />
            </div>

            {/* Right Scroll Arrow */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollVariations('right')}
                className="absolute right-2 z-20 p-1 rounded-full bg-[var(--bg-surface)]/95 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-md hover:scale-110 transition-all backdrop-blur-xs"
                title="Scroll right to see more variations"
              >
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        );
      })()}

      {/* Main Canvas Area */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          backgroundColor: activeCanvasBg,
          backgroundImage: (diagram.canvasGridPattern === 'clean' || !showGrid)
            ? undefined
            : diagram.canvasGridPattern === 'grid'
              ? `linear-gradient(to right, ${activeCanvasBg === '#FDFCF7' || activeCanvasBg === '#FFFFFF' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'} 1px, transparent 1px), linear-gradient(to bottom, ${activeCanvasBg === '#FDFCF7' || activeCanvasBg === '#FFFFFF' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'} 1px, transparent 1px)`
              : `radial-gradient(circle, ${activeCanvasBg === '#FDFCF7' || activeCanvasBg === '#FFFFFF' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)'} 1.25px, transparent 1.25px)`,
          backgroundSize: showGrid && diagram.canvasGridPattern !== 'clean' ? `${26 * zoom}px ${26 * zoom}px` : undefined,
          backgroundPosition: showGrid && diagram.canvasGridPattern !== 'clean' ? `${panOffset.x}px ${panOffset.y}px` : undefined,
        }}
        className={`flex-1 overflow-y-auto overflow-x-auto p-4 md:p-6 flex flex-col items-center justify-start relative transition-colors ${
          activeCanvasBg === '#FDFCF7' || activeCanvasBg === '#FFFFFF' ? 'text-neutral-900' : 'text-white'
        }`}
      >
        {/* Floating AI Polish Toast */}
        {polishToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-amber-400/40 text-[var(--text-primary)] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles size={13} />
            </div>
            <div className="flex flex-col text-left max-w-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.68rem] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  AI Polish Applied
                </span>
                <span className="text-[0.65rem] text-[var(--text-muted)] font-mono line-clamp-1">
                  • {polishToast.label}
                </span>
              </div>
              <span className="text-[0.65rem] text-[var(--text-secondary)] line-clamp-1">
                {polishToast.text}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPolishToast(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-2 p-0.5 rounded hover:bg-[var(--bg-surface-hover)]"
              title="Dismiss notification"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <style>{`
          @keyframes flowMarch {
            to {
              stroke-dashoffset: -14;
            }
          }
          .flow-connector-line {
            animation: flowMarch 1.1s linear infinite;
          }
        `}</style>
        {/* CHART RENDERER */}
        {isChart && diagram.chartData && (
          <div
            ref={chartRef}
            className="w-full max-w-4xl my-0 pt-4 pb-12 flex flex-col items-center gap-5 transition-transform will-change-transform"
            style={{ transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <div className="w-full h-[360px] p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                {diagram.diagramType === 'bar_chart' ? (
                  <BarChart
                    data={sanitizedChartData.rows}
                    margin={{ top: 28, right: 35, left: 15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey={diagram.chartData.xAxisKey} stroke="var(--text-muted)" fontSize={12} />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={12}
                      domain={[sanitizedChartData.yMin, sanitizedChartData.yMax]}
                      unit={diagram.chartData.unit ? ` ${diagram.chartData.unit}` : ''}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Legend />
                    {diagram.chartData.dataKeys.map((key, i) => (
                      <Bar key={key} dataKey={key} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} radius={[6, 6, 0, 0]} />
                    ))}
                  </BarChart>
                ) : diagram.diagramType === 'line_chart' ? (
                  <LineChart
                    data={sanitizedChartData.rows}
                    margin={{ top: 28, right: 35, left: 15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey={diagram.chartData.xAxisKey} stroke="var(--text-muted)" fontSize={12} />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={12}
                      domain={[sanitizedChartData.yMin, sanitizedChartData.yMax]}
                      unit={diagram.chartData.unit ? ` ${diagram.chartData.unit}` : ''}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Legend />
                    {diagram.chartData.dataKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={PALETTE_COLORS[i % PALETTE_COLORS.length]}
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Legend />
                    <Pie
                      data={sanitizedChartData.rows}
                      dataKey={diagram.chartData.dataKeys[0] || 'value'}
                      nameKey={diagram.chartData.xAxisKey}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={45}
                      paddingAngle={3}
                      label
                    >
                      {sanitizedChartData.rows.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE_COLORS[index % PALETTE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Editable Data Points Table */}
            {showDataTable && (
              <div className="w-full max-w-[850px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Chart Data Points (Click to edit)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddChartRow}
                    className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] px-2.5 py-1 text-xs font-semibold transition-colors"
                  >
                    <Plus size={11} /> Add Data Row
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                        <th className="py-2 px-3 font-semibold">{diagram.chartData.xAxisKey}</th>
                        {diagram.chartData.dataKeys.map((dk) => (
                          <th key={dk} className="py-2 px-3 font-semibold">
                            {dk} {diagram.chartData?.unit ? `(${diagram.chartData.unit})` : ''}
                          </th>
                        ))}
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagram.chartData.rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row[diagram.chartData!.xAxisKey] || ''}
                              onChange={(e) => handleUpdateChartRow(idx, diagram.chartData!.xAxisKey, e.target.value)}
                              className="w-full bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] font-medium"
                            />
                          </td>
                          {diagram.chartData!.dataKeys.map((dk) => (
                            <td key={dk} className="py-2 px-3">
                              <input
                                type="number"
                                value={row[dk] || 0}
                                onChange={(e) => handleUpdateChartRow(idx, dk, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-transparent border-b border-transparent focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] font-mono"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteChartRow(idx)}
                              className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1"
                              title="Delete row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SPECIALIZED DIAGRAM LAYOUT RENDERER */}
        {!isChart && (() => {
          interface RenderNodeOptions {
            layout?: 'timeline' | 'hierarchy' | 'mindmap' | 'comparison' | 'sequence' | 'decision' | 'standard' | 'circular_loop' | 'bento_grid';
            accentColor?: string;
            widthClass?: string;
            customBadge?: string;
            isDecision?: boolean;
            isApex?: boolean;
            isHero?: boolean;
          }

          const renderNodeCard = (node: NodeSpec, i: number, options: RenderNodeOptions = {}) => {
            const isEditing = editingNodeId === node.id;
            const activeIcon = node.icon || resolveSemanticIcon(node.label, node.sublabel, node.type);
            const isDecision = options.isDecision || node.type === 'decision';
            const isEnd = node.type === 'end';
            const isApex = options.isApex || options.isHero;
            const accentColor = options.accentColor;
            const widthClass = options.widthClass || 'w-[240px]';

            const spectrum = getSpectrumColor(i, diagram.nodes.length, aestheticTheme);
            const activeColor = accentColor || spectrum.border;

            // Step 1: Shape Geometries & Custom Styling
            const nodeShape = node.customStyle?.shape || selectedNodeShape || 'card';
            const customBorderColor = node.customStyle?.borderColor;
            const customBgColor = node.customStyle?.bgColor;
            const customTextColor = node.customStyle?.textColor;
            const customBorderWidth = node.customStyle?.borderWidth || 1;

            let shapeBorderRadius = 'rounded-2xl';
            if (nodeShape === 'pill') {
              shapeBorderRadius = 'rounded-full px-6 py-3.5';
            } else if (nodeShape === 'sharp') {
              shapeBorderRadius = 'rounded-none border-2';
            } else if (nodeShape === 'cuboid') {
              shapeBorderRadius = 'rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,0.5)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.18)]';
            } else if (nodeShape === 'glass') {
              shapeBorderRadius = 'rounded-2xl backdrop-blur-2xl bg-white/15 dark:bg-white/5 border border-white/30 shadow-2xl';
            } else if (nodeShape === 'terminal') {
              shapeBorderRadius = 'rounded-xl font-mono border-cyan-500/40 bg-zinc-950 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
            } else if (nodeShape === 'minimal') {
              shapeBorderRadius = 'rounded-md border border-[var(--border-subtle)] bg-transparent shadow-none';
            }

            // Presentation spotlight mode handling
            const isSpotlightActive = isPresenting && i === presentingIndex;
            const isSpotlightDimmed = isPresenting && i !== presentingIndex;

            // Search match and highlighting
            const isMatch = !normalizedQuery || `${node.label} ${node.sublabel || ''} ${node.group || ''}`.toLowerCase().includes(normalizedQuery);
            const isDimmedBySearch = normalizedQuery.length > 0 && !isMatch;
            const isHighlightedBySearch = normalizedQuery.length > 0 && isMatch;

            return (
              <div
                key={node.id}
                id={`stage-card-${node.id}`}
                className={`relative group ${widthClass} ${shapeBorderRadius} border transition-all duration-200 overflow-hidden ${aestheticTheme === 'whiteboard'
                    ? 'bg-[#FFFFFF] text-neutral-900 shadow-sm hover:shadow-lg'
                    : aestheticTheme === 'cyberpunk' || aestheticTheme === 'gradient'
                      ? 'bg-[#080d1e]/90 text-white shadow-md hover:shadow-2xl'
                      : aestheticTheme === 'emerald'
                        ? 'bg-[#0a1712]/90 text-white shadow-md hover:shadow-2xl'
                        : 'bg-[var(--bg-primary)] shadow-sm hover:shadow-xl'
                  } p-4 ${isEditing
                    ? 'border-[var(--accent)] ring-2 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] shadow-[var(--energy-glow)]'
                    : isSpotlightActive
                      ? 'scale-105 ring-4 ring-[var(--accent)] shadow-[0_0_35px_rgba(200,117,20,0.45)] z-20'
                      : isSpotlightDimmed || isDimmedBySearch
                        ? 'opacity-25 grayscale scale-95 blur-[0.4px] pointer-events-none'
                        : isHighlightedBySearch
                          ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02]'
                          : isApex
                            ? 'border-[var(--accent)] shadow-[0_0_22px_rgba(200,117,20,0.22)] ring-1 ring-[var(--accent)]/30'
                            : isDecision
                              ? 'border-amber-500/55 shadow-[0_0_16px_rgba(200,117,20,0.12)] hover:border-amber-500'
                              : 'border-[var(--border-subtle)] hover:border-[var(--accent)]'
                  }`}
                style={
                  !isEditing && !isSpotlightActive
                    ? {
                      borderColor: customBorderColor ? `${customBorderColor}88` : `${activeColor}55`,
                      boxShadow: customBorderColor ? `0 4px 20px -2px ${customBorderColor}33` : `0 4px 20px -2px ${spectrum.glow}`,
                      borderWidth: `${customBorderWidth}px`,
                      ...(customBgColor ? { backgroundColor: customBgColor } : {}),
                      ...(customTextColor ? { color: customTextColor } : {}),
                    }
                    : {
                      ...(customBgColor ? { backgroundColor: customBgColor } : {}),
                      ...(customTextColor ? { color: customTextColor } : {}),
                    }
                }
              >
                {/* Specular Rim-Light (Top Edge 1px Specular Gradient Highlight) */}
                <div
                  className="absolute inset-x-0 top-0 h-[1px] pointer-events-none rounded-t-2xl z-10"
                  style={{
                    background:
                      aestheticTheme === 'whiteboard'
                        ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  }}
                />

                {/* Card Header with Semantic Icon, Role/Group Pill & Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs border transition-transform group-hover:scale-105 ${isApex
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 shadow-sm'
                          : isDecision
                            ? 'bg-amber-500/15 border-amber-500/35 text-amber-500'
                            : isEnd
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                              : ''
                        }`}
                      style={
                        !isApex && !isDecision && !isEnd
                          ? {
                            backgroundColor: spectrum.bg,
                            borderColor: `${spectrum.border}50`,
                            color: spectrum.text,
                          }
                          : undefined
                      }
                    >
                      {renderSemanticIcon(activeIcon, 16)}
                    </div>
                    <span
                      className={`text-[0.62rem] font-bold uppercase tracking-wider line-clamp-1 max-w-[100px] ${aestheticTheme === 'whiteboard' ? 'text-neutral-500' : 'text-[var(--text-muted)]'
                        }`}
                    >
                      {node.group || (isApex ? 'Executive' : (node.type || 'Stage'))}
                    </span>
                  </div>

                  {/* Step / Metric Badge or Custom Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[0.65rem] font-bold px-2 py-0.5 rounded-lg border shadow-xs"
                      style={{
                        backgroundColor:
                          aestheticTheme === 'whiteboard' ? spectrum.badgeBg : spectrum.bg,
                        borderColor: `${spectrum.border}45`,
                        color: spectrum.text,
                      }}
                    >
                      {options.customBadge || node.badge || String(i + 1).padStart(2, '0')}
                    </span>

                    <div
                      data-interactive="true"
                      data-export-exclude="true"
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveNode(i, 'left');
                          }}
                          className={`rounded-md p-1 transition-colors ${aestheticTheme === 'whiteboard'
                              ? 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                              : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]'
                            }`}
                          title="Move stage earlier (Left/Up)"
                        >
                          <ChevronLeft size={12} />
                        </button>
                      )}
                      {i < diagram.nodes.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveNode(i, 'right');
                          }}
                          className={`rounded-md p-1 transition-colors ${aestheticTheme === 'whiteboard'
                              ? 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                              : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]'
                            }`}
                          title="Move stage later (Right/Down)"
                        >
                          <ChevronRight size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateNode(i);
                        }}
                        className={`rounded-md p-1 transition-colors ${aestheticTheme === 'whiteboard'
                            ? 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                            : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]'
                          }`}
                        title="Duplicate stage (Clone node)"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnhanceNode(node);
                        }}
                        disabled={enhancingNodeId === node.id}
                        className={`rounded-md p-1 transition-all ${enhancingNodeId === node.id
                            ? 'animate-pulse text-amber-500 bg-amber-500/20'
                            : aestheticTheme === 'whiteboard'
                              ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-100/70'
                              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/15'
                          }`}
                        title="1-Click AI Polish (Sharpen label, enrich SLA & operational benchmarks, auto-badge)"
                      >
                        <Sparkles size={12} className={enhancingNodeId === node.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingNode(node);
                        }}
                        className={`rounded-md p-1.5 transition-all flex items-center justify-center ${aestheticTheme === 'whiteboard'
                            ? 'text-neutral-500 hover:text-amber-800 hover:bg-amber-100/70 border border-neutral-200 shadow-xs'
                            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 shadow-xs'
                          }`}
                        title="Edit Box (Click pen to edit title, description, badge & icon)"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className={`rounded-md p-1 transition-colors ${aestheticTheme === 'whiteboard'
                            ? 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-surface)]'
                          }`}
                        title="Delete node"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Node Content / Inline Edit Form */}
                {isEditing ? (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)] mt-2">
                    <div>
                      <label className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Label</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Stage Title"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Details / Sublabel</label>
                      <textarea
                        value={editSublabel}
                        onChange={(e) => setEditSublabel(e.target.value)}
                        placeholder="Description or criteria"
                        rows={2}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-[0.7rem] text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Role Type</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 text-[0.65rem] text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="start">Start</option>
                          <option value="process">Process</option>
                          <option value="decision">Decision</option>
                          <option value="end">End</option>
                          <option value="store">Data Store</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Step / Badge</label>
                        <input
                          type="text"
                          value={editBadge}
                          onChange={(e) => setEditBadge(e.target.value)}
                          placeholder="01, P1, SLA"
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 text-[0.65rem] text-[var(--text-primary)] font-mono focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Semantic Icon Grid */}
                    <div>
                      <label className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase block mb-1">Pick Semantic Icon</label>
                      <div className="grid grid-cols-8 gap-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {AVAILABLE_ICONS.map((ic) => (
                          <button
                            key={ic.name}
                            type="button"
                            onClick={() => setEditIcon(ic.name)}
                            title={ic.label}
                            className={`p-1 rounded flex items-center justify-center transition-colors ${editIcon === ic.name
                                ? 'bg-[var(--accent)] text-white shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)]'
                              }`}
                          >
                            {renderSemanticIcon(ic.name, 12)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingNodeId(null)}
                        className="rounded-lg px-2 py-1 text-[0.68rem] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditingNode}
                        className="rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-2.5 py-1 text-[0.68rem] font-bold text-white transition-colors shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => startEditingNode(node)}
                    className="pt-0.5 select-text"
                  >
                    <h4
                      className={`text-sm font-bold leading-snug break-words ${aestheticTheme === 'whiteboard' ? 'text-neutral-900' : 'text-[var(--text-primary)]'
                        }`}
                    >
                      {node.label}
                    </h4>
                    {node.sublabel && (
                      options.layout === 'comparison' ? (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
                          {node.sublabel.split(/[;,•\n]+/).filter(Boolean).map((pt, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-1.5 text-[0.72rem] ${aestheticTheme === 'whiteboard' ? 'text-neutral-600' : 'text-[var(--text-secondary)]'
                                }`}
                            >
                              <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight break-words">{pt.trim()}</span>
                            </div>
                          ))}
                        </div>
                      ) : options.layout === 'timeline' ? (
                        <div className="mt-2 text-[0.74rem] leading-relaxed pl-2.5 border-l-2 border-amber-500/40 bg-amber-500/5 py-1 rounded-r">
                          <div className="flex items-center gap-1 text-[0.62rem] font-bold text-amber-500 uppercase tracking-wider mb-0.5">
                            <Milestone size={10} /> Milestone Output
                          </div>
                          <span className={`break-words ${aestheticTheme === 'whiteboard' ? 'text-neutral-700' : 'text-[var(--text-secondary)]'}`}>
                            {node.sublabel}
                          </span>
                        </div>
                      ) : options.layout === 'sequence' ? (
                        <div className="mt-2 text-[0.74rem] leading-relaxed pl-2.5 border-l-2 border-emerald-500/40 bg-emerald-500/5 py-1 rounded-r flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className={`break-words ${aestheticTheme === 'whiteboard' ? 'text-neutral-700' : 'text-[var(--text-secondary)]'}`}>
                            {node.sublabel}
                          </span>
                        </div>
                      ) : options.layout === 'circular_loop' ? (
                        <div className="mt-2 text-[0.74rem] leading-relaxed pl-2.5 border-l-2 border-[var(--accent)]/50 bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] py-1 rounded-r flex items-start gap-1.5">
                          <RotateCw size={11} className="text-[var(--accent)] shrink-0 mt-0.5" />
                          <span className={`break-words ${aestheticTheme === 'whiteboard' ? 'text-neutral-700' : 'text-[var(--text-secondary)]'}`}>
                            {node.sublabel}
                          </span>
                        </div>
                      ) : options.layout === 'bento_grid' ? (
                        <div className="mt-2 text-[0.74rem] leading-relaxed pl-2.5 border-l-2 border-amber-500/40 bg-[color-mix(in_srgb,var(--bg-surface)_60%,transparent)] py-1.5 rounded-r">
                          <span className={`break-words ${aestheticTheme === 'whiteboard' ? 'text-neutral-700' : 'text-[var(--text-secondary)]'}`}>
                            {node.sublabel}
                          </span>
                        </div>
                      ) : (
                        <p
                          className={`mt-2 text-[0.74rem] leading-relaxed pl-2 border-l-2 py-0.5 rounded-r break-words ${aestheticTheme === 'whiteboard'
                              ? 'text-neutral-600 border-neutral-300 bg-neutral-50'
                              : 'text-[var(--text-secondary)] border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--bg-surface)_60%,transparent)]'
                            }`}
                        >
                          {node.sublabel}
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          };

          // 1. TIMELINE / ROADMAP TRACK LAYOUT
          const renderTimelineLayout = () => (
            <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
              <div className="w-full mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Chronological Project Roadmap
                  </span>
                  <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                    {diagram.nodes.length} Key Milestones
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[0.65rem] text-[var(--text-muted)] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Inception to Delivery</span>
                </div>
              </div>

              <div className="w-full relative py-4">
                <div className="absolute top-[42px] left-6 right-6 h-1 bg-gradient-to-r from-[var(--accent)] via-amber-400 to-emerald-500 rounded-full opacity-60 shadow-[0_0_12px_rgba(200,117,20,0.3)] hidden md:block" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
                  {diagram.nodes.map((node, i) => (
                    <div key={node.id} className="flex flex-col items-center">
                      <div className="flex flex-col items-center mb-3">
                        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] bg-[var(--bg-primary)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent)] shadow-md ring-4 ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] group-hover:scale-110 transition-transform">
                          {node.badge || String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="w-0.5 h-3 bg-[var(--accent)]/50 mt-1" />
                      </div>
                      {renderNodeCard(node, i, {
                        layout: 'timeline',
                        widthClass: 'w-full',
                        customBadge: node.badge || `PHASE 0${i + 1}`,
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

          // 2. HIERARCHY / ORG CHART TREE LAYOUT
          const renderHierarchyLayout = () => {
            if (diagram.nodes.length === 0) return null;
            const apexNode = diagram.nodes[0];
            const tier2Count = Math.min(Math.max(1, Math.floor((diagram.nodes.length - 1) / 2)), 3);
            const tier2Nodes = diagram.nodes.slice(1, 1 + tier2Count);
            const tier3Nodes = diagram.nodes.slice(1 + tier2Count);

            return (
              <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <div className="text-[0.62rem] font-bold uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> Executive Governance Tier
                  </div>
                  {renderNodeCard(apexNode, 0, {
                    layout: 'hierarchy',
                    isApex: true,
                    widthClass: 'w-[280px]',
                    customBadge: apexNode.badge || 'TIER 1 • APEX',
                  })}
                </div>

                {tier2Nodes.length > 0 && (
                  <>
                    <div className="w-0.5 h-8 bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/40 my-1" />
                    <div className="relative w-full max-w-2xl flex justify-center items-center">
                      <div className="h-0.5 bg-[var(--accent)]/40 rounded-full w-full max-w-xl shadow-xs" />
                    </div>
                    <div className="w-full max-w-3xl flex flex-wrap justify-center gap-6 mt-1">
                      {tier2Nodes.map((node, idx) => (
                        <div key={node.id} className="flex flex-col items-center">
                          <div className="w-0.5 h-5 bg-[var(--accent)]/40" />
                          {renderNodeCard(node, idx + 1, {
                            layout: 'hierarchy',
                            widthClass: 'w-[250px]',
                            customBadge: node.badge || `TIER 2 • LEAD`,
                            accentColor: PALETTE_COLORS[idx % PALETTE_COLORS.length],
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {tier3Nodes.length > 0 && (
                  <>
                    <div className="w-0.5 h-6 bg-[var(--accent)]/30 my-1" />
                    <div className="text-[0.62rem] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 flex items-center gap-1">
                      <Users size={12} /> Operational Squads & Specialists
                    </div>
                    <div className="w-full max-w-4xl flex flex-wrap justify-center gap-4">
                      {tier3Nodes.map((node, idx) => (
                        <div key={node.id} className="flex flex-col items-center">
                          {renderNodeCard(node, idx + 1 + tier2Nodes.length, {
                            layout: 'hierarchy',
                            widthClass: 'w-[230px]',
                            customBadge: node.badge || `TIER 3 • OPS`,
                            accentColor: PALETTE_COLORS[(idx + 2) % PALETTE_COLORS.length],
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          };

          // 3. MIND MAP RADIATING CANVAS LAYOUT
          const renderMindMapLayout = () => {
            if (diagram.nodes.length === 0) return null;
            const centralNode = diagram.nodes[0];
            const satelliteBranches = diagram.nodes.slice(1);
            const leftBranches = satelliteBranches.filter((_, idx) => idx % 2 === 0);
            const rightBranches = satelliteBranches.filter((_, idx) => idx % 2 === 1);

            return (
              <div className="w-full max-w-6xl my-0 py-4 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
                {/* Left Wing Branches */}
                <div className="flex flex-col gap-5 items-center lg:items-end w-full lg:w-auto">
                  {leftBranches.map((node, idx) => {
                    const color = PALETTE_COLORS[idx % PALETTE_COLORS.length];
                    return (
                      <div key={node.id} className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
                        {renderNodeCard(node, idx * 2 + 1, {
                          layout: 'mindmap',
                          accentColor: color,
                          widthClass: 'w-[240px]',
                          customBadge: node.badge || `BRANCH 0${idx + 1}`,
                        })}
                        <div
                          className="h-0.5 w-8 rounded-full hidden lg:block"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Central Core Hub Node */}
                <div className="flex flex-col items-center shrink-0 relative my-4 lg:my-0">
                  <div className="absolute inset-0 rounded-3xl bg-[var(--accent)]/15 blur-2xl animate-pulse pointer-events-none" />
                  <div className="relative">
                    <div className="text-[0.62rem] font-bold uppercase tracking-widest text-[var(--accent)] mb-1 text-center flex items-center justify-center gap-1">
                      <Sparkles size={11} /> Central Knowledge Core
                    </div>
                    {renderNodeCard(centralNode, 0, {
                      layout: 'mindmap',
                      isApex: true,
                      widthClass: 'w-[270px]',
                      customBadge: 'CORE THEME',
                    })}
                  </div>
                </div>

                {/* Right Wing Branches */}
                <div className="flex flex-col gap-5 items-center lg:items-start w-full lg:w-auto">
                  {rightBranches.map((node, idx) => {
                    const color = PALETTE_COLORS[(idx + 2) % PALETTE_COLORS.length];
                    return (
                      <div key={node.id} className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-start">
                        <div
                          className="h-0.5 w-8 rounded-full hidden lg:block"
                          style={{ backgroundColor: color }}
                        />
                        {renderNodeCard(node, idx * 2 + 2, {
                          layout: 'mindmap',
                          accentColor: color,
                          widthClass: 'w-[240px]',
                          customBadge: node.badge || `BRANCH 0${idx + 1 + leftBranches.length}`,
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };

          // 4. COMPARISON SIDE-BY-SIDE MATRIX LAYOUT
          const renderComparisonLayout = () => (
            <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
              <div className="w-full mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Columns size={15} className="text-[var(--accent)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Comparative Benchmark & Trade-off Matrix
                  </span>
                </div>
                <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                  {diagram.nodes.length} Options Evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-stretch">
                {diagram.nodes.map((node, i) => {
                  const isWinner = i === 0;
                  return (
                    <div key={node.id} className="flex flex-col relative h-full">
                      {isWinner && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-[var(--accent)] text-white text-[0.62rem] font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
                          <Sparkles size={11} /> Recommended Choice
                        </div>
                      )}
                      {renderNodeCard(node, i, {
                        layout: 'comparison',
                        widthClass: 'w-full h-full',
                        customBadge: node.group || `OPTION 0${i + 1}`,
                        isApex: isWinner,
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );

          // 5. SEQUENCE EXECUTIVE SOP STEPPER LAYOUT
          const renderSequenceLayout = () => (
            <div className="w-full max-w-3xl my-0 py-4 flex flex-col gap-0 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-1 bg-gradient-to-b from-[var(--accent)] via-amber-500/40 to-emerald-500/60 rounded-full hidden sm:block" />
              {diagram.nodes.map((node, i) => {
                const nextNode = diagram.nodes[i + 1];
                return (
                  <div key={node.id} className="flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 relative group pb-4 last:pb-0">
                      <div className="w-12 h-12 rounded-2xl border-2 border-[var(--accent)] bg-[var(--bg-primary)] flex items-center justify-center font-mono font-bold text-sm text-[var(--accent)] shadow-md shrink-0 z-10 group-hover:scale-105 transition-transform">
                        {node.badge || String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 w-full">
                        {renderNodeCard(node, i, {
                          layout: 'sequence',
                          widthClass: 'w-full',
                          customBadge: `STEP ${String(i + 1).padStart(2, '0')}`,
                        })}
                      </div>
                    </div>
                    {nextNode && (
                      <div className="pl-6 sm:pl-9 -mt-1 mb-2">
                        <FlowConnector
                          sourceId={node.id}
                          targetId={nextNode.id}
                          onInsertBetween={handleInsertNodeBetween}
                          orientation="vertical"
                          arrowMarker={diagram.edges.find((e) => e.source === node.id)?.customStyle?.arrowMarker || 'arrow'}
                          onUpdateMarker={handleUpdateEdgeMarker}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );

          // 6. DECISION FLOW BRANCHING ARCHITECTURE LAYOUT
          const renderDecisionFlowLayout = () => {
            const hasDecision = diagram.nodes.some((n) => n.type === 'decision');
            if (!hasDecision) return renderStandardFlowLayout();

            return (
              <div className="w-full max-w-4xl my-0 py-4 flex flex-col items-center gap-5">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch size={15} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Conditional Decision & Triage Architecture
                  </span>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-5 w-full">
                  {diagram.nodes.map((node, i) => {
                    const isDecision = node.type === 'decision';
                    const outgoingEdge = diagram.edges.find((e) => e.source === node.id);
                    const nextNode = diagram.nodes[i + 1];

                    return (
                      <React.Fragment key={node.id}>
                        <div className="flex flex-col items-center">
                          {isDecision && (
                            <span className="text-[0.62rem] font-bold text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <AlertTriangle size={11} /> Decision Gateway
                            </span>
                          )}
                          {renderNodeCard(node, i, {
                            layout: 'decision',
                            isDecision,
                            widthClass: 'w-[250px]',
                            customBadge: isDecision ? 'GATEWAY' : node.badge,
                          })}
                        </div>

                        {nextNode && (
                          <FlowConnector
                            sourceId={node.id}
                            targetId={nextNode.id}
                            label={outgoingEdge?.label}
                            color={isDecision ? '#f59e0b' : undefined}
                            onInsertBetween={handleInsertNodeBetween}
                            onUpdateLabel={handleUpdateEdgeLabel}
                            orientation="horizontal"
                            arrowMarker={outgoingEdge?.customStyle?.arrowMarker || 'arrow'}
                            onUpdateMarker={handleUpdateEdgeMarker}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          };

          // 7. STANDARD PROCESS PIPELINE LAYOUT
          const renderStandardFlowLayout = () => (
            <div className="w-full flex flex-wrap justify-center items-center gap-6 max-w-5xl my-0 py-4">
              {diagram.nodes.map((node, i) => {
                const outgoingEdge = diagram.edges.find((e) => e.source === node.id);
                const nextNode = diagram.nodes[i + 1];
                return (
                  <React.Fragment key={node.id}>
                    {renderNodeCard(node, i, { layout: 'standard' })}

                    {nextNode && (
                      <FlowConnector
                        sourceId={node.id}
                        targetId={nextNode.id}
                        label={outgoingEdge?.label}
                        onInsertBetween={handleInsertNodeBetween}
                        onUpdateLabel={handleUpdateEdgeLabel}
                        orientation="horizontal"
                        arrowMarker={outgoingEdge?.customStyle?.arrowMarker || 'arrow'}
                        onUpdateMarker={handleUpdateEdgeMarker}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );

          // 8. CIRCULAR LOOP / CONTINUOUS FLYWHEEL LAYOUT
          const renderCircularLoopLayout = () => {
            const count = diagram.nodes.length;
            const topHalf = diagram.nodes.slice(0, Math.ceil(count / 2));
            const bottomHalf = diagram.nodes.slice(Math.ceil(count / 2)).reverse();

            return (
              <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
                {/* Section Header */}
                <div className="w-full mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <RotateCw size={15} className="text-[var(--accent)] animate-spin-slow" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Closed-Loop Flywheel & Continuous Lifecycle
                    </span>
                    <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                      {count} Continuous Iteration Stages
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[0.65rem] text-[var(--text-muted)] font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                    <span>Continuous Feedback Loop</span>
                  </div>
                </div>

                {/* Flywheel Container */}
                <div className="w-full relative flex flex-col items-center gap-8 py-4 px-2">
                  {/* Top Row: Flowing Left to Right */}
                  <div className="w-full flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                    {topHalf.map((node, i) => (
                      <React.Fragment key={node.id}>
                        {renderNodeCard(node, i, {
                          layout: 'circular_loop',
                          widthClass: 'w-[230px]',
                          customBadge: `LOOP 0${i + 1}`,
                          accentColor: PALETTE_COLORS[i % PALETTE_COLORS.length],
                        })}
                        {i < topHalf.length - 1 && (
                          <div className="flex items-center text-[var(--accent)] shrink-0">
                            <div className="h-[2px] w-6 bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_30%,transparent)] to-[var(--accent)]" />
                            <ArrowRight size={14} className="-ml-1 text-[var(--accent)]" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Center Flywheel Core Indicator & Connecting Track */}
                  <div className="w-full max-w-2xl flex items-center justify-between px-6 py-2 relative">
                    {/* Left Loop Back Track (Upward) */}
                    <div className="flex flex-col items-center text-emerald-500">
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-emerald-500 mb-1 font-mono">Feedback Return</span>
                      <div className="w-0.5 h-12 bg-gradient-to-t from-[var(--accent)] to-emerald-500" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] -mt-1" />
                    </div>

                    {/* Central Core Flywheel Hub */}
                    <div className="px-5 py-3 rounded-2xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--bg-surface)] shadow-md flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)]">
                        <RotateCw size={18} className="animate-spin-slow" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Self-Sustaining Flywheel</span>
                        <span className="text-[0.65rem] text-[var(--text-muted)] font-mono">Output fuels next cycle input</span>
                      </div>
                    </div>

                    {/* Right Loop Forward Track (Downward) */}
                    <div className="flex flex-col items-center text-[var(--accent)]">
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--accent)] mb-1 font-mono">Iteration Flow</span>
                      <div className="w-0.5 h-12 bg-gradient-to-b from-[var(--accent)] to-amber-500" />
                      <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(200,117,20,0.8)] -mt-1" />
                    </div>
                  </div>

                  {/* Bottom Row: Flowing Right to Left */}
                  <div className="w-full flex flex-wrap justify-center items-center gap-4 sm:gap-6 flex-row-reverse">
                    {bottomHalf.map((node, revIdx) => {
                      const actualIdx = topHalf.length + revIdx;
                      return (
                        <React.Fragment key={node.id}>
                          {renderNodeCard(node, actualIdx, {
                            layout: 'circular_loop',
                            widthClass: 'w-[230px]',
                            customBadge: `LOOP 0${actualIdx + 1}`,
                            accentColor: PALETTE_COLORS[actualIdx % PALETTE_COLORS.length],
                          })}
                          {revIdx < bottomHalf.length - 1 && (
                            <div className="flex items-center text-[var(--accent)] shrink-0 rotate-180">
                              <div className="h-[2px] w-6 bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_30%,transparent)] to-[var(--accent)]" />
                              <ArrowRight size={14} className="-ml-1 text-[var(--accent)]" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          };

          // 9. EXECUTIVE BENTO STAT GRID LAYOUT
          const renderBentoGridLayout = () => {
            const nodes = diagram.nodes;
            const heroNode = nodes[0];
            const secondaryNodes = nodes.slice(1);

            return (
              <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
                {/* Header */}
                <div className="w-full mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={15} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Executive Bento Architecture & High-Impact Summary Grid
                    </span>
                  </div>
                  <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                    {nodes.length} Bento Modules
                  </span>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                  {/* Hero Card */}
                  {heroNode && (
                    <div className="md:col-span-2 flex flex-col relative h-full">
                      <div className="absolute -top-3 left-4 z-10 px-3 py-0.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-amber-500 text-white text-[0.62rem] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5">
                        <Sparkles size={11} /> Primary Strategic Core
                      </div>
                      {renderNodeCard(heroNode, 0, {
                        layout: 'bento_grid',
                        widthClass: 'w-full h-full min-h-[190px]',
                        customBadge: 'CORE • 01',
                        isHero: true,
                        isApex: true,
                      })}
                    </div>
                  )}

                  {/* Secondary Bento Tiles */}
                  {secondaryNodes.map((node, idx) => (
                    <div key={node.id} className="flex flex-col relative h-full">
                      {renderNodeCard(node, idx + 1, {
                        layout: 'bento_grid',
                        widthClass: 'w-full h-full min-h-[150px]',
                        customBadge: `MOD • 0${idx + 2}`,
                        accentColor: PALETTE_COLORS[(idx + 1) % PALETTE_COLORS.length],
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          // 10. STAGED CONVERSION FUNNEL LAYOUT (High Impact Presentation)
          const renderFunnelLayout = () => {
            const count = diagram.nodes.length;
            const conversionPctDefaults = ['100%', '68%', '42%', '24%', '12%'];

            return (
              <div className="w-full max-w-4xl my-0 py-4 flex flex-col items-center">
                {/* Header */}
                <div className="w-full mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Filter size={15} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Staged Qualification & Conversion Funnel
                    </span>
                    <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                      {count} Pipeline Stages
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[0.65rem] text-[var(--text-muted)] font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Throughput Progression</span>
                  </div>
                </div>

                {/* Funnel Stages Column */}
                <div className="w-full flex flex-col items-center gap-3">
                  {diagram.nodes.map((node, i) => {
                    const widthPercent = Math.max(50, 100 - i * (50 / Math.max(1, count - 1)));
                    const badgeText = node.badge || conversionPctDefaults[i % conversionPctDefaults.length];
                    const color = PALETTE_COLORS[i % PALETTE_COLORS.length];

                    return (
                      <React.Fragment key={node.id}>
                        <div
                          className="flex justify-center transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {renderNodeCard(node, i, {
                            layout: 'standard',
                            widthClass: 'w-full',
                            accentColor: color,
                            customBadge: badgeText,
                          })}
                        </div>

                        {i < count - 1 && (
                          <div className="flex flex-col items-center my-0.5 text-[var(--accent)] opacity-80">
                            <div className="h-3 w-[2px] bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/30" />
                            <ArrowRight size={13} className="rotate-90 -mt-1 text-[var(--accent)]" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          };

          // 11. 2x2 STRATEGIC PRIORITIZATION MATRIX (High Impact Presentation)
          const renderQuadrantLayout = () => {
            const nodes = diagram.nodes;
            const q1Nodes = nodes.filter((n, idx) => n.group?.toLowerCase().includes('quick') || idx === 0);
            const q2Nodes = nodes.filter((n, idx) => n.group?.toLowerCase().includes('strategic') || idx === 1);
            const q3Nodes = nodes.filter((n, idx) => n.group?.toLowerCase().includes('fill') || idx === 2);
            const q4Nodes = nodes.filter((n, idx) => n.group?.toLowerCase().includes('low') || (idx > 2 && idx < 6));

            return (
              <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
                {/* Header */}
                <div className="w-full mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Grid2x2 size={15} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      2x2 Strategic Prioritization Matrix
                    </span>
                  </div>
                  <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                    Impact vs Effort Analysis
                  </span>
                </div>

                {/* 2x2 Matrix with Axis Indicators */}
                <div className="w-full relative p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 pb-2">
                    {/* Q1: Quick Wins (High Impact / Low Effort) */}
                    <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5 flex flex-col gap-3 min-h-[190px]">
                      <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-500/20 pb-2">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Quick Wins
                        </span>
                        <span className="text-[0.6rem] font-mono text-emerald-900 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-transparent">
                          HIGH IMPACT • LOW EFFORT
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {q1Nodes.map((n, i) => renderNodeCard(n, i, { layout: 'standard', widthClass: 'w-full', accentColor: '#10b981' }))}
                      </div>
                    </div>

                    {/* Q2: Strategic Bets (High Impact / High Effort) */}
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5 flex flex-col gap-3 min-h-[190px]">
                      <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-500/20 pb-2">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={13} /> Strategic Bets
                        </span>
                        <span className="text-[0.6rem] font-mono text-amber-900 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-transparent">
                          HIGH IMPACT • HIGH EFFORT
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {q2Nodes.map((n, i) => renderNodeCard(n, i, { layout: 'standard', widthClass: 'w-full', accentColor: '#C87514' }))}
                      </div>
                    </div>

                    {/* Q3: Fill-ins (Low Impact / Low Effort) */}
                    <div className="p-4 rounded-xl border border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-500/5 flex flex-col gap-3 min-h-[190px]">
                      <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-500/20 pb-2">
                        <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={13} /> Fill-Ins
                        </span>
                        <span className="text-[0.6rem] font-mono text-indigo-900 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-300 dark:border-transparent">
                          LOW IMPACT • LOW EFFORT
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {q3Nodes.map((n, i) => renderNodeCard(n, i, { layout: 'standard', widthClass: 'w-full', accentColor: '#6366f1' }))}
                      </div>
                    </div>

                    {/* Q4: Low Priority / Re-evaluate */}
                    <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5 flex flex-col gap-3 min-h-[190px]">
                      <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-500/20 pb-2">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle size={13} /> Re-Evaluate
                        </span>
                        <span className="text-[0.6rem] font-mono text-rose-900 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-transparent">
                          LOW IMPACT • HIGH EFFORT
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {q4Nodes.map((n, i) => renderNodeCard(n, i, { layout: 'standard', widthClass: 'w-full', accentColor: '#f43f5e' }))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          // 12. ARCHITECTURE & CONCEPT RELATIONSHIP MAP (High Impact Presentation)
          const renderConceptMapLayout = () => {
            const count = diagram.nodes.length;
            const clientNodes = diagram.nodes.filter((n, idx) => n.group?.toLowerCase().includes('client') || n.group?.toLowerCase().includes('actor') || idx === 0);
            const coreNodes = diagram.nodes.filter((n) => (n.group?.toLowerCase().includes('core') || n.group?.toLowerCase().includes('gateway') || n.group?.toLowerCase().includes('service')) && !clientNodes.includes(n));
            const storeNodes = diagram.nodes.filter((n) => !clientNodes.includes(n) && !coreNodes.includes(n));

            return (
              <div className="w-full max-w-5xl my-0 py-4 flex flex-col items-center">
                {/* Header */}
                <div className="w-full mb-6 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Share2 size={15} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      System Architecture & Concept Relationship Map
                    </span>
                  </div>
                  <span className="text-[0.68rem] text-[var(--text-muted)] font-mono">
                    {count} System Components & Data Flows
                  </span>
                </div>

                <div className="w-full flex flex-col items-center gap-5">
                  {/* Tier 1: Clients & Actors */}
                  <div className="w-full flex flex-wrap justify-center gap-4">
                    {clientNodes.map((node, i) => renderNodeCard(node, i, {
                      layout: 'standard',
                      widthClass: 'w-[240px]',
                      accentColor: '#3b82f6',
                      customBadge: 'CLIENT / INGRESS',
                    }))}
                  </div>

                  {/* Connectors Down */}
                  <div className="flex flex-col items-center text-[var(--accent)]">
                    <div className="h-5 w-[2px] bg-gradient-to-b from-blue-500 to-[var(--accent)]" />
                    <ArrowRight size={13} className="rotate-90 -mt-1 text-[var(--accent)]" />
                  </div>

                  {/* Tier 2: Core Services & Gateway */}
                  <div className="w-full flex flex-wrap justify-center gap-5 relative">
                    <div className="absolute inset-0 bg-[var(--accent)]/10 blur-xl rounded-full pointer-events-none" />
                    {(coreNodes.length > 0 ? coreNodes : diagram.nodes.slice(1, 3)).map((node, i) => renderNodeCard(node, i + clientNodes.length, {
                      layout: 'standard',
                      widthClass: 'w-[260px]',
                      isApex: true,
                      accentColor: '#C87514',
                      customBadge: 'CORE SERVICE',
                    }))}
                  </div>

                  {/* Connectors Down */}
                  <div className="flex flex-col items-center text-[var(--accent)]">
                    <div className="h-5 w-[2px] bg-gradient-to-b from-[var(--accent)] to-emerald-500" />
                    <ArrowRight size={13} className="rotate-90 -mt-1 text-emerald-400" />
                  </div>

                  {/* Tier 3: Data Persistence & External APIs */}
                  <div className="w-full flex flex-wrap justify-center gap-4">
                    {(storeNodes.length > 0 ? storeNodes : diagram.nodes.slice(3)).map((node, i) => renderNodeCard(node, i + clientNodes.length + coreNodes.length, {
                      layout: 'standard',
                      widthClass: 'w-[240px]',
                      accentColor: '#10b981',
                      customBadge: 'STORAGE / EXT',
                    }))}
                  </div>
                </div>
              </div>
            );
          };

          // Empty Canvas Starter Hero Card
          const renderEmptyCanvasStarter = () => (
            <div className="w-full max-w-3xl my-auto py-10 px-4 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shadow-xl ring-1 ring-[var(--border-subtle)]">
                  <Sparkles size={28} className="animate-pulse text-amber-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-bold shadow-md">
                  Starter
                </div>
              </div>

              <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Canvas Ready — Start Visualizing
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-lg leading-relaxed">
                Transform thoughts into high-impact visual architectures. Load a curated production preset, describe your workflow to bbot Studio AI, or create custom stages.
              </p>

              {/* Quick Starter Preset Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mt-6 text-left">
                {/* 1. Linear SOP Pipeline */}
                <button
                  type="button"
                  onClick={() => {
                    const preset = STUDIO_STARTER_PRESETS[0];
                    if (preset) handleApplyPreset(preset);
                  }}
                  className="flex flex-col items-start p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/12 hover:border-cyan-500/60 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">🚀</span>
                    <span className="text-[10px] font-bold text-cyan-400 font-mono bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                      4 Stages
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                    Linear SOP Pipeline
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                    Intake & Scope → Architecture → QA → Production Rollout
                  </span>
                </button>

                {/* 2. Decision Tree Flow */}
                <button
                  type="button"
                  onClick={() => {
                    const preset = STUDIO_STARTER_PRESETS[1];
                    if (preset) handleApplyPreset(preset);
                  }}
                  className="flex flex-col items-start p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/12 hover:border-purple-500/60 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">💎</span>
                    <span className="text-[10px] font-bold text-purple-400 font-mono bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">
                      Decision Gate
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-purple-400 transition-colors">
                    Decision Gateway Flow
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                    Condition checks with approved execution & escalation review
                  </span>
                </button>

                {/* 3. 3-Tier Architecture */}
                <button
                  type="button"
                  onClick={() => {
                    const preset = STUDIO_STARTER_PRESETS[2];
                    if (preset) handleApplyPreset(preset);
                  }}
                  className="flex flex-col items-start p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/12 hover:border-amber-500/60 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">☁️</span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      System Tier
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
                    3-Tier Cloud Architecture
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                    Client Ingress → API Core & Business Logic → DB Storage
                  </span>
                </button>
              </div>

              {/* Secondary Action Options */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
                <button
                  type="button"
                  onClick={() => setIsCopilotOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:brightness-110 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-200" />
                  <span>Ask bbot Studio AI</span>
                  <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-white/90">
                    Ctrl+K
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={handleAddNode}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={14} className="text-emerald-400" />
                  <span>Add First Stage</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] hover:border-cyan-400/50 px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <Layers size={14} className="text-cyan-400" />
                  <span>Template Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title="View hotkeys and keyboard shortcuts"
                >
                  <HelpCircle size={14} />
                  <span>Hotkeys</span>
                  <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    ?
                  </kbd>
                </button>
              </div>
            </div>
          );

          if (viewMode === 'canvas') {
            return (
              <div className="w-full h-full min-h-[640px] flex-1 flex flex-col relative">
                <InteractiveCanvas
                  ref={interactiveCanvasRef}
                  diagram={diagram}
                  theme={aestheticTheme}
                  onUpdateDiagram={updateDiagramWithHistory}
                  onLiveUpdateDiagram={liveUpdateDiagram}
                  canUndo={effectiveCanUndo}
                  canRedo={effectiveCanRedo}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                />
              </div>
            );
          }

          return (
            <div
              ref={contentRef}
              id="bbot-studio-canvas-content"
              className="w-full min-h-full flex justify-center items-start transition-transform will-change-transform pt-4 pb-20"
              style={{ transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`, transformOrigin: 'top center' }}
            >
              {!isChart && diagram.nodes.length === 0 ? (
                renderEmptyCanvasStarter()
              ) : (
                <>
                  {diagram.diagramType === 'timeline' && renderTimelineLayout()}
                  {diagram.diagramType === 'funnel' && renderFunnelLayout()}
                  {diagram.diagramType === 'quadrant' && renderQuadrantLayout()}
                  {diagram.diagramType === 'concept_map' && renderConceptMapLayout()}
                  {diagram.diagramType === 'hierarchy' && renderHierarchyLayout()}
                  {diagram.diagramType === 'mindmap' && renderMindMapLayout()}
                  {diagram.diagramType === 'comparison' && renderComparisonLayout()}
                  {diagram.diagramType === 'sequence' && renderSequenceLayout()}
                  {diagram.diagramType === 'decision_flow' && renderDecisionFlowLayout()}
                  {diagram.diagramType === 'circular_loop' && renderCircularLoopLayout()}
                  {diagram.diagramType === 'bento_grid' && renderBentoGridLayout()}
                  {![
                    'timeline',
                    'funnel',
                    'quadrant',
                    'concept_map',
                    'hierarchy',
                    'mindmap',
                    'comparison',
                    'sequence',
                    'decision_flow',
                    'circular_loop',
                    'bento_grid',
                  ].includes(diagram.diagramType) && renderStandardFlowLayout()}
                </>
              )}
            </div>
          );
        })()}

        {/* Floating Presentation Mode Walkthrough Dock */}
        {isPresenting && diagram.nodes.length > 0 && (
          <div className="sticky bottom-4 z-40 mx-auto flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
            <button
              type="button"
              onClick={() => setPresentingIndex((prev) => Math.max(prev - 1, 0))}
              disabled={presentingIndex === 0}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Stage (← Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex flex-col items-center min-w-[240px] max-w-[480px] px-2 text-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--accent)] font-mono">
                  Stage {presentingIndex + 1} of {diagram.nodes.length}
                </span>
                {diagram.nodes[presentingIndex]?.badge && (
                  <span className="text-[0.6rem] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                    {diagram.nodes[presentingIndex]?.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] text-center break-words leading-tight">
                {diagram.nodes[presentingIndex]?.label}
              </span>
              {diagram.nodes[presentingIndex]?.sublabel && (
                <span className="text-[0.68rem] text-[var(--text-secondary)] text-center break-words line-clamp-2 mt-0.5 max-w-[450px]">
                  {diagram.nodes[presentingIndex]?.sublabel}
                </span>
              )}
              {/* Dot Indicators */}
              <div className="flex items-center gap-1 mt-1.5">
                {diagram.nodes.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setPresentingIndex(dotIdx)}
                    className={`h-1.5 rounded-full transition-all ${dotIdx === presentingIndex
                        ? 'w-5 bg-[var(--accent)] shadow-xs'
                        : 'w-1.5 bg-[var(--text-muted)]/40 hover:bg-[var(--text-muted)]'
                      }`}
                    title={`Jump to stage ${dotIdx + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPresentingIndex((prev) => Math.min(prev + 1, diagram.nodes.length - 1))}
              disabled={presentingIndex === diagram.nodes.length - 1}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Stage (→ Right Arrow or Space)"
            >
              <ChevronRight size={16} />
            </button>

            <div className="h-5 w-[1px] bg-[var(--border-subtle)] mx-1" />

            <button
              type="button"
              onClick={() => setIsPresenting(false)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              title="Exit Presentation (Esc)"
            >
              <X size={13} />
              <span>Exit</span>
            </button>
          </div>
        )}

        {/* Interactive Radar Minimap */}
        {!isChart && viewMode !== 'canvas' && diagram.nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 z-30 select-none pointer-events-auto">
            {isMinimapOpen ? (
              <div className="w-52 h-28 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md shadow-2xl p-2 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                    <Compass size={11} className="text-[var(--accent)]" /> Radar Minimap
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.6rem] font-mono text-[var(--accent)] font-semibold">
                      {diagram.nodes.length} nodes
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMinimapOpen(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded hover:bg-[var(--bg-surface-hover)]"
                      title="Collapse Minimap"
                    >
                      <Minimize2 size={10} />
                    </button>
                  </div>
                </div>

                {/* Radar thumbnail viewport */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = (e.clientX - rect.left) / rect.width;
                    const clickY = (e.clientY - rect.top) / rect.height;
                    const targetX = Math.round((0.5 - clickX) * 450);
                    const targetY = Math.round((0.5 - clickY) * 350);
                    setPanOffset({ x: targetX, y: targetY });
                  }}
                  onDoubleClick={() => setPanOffset({ x: 0, y: 0 })}
                  className="relative flex-1 my-1 rounded-md bg-neutral-950/20 dark:bg-black/40 border border-[var(--border-subtle)] overflow-hidden cursor-crosshair flex items-center justify-around px-1"
                  title="Click to pan view | Double-click to center"
                >
                  {/* Miniature Node Silhouettes */}
                  {diagram.nodes.map((n, idx) => {
                    const isSpotlight = isPresenting && idx === presentingIndex;
                    return (
                      <div
                        key={n.id}
                        className="flex flex-col items-center gap-0.5 transition-all"
                        style={{ width: `${Math.max(6, Math.min(22, 160 / diagram.nodes.length))}px` }}
                      >
                        <div
                          className={`w-full h-4 rounded-xs transition-all ${isSpotlight
                              ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] ring-1 ring-white'
                              : n.type === 'start'
                                ? 'bg-blue-400/80'
                                : n.type === 'end'
                                  ? 'bg-emerald-400/80'
                                  : n.type === 'decision'
                                    ? 'bg-amber-400/80'
                                    : 'bg-indigo-400/70'
                            }`}
                        />
                      </div>
                    );
                  })}

                  {/* Active Viewport Rectangle Indicator */}
                  <div
                    className="absolute rounded border border-[var(--accent)] bg-[var(--accent)]/15 pointer-events-none transition-all duration-75"
                    style={{
                      width: `${Math.max(20, Math.min(90, 70 / zoom))}%`,
                      height: `${Math.max(30, Math.min(90, 80 / zoom))}%`,
                      left: `${Math.max(2, Math.min(75, 45 - panOffset.x / 15))}%`,
                      top: `${Math.max(5, Math.min(65, 30 - panOffset.y / 15))}%`,
                      boxShadow: '0 0 10px rgba(200, 117, 20, 0.3)',
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsMinimapOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] shadow-lg text-[0.68rem] font-semibold transition-all"
                title="Open Radar Minimap"
              >
                <Compass size={12} className="text-[var(--accent)]" />
                <span>Minimap</span>
              </button>
            )}
          </div>
        )}

        {/* In-Canvas Flexible Floating Zoom Controls (Bottom Right - ONLY rendered in template view mode to avoid duplicate with InteractiveCanvas) */}
        {viewMode !== 'canvas' && (
          <div
            data-interactive="true"
            className="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] shadow-xl pointer-events-auto select-none"
          >
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="font-mono text-[0.68rem] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-w-[2.8rem] text-center px-1 py-0.5 rounded hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Click to reset zoom to 100% (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={handleFitToScreen}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Fit to Screen"
              aria-label="Fit to Screen"
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Reset Pan & Zoom"
              aria-label="Reset Pan & Zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}

        {/* Floating Quick bbot Studio AI Pill (Take it or Cross it) */}
        {!isFloatingCopilotDismissed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-[var(--bg-surface)]/95 backdrop-blur-md border border-amber-500/40 text-[var(--text-primary)] hover:border-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all">
              <button
                type="button"
                onClick={() => setIsCopilotOpen(true)}
                className="group flex items-center gap-2 cursor-pointer hover:opacity-90"
                title="Open bbot Studio Assistant (Ctrl+K)"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-xs">
                  <Sparkles size={11} className="animate-spin-slow" />
                </div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                  bbot Studio AI
                </span>
                <span className="font-mono text-[0.6rem] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-bold">
                  Ctrl+K
                </span>
              </button>
              <div className="h-3.5 w-px bg-amber-500/30 mx-0.5" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFloatingCopilotDismissed(true);
                  try { localStorage.setItem('bbot_floating_ai_dismissed', 'true'); } catch {}
                }}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Dismiss floating pill (always available via Ctrl+K or top toolbar)"
                aria-label="Dismiss floating AI pill"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Copilot Notice / Feedback Pill */}
        {copilotNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top duration-200 max-w-lg">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{copilotNotice.explanation}</p>
              {copilotNotice.applied.length > 0 && (
                <p className="text-[0.65rem] text-emerald-300/80 truncate">
                  {copilotNotice.applied.join(' • ')}
                </p>
              )}
            </div>
            <span className="text-[0.6rem] font-mono text-emerald-400/80 shrink-0 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/50">
              Ctrl+Z to Undo
            </span>
            <button
              type="button"
              onClick={() => setCopilotNotice(null)}
              className="text-emerald-400 hover:text-white p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Canvas AI Copilot Command Palette Modal */}
      {isCopilotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCopilotOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <span>bbot <span className="text-[var(--accent)] font-bold">Studio Assistant</span></span>
                    <span className="text-[0.6rem] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      AI Visual Engine
                    </span>
                  </h3>
                  <p className="text-[0.68rem] text-[var(--text-muted)]">
                    Transform, expand, restyle, or audit this diagram with conversational instructions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-block font-mono text-[0.62rem] px-1.5 py-0.5 rounded bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                  Esc
                </kbd>
                <button
                  type="button"
                  onClick={() => setIsCopilotOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Input Form */}
            <div className="p-5 flex flex-col gap-3.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunCopilot();
                }}
                className="relative flex items-center"
              >
                <input
                  ref={copilotInputRef}
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  disabled={isCopilotLoading}
                  placeholder="e.g. 'Add SLA badges', 'Add security gate', 'Switch to Cyberpunk'..."
                  className="w-full pl-4 pr-24 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all shadow-inner disabled:opacity-50"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  {copilotInput && (
                    <button
                      type="button"
                      onClick={() => setCopilotInput('')}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!copilotInput.trim() || isCopilotLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-bold text-xs shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    {isCopilotLoading ? (
                      <>
                        <RotateCw size={12} className="animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <Send size={11} />
                        <span>Run</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Action Presets */}
              <div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
                  <Zap size={10} className="text-[var(--accent)]" />
                  <span>Instant Transformations (&lt;15ms)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COPILOT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isCopilotLoading}
                      onClick={() => handleRunCopilot(preset.prompt)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-[0.7rem] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer info / tip */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[0.65rem] text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span>All modifications support instant <strong>Ctrl+Z</strong> Undo</span>
                </div>
                <span className="font-mono">Press Enter ↵</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {isShortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  <Keyboard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Keyboard Shortcuts & Hotkeys
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Supercharge your workflow with instant keyboard productivity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Groups */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Group 1: Navigation & Viewport */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Canvas View & Navigation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Zoom In / Zoom Out</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">+</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">-</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Reset Zoom (100%)</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">0</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Fit Visual to Screen</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Shift+1</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+0</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Toggle Dot Grid</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">G</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Fullscreen Canvas</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">F</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Toggle Controls Sidebar</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+B</kbd>
                  </div>
                </div>
              </div>

              {/* Group 2: Editing & History */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Editing & History
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Undo last action</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+Z</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Redo action</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+Y</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+Shift+Z</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Edit Stage Content</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-medium">Click / Double-click</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Close / Cancel / Exit</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Group 3: Studio AI & Walkthrough */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Studio AI & Presentation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">bbot Studio AI Copilot</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-[10px] text-amber-500 font-bold">Ctrl+K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Quick Stage Search</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">Ctrl+F</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Presentation Mode</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 font-mono text-[10px] text-violet-400 font-bold">P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Next / Previous Stage</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">→</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-primary)]">←</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] font-mono">?</kbd> anytime to toggle cheatsheet</span>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal Dialog */}
      {isSaveTemplateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSaveTemplateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl animate-in zoom-in-95 flex flex-col gap-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <BookmarkPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Save as Reusable Template
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Save this canvas layout so you and your team can create diagrams from it anytime.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Canvas Stats Preview */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--text-primary)]">Canvas Contents:</span>
                <span className="text-[var(--text-muted)]">{diagram.nodes.length} Stages • {diagram.edges.length} Connections</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent)] font-bold">
                {diagram.diagramType.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Template Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Template Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="e.g., Microservices Ingress Architecture"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-medium"
                autoFocus
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Description & Purpose (Optional)
              </label>
              <textarea
                value={saveTemplateDesc}
                onChange={(e) => setSaveTemplateDesc(e.target.value)}
                rows={2}
                placeholder="Describe when to use this template, SLAs, or operational procedures..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none"
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Category
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'process_flow', label: 'Process Flow' },
                  { id: 'decision_flow', label: 'Decision Logic' },
                  { id: 'architecture', label: 'Architecture' },
                  { id: 'timeline', label: 'Timeline / Roadmap' },
                  { id: 'hierarchy', label: 'Hierarchy / Org' },
                  { id: 'funnel', label: 'Funnel / Pipeline' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSaveTemplateCategory(c.id)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer text-center ${
                      saveTemplateCategory === c.id
                        ? 'border-amber-500 bg-amber-500/15 text-amber-500 dark:text-amber-300 font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-amber-500/30'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Share with Team Checkbox Card */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={saveTemplateIsPublic}
                onChange={(e) => setSaveTemplateIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-cyan-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Share with Workspace & Team
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Allow other team members in your workspace to load, reuse, and customize this template for their own diagrams.
                </p>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewStudioTemplate}
                disabled={isSavingTemplate || !saveTemplateName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer"
              >
                {isSavingTemplate ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Dataset onto Template Modal Dialog */}
      {mapDatasetTemplate && (
        <MapDatasetModal
          isOpen={!!mapDatasetTemplate}
          onClose={() => setMapDatasetTemplate(null)}
          template={mapDatasetTemplate.diagram}
          templateName={mapDatasetTemplate.name}
          currentDiagram={diagram}
          onApply={(mappedDiagram) => {
            updateDiagramWithHistory(mappedDiagram);
            setMapDatasetTemplate(null);
          }}
        />
      )}

      

      {/* Footer Info Bar */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-2 text-[0.72rem] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-[var(--accent)]" />
          <span>{diagram.summary || 'Visual specification synchronized with bbot engine.'}</span>
        </div>
        <div className="flex items-center gap-3">
          {diagram.scopePhases && diagram.scopePhases.length > 0 && (
            <span className="text-[0.65rem] text-[var(--accent)] font-medium hidden sm:inline">
              Full Scope: {diagram.scopePhases.length} Phases Covered
            </span>
          )}
          <span className="font-mono text-[0.65rem]">Format: {diagram.diagramType.replace('_', ' ').toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
});
