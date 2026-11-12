import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { toPng, toSvg } from 'html-to-image';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Plus,
  Trash2,
  Copy,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Sliders,
  Database,
  Shield,
  Zap,
  Target,
  Search,
  Users,
  Cloud,
  Terminal,
  Lock,
  Activity,
  Clock,
  Box,
  GitBranch,
  Link2,
  Grid2x2,
  RotateCw,
  LayoutGrid,
  Filter,
  Columns,
  ListOrdered,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ChevronDown,
  GripVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Scaling,
  Edit3,
  Italic,
  MousePointer,
  Hand,
  BoxSelect,
  MoveHorizontal,
  MoveVertical,
  Check,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { MapDatasetModal } from './MapDatasetModal';
import type {
  DiagramSpec,
  NodeSpec,
  EdgeSpec,
  NodeShape,
  EdgeRouting,
  EdgeStrokeStyle,
  ArrowMarkerType,
} from './types';

// Curated High-End Aesthetic Color Presets
export interface PresetPalette {
  id: string;
  name: string;
  border: string;
  bg: string;
  text: string;
  glow: string;
  badgeBg: string;
}

export const COLOR_PALETTES: PresetPalette[] = [
  {
    id: 'cyan',
    name: 'Neon Cyan',
    border: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    text: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.45)',
    badgeBg: 'rgba(6, 182, 212, 0.25)',
  },
  {
    id: 'violet',
    name: 'Cyber Violet',
    border: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    text: '#c084fc',
    glow: 'rgba(139, 92, 246, 0.45)',
    badgeBg: 'rgba(139, 92, 246, 0.25)',
  },
  {
    id: 'amber',
    name: 'Solar Amber',
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
  },
  {
    id: 'emerald',
    name: 'Emerald Aurora',
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#34d399',
    glow: 'rgba(16, 185, 129, 0.45)',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    border: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    text: '#fb7185',
    glow: 'rgba(244, 63, 94, 0.45)',
    badgeBg: 'rgba(244, 63, 94, 0.25)',
  },
  {
    id: 'blue',
    name: 'Electric Blue',
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.45)',
    badgeBg: 'rgba(59, 130, 246, 0.25)',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Sleek',
    border: '#52525b',
    bg: 'rgba(39, 39, 42, 0.65)',
    text: '#e4e4e7',
    glow: 'rgba(113, 113, 122, 0.3)',
    badgeBg: 'rgba(63, 63, 70, 0.5)',
  },
  {
    id: 'paper',
    name: 'Clean Whiteboard',
    border: '#0ea5e9',
    bg: '#ffffff',
    text: '#0f172a',
    glow: 'rgba(14, 165, 233, 0.2)',
    badgeBg: '#e0f2fe',
  },
];

export const toHexColor = (colorStr?: string, fallback: string = '#06b6d4'): string => {
  if (!colorStr) return fallback;
  if (colorStr.startsWith('#')) return colorStr.slice(0, 7);
  if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = Number(parts[0]).toString(16).padStart(2, '0');
      const g = Number(parts[1]).toString(16).padStart(2, '0');
      const b = Number(parts[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  return fallback;
};

export const computeRgbaBg = (colorStr?: string, opacityPercent: number = 100): string => {
  if (!colorStr) return 'transparent';
  if (colorStr.startsWith('rgba')) {
    const match = colorStr.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/i);
    if (match) {
      const origAlpha = parseFloat(match[4]);
      const newAlpha = opacityPercent === 100 ? origAlpha : Math.min(1, Math.max(0, (opacityPercent / 100) * origAlpha));
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${Number(newAlpha.toFixed(2))})`;
    }
  }
  if (opacityPercent >= 100 && !colorStr.startsWith('rgb')) return colorStr;
  const hex = toHexColor(colorStr);
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${(opacityPercent / 100).toFixed(2)})`;
};

export const QUICK_SWATCHES = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#ffffff', '#64748b', '#0f172a'
];

// Available Icons for nodes
export const SEMANTIC_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Layers: Layers,
  Box: Box,
  Database: Database,
  Shield: Shield,
  Zap: Zap,
  Target: Target,
  Search: Search,
  Users: Users,
  Cloud: Cloud,
  Terminal: Terminal,
  Lock: Lock,
  Activity: Activity,
  Clock: Clock,
  GitBranch: GitBranch,
  Sparkles: Sparkles,
  RotateCw: RotateCw,
  LayoutGrid: LayoutGrid,
  Filter: Filter,
  Columns: Columns,
  ListOrdered: ListOrdered,
};

export const SHAPES_CONFIG: { id: NodeShape; label: string; iconLabel: string; emoji: string }[] = [
  { id: 'card', label: 'Modern Card', iconLabel: 'Rounded Card', emoji: '🪪' },
  { id: 'rectangle', label: 'Rectangle', iconLabel: 'Clean Rectangle', emoji: '▭' },
  { id: 'diamond', label: 'Diamond Gate', iconLabel: 'Decision Rhombus', emoji: '💎' },
  { id: 'heart', label: 'Heart Shape', iconLabel: 'Heart Container', emoji: '❤️' },
  { id: 'cuboid', label: '3D Cuboid', iconLabel: '3D Isometric Cube', emoji: '🧊' },
  { id: 'pill', label: 'Capsule Pill', iconLabel: 'Full Pill', emoji: '💊' },
  { id: 'hexagon', label: 'Hexagon Core', iconLabel: 'Core Hub', emoji: '⬡' },
  { id: 'cylinder', label: 'Database Barrel', iconLabel: 'Storage Cylinder', emoji: '🛢️' },
  { id: 'glass', label: 'Frosted Glass', iconLabel: 'Glassmorphism', emoji: '🪟' },
  { id: 'sticky', label: 'Sticky Note', iconLabel: 'Pin Note', emoji: '📌' },
  { id: 'terminal', label: 'Code Terminal', iconLabel: 'Console Window', emoji: '💻' },
  { id: 'minimal', label: 'Minimal Outline', iconLabel: 'Hairline Card', emoji: '▫️' },
];

export const ROUTING_CONFIG: { id: EdgeRouting; label: string; desc: string }[] = [
  { id: 'curved', label: 'Smooth Curve', desc: 'Fluid Miro/Figma style Bezier' },
  { id: 'orthogonal', label: 'Stepped / Orthogonal', desc: 'Clean right-angle architecture elbows' },
  { id: 'straight', label: 'Straight Line', desc: 'Direct point-to-point link' },
  { id: 'arc', label: 'Gentle Arc', desc: 'Arched trajectory' },
];

export const STROKE_STYLE_CONFIG: { id: EdgeStrokeStyle; label: string }[] = [
  { id: 'solid', label: 'Solid Line' },
  { id: 'dashed', label: 'Dashed Line' },
  { id: 'dotted', label: 'Dotted Line' },
  { id: 'animated', label: 'Animated Flow' },
];

const ARROW_MARKER_CONFIG: { id: ArrowMarkerType; label: string; badge?: string }[] = [
  { id: 'arrow', label: 'Classic Arrow' },
  { id: 'both', label: 'Bi-Directional ⟷', badge: 'Dual' },
  { id: 'triangle', label: 'Filled Triangle' },
  { id: 'circle', label: 'Circle Terminal' },
  { id: 'diamond', label: 'Diamond Terminal' },
  { id: 'none', label: 'No Arrowhead' },
];

export interface CanvasStarterTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
}

export const CANVAS_BASIC_TEMPLATES: CanvasStarterTemplate[] = [
  {
    id: 'pipeline',
    name: 'Linear Pipeline (4 Stages)',
    description: 'Intake → Build → Verify → Deploy',
    emoji: '🚀',
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
  {
    id: 'decision',
    name: 'Decision Gateway Flow',
    description: 'Condition gate with Yes / No branches',
    emoji: '💎',
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
  {
    id: 'architecture',
    name: '3-Tier System Architecture',
    description: 'Frontend → API Gateway 💻 → Service 🧊 → Store 🛢️',
    emoji: '🏗️',
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
  {
    id: 'grid4',
    name: 'Clean 4-Card Grid',
    description: '4 balanced, uncluttered cards in 2x2 matrix',
    emoji: '▫️',
    nodes: [
      {
        id: 'node_1',
        label: 'Pillar 1: Core Strategy',
        sublabel: 'Vision, value proposition & roadmap',
        type: 'process',
        order: 1,
        badge: 'P1',
        icon: 'Target',
        x: 180,
        y: 160,
        width: 250,
        height: 115,
        customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee', borderWidth: 2 },
      },
      {
        id: 'node_2',
        label: 'Pillar 2: Technical Execution',
        sublabel: 'Scalable services, CI/CD & infrastructure',
        type: 'process',
        order: 2,
        badge: 'P2',
        icon: 'Zap',
        x: 500,
        y: 160,
        width: 250,
        height: 115,
        customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc', borderWidth: 2 },
      },
      {
        id: 'node_3',
        label: 'Pillar 3: Quality & Security',
        sublabel: 'Zero-trust policies & automated audits',
        type: 'process',
        order: 3,
        badge: 'P3',
        icon: 'Shield',
        x: 180,
        y: 330,
        width: 250,
        height: 115,
        customStyle: { shape: 'card', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24', borderWidth: 2 },
      },
      {
        id: 'node_4',
        label: 'Pillar 4: Analytics & Scale',
        sublabel: 'Telemetry monitoring & KPI delivery',
        type: 'process',
        order: 4,
        badge: 'P4',
        icon: 'Activity',
        x: 500,
        y: 330,
        width: 250,
        height: 115,
        customStyle: { shape: 'card', borderColor: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', textColor: '#34d399', borderWidth: 2 },
      },
    ],
    edges: [],
  },
];

export interface InteractiveCanvasRef {
  exportPng: () => Promise<Blob | null>;
  exportPngDataUrl: () => Promise<string | null>;
  exportSvg: () => Promise<string | null>;
  getCanvasElement: () => HTMLDivElement | null;
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
  fitToScreen?: () => void;
}

export interface InteractiveCanvasProps {
  diagram: DiagramSpec;
  theme?: string;
  onUpdateDiagram: (updated: DiagramSpec, previousSnapshot?: DiagramSpec) => void;
  onLiveUpdateDiagram?: (updated: DiagramSpec) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  readOnly?: boolean;
}

export const InteractiveCanvas = forwardRef<InteractiveCanvasRef, InteractiveCanvasProps>(
  function InteractiveCanvas(
    {
      diagram,
      theme = 'dark',
      onUpdateDiagram,
      onLiveUpdateDiagram,
      canUndo: _canUndo = false,
      canRedo: _canRedo = false,
      onUndo,
      onRedo,
      readOnly = false,
    }: InteractiveCanvasProps,
    ref
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const dragStartDiagramRef = useRef<DiagramSpec | null>(null);
  const dragMovedRef = useRef<boolean>(false);
  const latestDragNodesRef = useRef<NodeSpec[] | null>(null);
  const resizeStartDiagramRef = useRef<DiagramSpec | null>(null);
  const resizeMovedRef = useRef<boolean>(false);
  const latestResizeNodesRef = useRef<NodeSpec[] | null>(null);

  // Viewport navigation
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({
    clientX: 0,
    clientY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Canvas Settings (Default to free smooth movement)
  const snapToGrid = false;
  const [gridPattern, setGridPattern] = useState<'dots' | 'grid' | 'clean'>(diagram.canvasGridPattern || 'dots');
  const effectiveGridPattern = diagram.canvasGridPattern || gridPattern;
  const [_isTemplatesMenuOpen, setIsTemplatesMenuOpen] = useState<boolean>(false);
  const [isBulkStepsOpen, setIsBulkStepsOpen] = useState<boolean>(false);
  const [bulkStepsText, setBulkStepsText] = useState<string>('');
  const gridSize = 16;

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Canvas Tool Mode: select (V), hand (H), marquee (M)
  const [activeCanvasTool, setActiveCanvasTool] = useState<'select' | 'hand' | 'marquee'>('select');

  // Marquee Area Selection State
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState<boolean>(false);
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const marqueeStartRef = useRef<{ clientX: number; clientY: number; canvasX: number; canvasY: number } | null>(null);

  // Smart Magnetic Alignment Guides
  const [activeGuides, setActiveGuides] = useState<{
    type: 'vertical' | 'horizontal';
    pos: number;
    from: number;
    to: number;
  }[]>([]);

  // Direct In-Place Inline Text Editing
  const [inlineEditing, setInlineEditing] = useState<{
    nodeId: string;
    field: 'label' | 'sublabel';
  } | null>(null);
  const [inlineTextValue, setInlineTextValue] = useState<string>('');

  // Connect Mode & Interactive Thread Drag
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [threadDrag, setThreadDrag] = useState<{
    sourceId: string;
    sourceAnchor: 'right' | 'top' | 'bottom' | 'left';
    startX: number;
    startY: number;
  } | null>(null);
  const [threadHoverTargetId, setThreadHoverTargetId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging Nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const multiDragStartsRef = useRef<Map<string, { startX: number; startY: number }>>(new Map());

  // Interactive Drag-to-Resize Nodes State
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [resizeHandleType, setResizeHandleType] = useState<'se' | 'e' | 's' | null>(null);
  const resizeStartRef = useRef<{
    clientX: number;
    clientY: number;
    startWidth: number;
    startHeight: number;
    nodeId: string;
  }>({
    clientX: 0,
    clientY: 0,
    startWidth: 230,
    startHeight: 110,
    nodeId: '',
  });
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState<boolean>(false);

  // Saved Studio Templates & Dataset Mapping Modal
  const [_userSavedTemplates, setUserSavedTemplates] = useState<{ id: string; name: string; description?: string; diagram: DiagramSpec }[]>(() => {
    try {
      const raw = localStorage.getItem('bbot_user_templates');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [canvasMapDatasetTemplate, setCanvasMapDatasetTemplate] = useState<{ diagram: DiagramSpec; name: string } | null>(null);

  // Sync saved templates from server on mount
  useEffect(() => {
    fetch('/api/visual-studio/templates', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUserSavedTemplates((prev) => {
            const serverItems = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              description: d.description,
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
      .catch(() => {});
  }, []);

  // Floating Draggable & Flexible Toolbar State
  const [isClutterDismissed, setIsClutterDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('bbot_clutter_tip_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('bbot_interactive_toolbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Clamp to safe visible coordinates on mount
          const safeX = Math.max(12, Math.min(parsed.x, window.innerWidth - 300));
          const safeY = Math.max(12, Math.min(parsed.y, window.innerHeight - 100));
          return { x: safeX, y: safeY };
        }
      }
    } catch {
      // fallback
    }
    return { x: 20, y: 14 };
  });

  const [isDraggingToolbar, setIsDraggingToolbar] = useState<boolean>(false);
  const toolbarDragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  const handleToolbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingToolbar(true);
    toolbarDragOffsetRef.current = {
      offsetX: e.clientX - toolbarPos.x,
      offsetY: e.clientY - toolbarPos.y,
    };
  };

  const handleResetToolbarPos = () => {
    const defaultPos = { x: 20, y: 14 };
    setToolbarPos(defaultPos);
    try {
      localStorage.setItem('bbot_interactive_toolbar_pos', JSON.stringify(defaultPos));
    } catch {
      // ignore
    }
  };

  const handleToggleDockBottom = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isCurrentlyNearBottom = toolbarPos.y > rect.height / 2;
      let targetPos;
      if (isCurrentlyNearBottom) {
        // Move to Top Dock (centered top)
        targetPos = {
          x: Math.max(16, Math.round((rect.width - 520) / 2)),
          y: 16,
        };
      } else {
        // Move to Bottom Dock (centered bottom with clean clearance above zoom pills)
        targetPos = {
          x: Math.max(16, Math.round((rect.width - 520) / 2)),
          y: Math.max(40, Math.round(rect.height - 68)),
        };
      }
      setToolbarPos(targetPos);
      try {
        localStorage.setItem('bbot_interactive_toolbar_pos', JSON.stringify(targetPos));
      } catch {}
    } else {
      setToolbarPos({ x: 20, y: 14 });
    }
  };

  useEffect(() => {
    if (!isDraggingToolbar) return;

    const onMouseMove = (e: MouseEvent) => {
      let nextX = e.clientX - toolbarDragOffsetRef.current.offsetX;
      let nextY = e.clientY - toolbarDragOffsetRef.current.offsetY;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const minX = 8;
        const maxX = Math.max(minX, rect.width - 180);
        const minY = 8;
        const maxY = Math.max(minY, rect.height - 48);

        nextX = Math.max(minX, Math.min(nextX, maxX));
        nextY = Math.max(minY, Math.min(nextY, maxY));
      }

      setToolbarPos({ x: nextX, y: nextY });
      try {
        localStorage.setItem('bbot_interactive_toolbar_pos', JSON.stringify({ x: nextX, y: nextY }));
      } catch {}
    };

    const onMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingToolbar, toolbarPos]);

  // Color theme
  const activeTheme = diagram.theme || theme || 'dark';
  const isLight =
    activeTheme === 'light' ||
    activeTheme === 'whiteboard' ||
    (!['cyberpunk', 'emerald', 'bbot-dark', 'dark', 'gradient'].includes(activeTheme) &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('light'));

  const getCanvasBgColor = () => {
    if (diagram.canvasBg) return diagram.canvasBg;
    if (activeTheme === 'cyberpunk' || activeTheme === 'gradient') return '#060814';
    if (activeTheme === 'emerald') return '#07130e';
    if (activeTheme === 'bbot-dark' || activeTheme === 'dark') return '#181a1f';
    if (activeTheme === 'whiteboard' || activeTheme === 'light') return '#FDFCF7';
    return isLight ? '#FDFCF7' : '#060814';
  };

  // Calculate default auto-positions if nodes don't have x, y yet or are accidentally clustered/overlapping
  const nodesWithPositions = useMemo(() => {
    const nodes = diagram.nodes || [];
    const hasAnyMissing = nodes.some((n) => n.x === undefined || n.y === undefined);
    
    // Check if multiple nodes share identical (or nearly identical within 20px) coordinates, causing overlapping boxes
    const hasOverlapCluster = nodes.length > 1 && !hasAnyMissing && (() => {
      const coordKeys = new Set<string>();
      for (const n of nodes) {
        const key = `${Math.round((n.x || 0) / 20)},${Math.round((n.y || 0) / 20)}`;
        if (coordKeys.has(key)) return true;
        coordKeys.add(key);
      }
      return false;
    })();

    if (!hasAnyMissing && !hasOverlapCluster) return nodes;

    const type = diagram.diagramType || 'process_flow';
    const total = nodes.length;

    return nodes.map((n, i) => {
      if (!hasOverlapCluster && n.x !== undefined && n.y !== undefined) return n;

      let x = 120;
      let y = 180;
      const width = n.width || (n.customStyle?.shape === 'pill' ? 200 : 230);
      const height = n.height || (n.customStyle?.shape === 'pill' ? 56 : 110);

      if (['process_flow', 'sequence', 'timeline'].includes(type)) {
        // Clean multi-row wrapped layout: prevents sprawling across 4000px
        if (total <= 5) {
          x = 100 + i * 290;
          y = 200;
        } else {
          const cols = 4;
          const col = i % cols;
          const row = Math.floor(i / cols);
          x = 100 + col * 290;
          y = 160 + row * 180;
        }
      } else if (type === 'decision_flow') {
        // Branching layout with safe margins
        if (i === 0) {
          x = 100; y = 200;
        } else if (i === 1) {
          x = 400; y = 190;
        } else if (i % 2 === 0) {
          x = 720; y = 140 + Math.floor((i - 2) / 2) * 160;
        } else {
          x = 720; y = 300 + Math.floor((i - 3) / 2) * 160;
        }
      } else if (type === 'hierarchy') {
        // Tree layout
        const level = i === 0 ? 0 : i <= 2 ? 1 : 2;
        const levelCount = level === 0 ? 1 : level === 1 ? 2 : total - 3;
        const indexInLevel = level === 0 ? 0 : level === 1 ? i - 1 : i - 3;
        const spacingX = Math.max(300, 900 / Math.max(1, levelCount));
        const startX = 500 - ((levelCount - 1) * spacingX) / 2;
        x = startX + indexInLevel * spacingX;
        y = 100 + level * 190;
      } else if (type === 'circular_loop') {
        // Radial wheel
        const radius = Math.max(220, total * 38);
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
        x = 550 + radius * Math.cos(angle);
        y = 340 + radius * Math.sin(angle);
      } else if (['quadrant', 'bento_grid', 'comparison'].includes(type)) {
        // 2 or 3-column matrix grid
        const cols = total > 4 ? 3 : 2;
        const col = i % cols;
        const row = Math.floor(i / cols);
        x = 120 + col * 310;
        y = 120 + row * 190;
      } else if (type === 'mindmap') {
        // Central hub with satellites
        if (i === 0) {
          x = 550; y = 320;
        } else {
          const angle = ((i - 1) / (total - 1)) * 2 * Math.PI;
          x = 550 + 320 * Math.cos(angle);
          y = 320 + 220 * Math.sin(angle);
        }
      } else {
        // Default clean flow
        x = 100 + (i % 3) * 300;
        y = 120 + Math.floor(i / 3) * 190;
      }

      return {
        ...n,
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
        customStyle: {
          shape: n.customStyle?.shape || (n.type === 'decision' ? 'diamond' : n.type === 'store' ? 'cylinder' : 'card'),
          ...(n.customStyle || {}),
        },
      };
    });
  }, [diagram.nodes, diagram.diagramType]);

  // Interactive Box Drag-to-Resize Listener
  useEffect(() => {
    if (!resizingNodeId || !resizeHandleType) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStartRef.current.clientX) / zoom;
      const dy = (e.clientY - resizeStartRef.current.clientY) / zoom;

      let nextW = resizeStartRef.current.startWidth;
      let nextH = resizeStartRef.current.startHeight;

      if (resizeHandleType === 'se' || resizeHandleType === 'e') {
        nextW = Math.max(120, Math.min(800, resizeStartRef.current.startWidth + dx));
        if (snapToGrid) {
          nextW = Math.round(nextW / gridSize) * gridSize;
        }
      }

      if (resizeHandleType === 'se' || resizeHandleType === 's') {
        nextH = Math.max(44, Math.min(600, resizeStartRef.current.startHeight + dy));
        if (snapToGrid) {
          nextH = Math.round(nextH / gridSize) * gridSize;
        }
      }

      const updatedNodes = nodesWithPositions.map((n) => {
        if (n.id === resizingNodeId) {
          return {
            ...n,
            width: Math.round(nextW),
            height: Math.round(nextH),
          };
        }
        return n;
      });

      latestResizeNodesRef.current = updatedNodes;
      const liveUpdater = onLiveUpdateDiagram || onUpdateDiagram;
      liveUpdater({
        ...diagram,
        nodes: updatedNodes,
      });
    };

    const onMouseUp = () => {
      setResizingNodeId(null);
      setResizeHandleType(null);
      if (resizeMovedRef.current && resizeStartDiagramRef.current) {
        const finalNodes = latestResizeNodesRef.current || nodesWithPositions;
        onUpdateDiagram({ ...diagram, nodes: finalNodes }, resizeStartDiagramRef.current);
      }
      latestResizeNodesRef.current = null;
      resizeStartDiagramRef.current = null;
      resizeMovedRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingNodeId, resizeHandleType, zoom, snapToGrid, gridSize, nodesWithPositions, diagram, onUpdateDiagram, onLiveUpdateDiagram]);

  // Synchronize initial calculated positions if missing in diagram (without polluting undo history)
  useEffect(() => {
    const hasMissing = (diagram.nodes || []).some((n) => n.x === undefined || n.y === undefined);
    if (hasMissing && nodesWithPositions.length > 0) {
      const liveUpdater = onLiveUpdateDiagram || onUpdateDiagram;
      liveUpdater({
        ...diagram,
        nodes: nodesWithPositions,
      });
    }
  }, [nodesWithPositions]);

  // Auto-select first node initially if available so editing options are immediately evident
  useEffect(() => {
    if (!selectedNodeId && nodesWithPositions.length > 0) {
      setSelectedNodeId(nodesWithPositions[0].id);
      setSelectedNodeIds([nodesWithPositions[0].id]);
    }
  }, []);

  // Canvas Keyboard Shortcuts (V for Select, M for Marquee, H for Hand, Esc to Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      // Canvas Undo / Redo Shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveCanvasTool('select');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveCanvasTool('marquee');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveCanvasTool('hand');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        const activeId = selectedNodeId || (selectedNodeIds.length > 0 ? selectedNodeIds[0] : null);
        if (activeId && !inlineEditing) {
          e.preventDefault();
          handleDuplicateNode(activeId);
        }
      } else if (e.key === 'Tab') {
        const activeId = selectedNodeId || (selectedNodeIds.length > 0 ? selectedNodeIds[0] : null);
        if (activeId && !inlineEditing) {
          e.preventDefault();
          handleQuickAddNextStep(activeId);
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setConnectSourceId(null);
        setThreadDrag(null);
        setThreadHoverTargetId(null);
        setActiveGuides([]);
        setIsMarqueeSelecting(false);
        setMarqueeBox(null);
        setInlineEditing(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedNodeIds, inlineEditing]);

  // Node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeSpec>();
    nodesWithPositions.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodesWithPositions]);

  // Imperative handle for clean 1-click export from DiagramCanvas
  useImperativeHandle(ref, () => ({
    getCanvasElement: () => canvasRef.current,
    exportPngDataUrl: async () => {
      if (!canvasRef.current) return null;
      const prevSelectedNode = selectedNodeId;
      const prevSelectedEdge = selectedEdgeId;
      const prevConnect = connectSourceId;
      const prevPan = { ...pan };
      const prevZoom = zoom;

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectSourceId(null);
      setIsExporting(true);

      // Frame all nodes nicely so nothing is clipped
      if (nodesWithPositions.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodesWithPositions.forEach((n) => {
          const nx = n.x ?? 100;
          const ny = n.y ?? 160;
          const nw = n.width || (n.customStyle?.shape === 'pill' ? 210 : n.customStyle?.shape === 'heart' ? 220 : 230);
          const nh = n.height || (n.customStyle?.shape === 'pill' ? 56 : n.customStyle?.shape === 'heart' ? 180 : 110);
          minX = Math.min(minX, nx);
          minY = Math.min(minY, ny);
          maxX = Math.max(maxX, nx + nw);
          maxY = Math.max(maxY, ny + nh);
        });

        const containerW = canvasRef.current.clientWidth || 1200;
        const containerH = canvasRef.current.clientHeight || 800;
        const padding = 70;
        const contentW = Math.max(maxX - minX + padding * 2, 200);
        const contentH = Math.max(maxY - minY + padding * 2, 200);

        const scaleX = containerW / contentW;
        const scaleY = containerH / contentH;
        const targetZoom = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

        setZoom(Number(targetZoom.toFixed(2)));
        setPan({
          x: (containerW - (minX + maxX) * targetZoom) / 2,
          y: (containerH - (minY + maxY) * targetZoom) / 2,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      try {
        const bg = getCanvasBgColor();
        const dataUrl = await toPng(canvasRef.current, {
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: '',
          cacheBust: false,
          backgroundColor: bg,
          filter: (domNode: HTMLElement) => {
            if (!domNode) return true;
            if (
              domNode.dataset?.interactive === 'true' ||
              domNode.getAttribute?.('data-interactive') === 'true' ||
              domNode.dataset?.exportExclude === 'true' ||
              domNode.getAttribute?.('data-export-exclude') === 'true'
            ) {
              return false;
            }
            if (domNode.classList?.contains?.('cursor-crosshair') && domNode.tagName === 'BUTTON') {
              return false;
            }
            return true;
          },
        });
        return dataUrl;
      } catch (err) {
        console.error('InteractiveCanvas toPng failed:', err);
        return null;
      } finally {
        setIsExporting(false);
        setPan(prevPan);
        setZoom(prevZoom);
        setSelectedNodeId(prevSelectedNode);
        setSelectedEdgeId(prevSelectedEdge);
        setConnectSourceId(prevConnect);
      }
    },
    exportPng: async () => {
      if (!canvasRef.current) return null;
      const prevSelectedNode = selectedNodeId;
      const prevSelectedEdge = selectedEdgeId;
      const prevConnect = connectSourceId;
      const prevPan = { ...pan };
      const prevZoom = zoom;

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectSourceId(null);
      setIsExporting(true);

      // Frame all nodes nicely so nothing is clipped
      if (nodesWithPositions.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodesWithPositions.forEach((n) => {
          const nx = n.x ?? 100;
          const ny = n.y ?? 160;
          const nw = n.width || (n.customStyle?.shape === 'pill' ? 210 : n.customStyle?.shape === 'heart' ? 220 : 230);
          const nh = n.height || (n.customStyle?.shape === 'pill' ? 56 : n.customStyle?.shape === 'heart' ? 180 : 110);
          minX = Math.min(minX, nx);
          minY = Math.min(minY, ny);
          maxX = Math.max(maxX, nx + nw);
          maxY = Math.max(maxY, ny + nh);
        });

        const containerW = canvasRef.current.clientWidth || 1200;
        const containerH = canvasRef.current.clientHeight || 800;
        const padding = 70;
        const contentW = Math.max(maxX - minX + padding * 2, 200);
        const contentH = Math.max(maxY - minY + padding * 2, 200);

        const scaleX = containerW / contentW;
        const scaleY = containerH / contentH;
        const targetZoom = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

        setZoom(Number(targetZoom.toFixed(2)));
        setPan({
          x: (containerW - (minX + maxX) * targetZoom) / 2,
          y: (containerH - (minY + maxY) * targetZoom) / 2,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      try {
        const bg = getCanvasBgColor();
        const dataUrl = await toPng(canvasRef.current, {
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: '',
          cacheBust: false,
          backgroundColor: bg,
          filter: (domNode: HTMLElement) => {
            if (!domNode) return true;
            if (
              domNode.dataset?.interactive === 'true' ||
              domNode.getAttribute?.('data-interactive') === 'true' ||
              domNode.dataset?.exportExclude === 'true' ||
              domNode.getAttribute?.('data-export-exclude') === 'true'
            ) {
              return false;
            }
            if (domNode.classList?.contains?.('cursor-crosshair') && domNode.tagName === 'BUTTON') {
              return false;
            }
            return true;
          },
        });
        if (dataUrl) {
          const res = await fetch(dataUrl);
          return await res.blob();
        }
        return null;
      } catch (err) {
        console.error('InteractiveCanvas exportPng failed:', err);
        return null;
      } finally {
        setIsExporting(false);
        setPan(prevPan);
        setZoom(prevZoom);
        setSelectedNodeId(prevSelectedNode);
        setSelectedEdgeId(prevSelectedEdge);
        setConnectSourceId(prevConnect);
      }
    },
    exportSvg: async () => {
      if (!canvasRef.current) return null;
      const prevSelectedNode = selectedNodeId;
      const prevSelectedEdge = selectedEdgeId;
      const prevConnect = connectSourceId;
      const prevPan = { ...pan };
      const prevZoom = zoom;

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectSourceId(null);
      setIsExporting(true);

      if (nodesWithPositions.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        nodesWithPositions.forEach((n) => {
          const nx = n.x ?? 100;
          const ny = n.y ?? 160;
          const nw = n.width || (n.customStyle?.shape === 'pill' ? 210 : n.customStyle?.shape === 'heart' ? 220 : 230);
          const nh = n.height || (n.customStyle?.shape === 'pill' ? 56 : n.customStyle?.shape === 'heart' ? 180 : 110);
          minX = Math.min(minX, nx);
          minY = Math.min(minY, ny);
          maxX = Math.max(maxX, nx + nw);
          maxY = Math.max(maxY, ny + nh);
        });

        const containerW = canvasRef.current.clientWidth || 1200;
        const containerH = canvasRef.current.clientHeight || 800;
        const padding = 70;
        const contentW = Math.max(maxX - minX + padding * 2, 200);
        const contentH = Math.max(maxY - minY + padding * 2, 200);

        const scaleX = containerW / contentW;
        const scaleY = containerH / contentH;
        const targetZoom = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

        setZoom(Number(targetZoom.toFixed(2)));
        setPan({
          x: (containerW - (minX + maxX) * targetZoom) / 2,
          y: (containerH - (minY + maxY) * targetZoom) / 2,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      try {
        const bg = getCanvasBgColor();
        const svgDataUri = await toSvg(canvasRef.current, {
          backgroundColor: bg,
          skipFonts: true,
          fontEmbedCSS: '',
          cacheBust: false,
          filter: (domNode: HTMLElement) => {
            if (!domNode) return true;
            if (
              domNode.dataset?.interactive === 'true' ||
              domNode.getAttribute?.('data-interactive') === 'true' ||
              domNode.dataset?.exportExclude === 'true' ||
              domNode.getAttribute?.('data-export-exclude') === 'true'
            ) {
              return false;
            }
            if (domNode.classList?.contains?.('cursor-crosshair') && domNode.tagName === 'BUTTON') {
              return false;
            }
            return true;
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
        return null;
      } catch (err) {
        console.error('InteractiveCanvas toSvg failed:', err);
        return null;
      } finally {
        setIsExporting(false);
        setPan(prevPan);
        setZoom(prevZoom);
        setSelectedNodeId(prevSelectedNode);
        setSelectedEdgeId(prevSelectedEdge);
        setConnectSourceId(prevConnect);
      }
    },
    zoomIn: () => setZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2)))),
    zoomOut: () => setZoom((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2)))),
    resetZoom: () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    fitToScreen: () => handleFitToScreen(),
  }));

  // Viewport panning or Marquee area selection
  const handleMouseDownBackground = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive="true"]') || target.closest('[data-node-id="true"]')) return;

    if (inlineEditing) {
      setInlineEditing(null);
    }

    if (!e.shiftKey) {
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
    }
    setSelectedEdgeId(null);
    setIsInspectorOpen(false);
    if (connectSourceId) setConnectSourceId(null);
    if (threadDrag) setThreadDrag(null);
    setThreadHoverTargetId(null);
    setIsTemplatesMenuOpen(false);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;

      // Start Marquee Selection if holding Shift or in Marquee tool mode
      const isMarqueeMode = e.shiftKey || activeCanvasTool === 'marquee';
      if (isMarqueeMode) {
        setIsMarqueeSelecting(true);
        marqueeStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          canvasX,
          canvasY,
        };
        setMarqueeBox({
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
        });
        return;
      }
    }

    // Default to Smooth Pan
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    // Track mouse coordinate for live connect rubberband
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x: rawX, y: rawY });
    }

    // 1. Marquee Area Selection Mode
    if (isMarqueeSelecting && marqueeStartRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const currentCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      const startX = marqueeStartRef.current.canvasX;
      const startY = marqueeStartRef.current.canvasY;

      setMarqueeBox({
        startX,
        startY,
        currentX: currentCanvasX,
        currentY: currentCanvasY,
      });

      const boxX = Math.min(startX, currentCanvasX);
      const boxY = Math.min(startY, currentCanvasY);
      const boxW = Math.abs(currentCanvasX - startX);
      const boxH = Math.abs(currentCanvasY - startY);

      // Hit-test all nodes against marquee rectangle
      const matched = nodesWithPositions.filter((node) => {
        const nx = node.x || 0;
        const ny = node.y || 0;
        const nw = node.width || 230;
        const nh = node.height || 110;
        return nx < boxX + boxW && nx + nw > boxX && ny < boxY + boxH && ny + nh > boxY;
      });

      const matchedIds = matched.map((n) => n.id);
      setSelectedNodeIds(matchedIds);
      if (matchedIds.length > 0) {
        setSelectedNodeId(matchedIds[0]);
      } else {
        setSelectedNodeId(null);
      }
      return;
    }

    // 2. Viewport Panning Mode
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      setPan({
        x: panStartRef.current.startPanX + dx,
        y: panStartRef.current.startPanY + dy,
      });
      return;
    }

    // 3. Node Dragging Mode with Smart Magnetic Guides & Multi-Node Movement
    if (draggingNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      let targetX = mouseCanvasX - dragOffsetRef.current.offsetX;
      let targetY = mouseCanvasY - dragOffsetRef.current.offsetY;

      const draggedNode = nodeMap.get(draggingNodeId);
      const dw = draggedNode?.width || 230;
      const dh = draggedNode?.height || 110;

      // Smart Magnetic Alignment Snapping
      const snapThreshold = 8;
      const newGuides: { type: 'vertical' | 'horizontal'; pos: number; from: number; to: number }[] = [];

      const dragLeft = targetX;
      const dragCenterX = targetX + dw / 2;
      const dragRight = targetX + dw;
      const dragTop = targetY;
      const dragCenterY = targetY + dh / 2;
      const dragBottom = targetY + dh;

      const otherNodes = nodesWithPositions.filter((n) => !selectedNodeIds.includes(n.id) && n.id !== draggingNodeId);

      let snappedX = false;
      let snappedY = false;

      for (const other of otherNodes) {
        const ox = other.x || 0;
        const oy = other.y || 0;
        const ow = other.width || 230;
        const oh = other.height || 110;
        const ocx = ox + ow / 2;
        const ocy = oy + oh / 2;
        const orx = ox + ow;
        const oby = oy + oh;

        // Vertical Alignment Snaps (X-axis)
        if (!snappedX) {
          if (Math.abs(dragCenterX - ocx) <= snapThreshold) {
            targetX = ocx - dw / 2;
            snappedX = true;
            newGuides.push({
              type: 'vertical',
              pos: Math.round(ocx),
              from: Math.min(dragTop, oy) - 30,
              to: Math.max(dragBottom, oby) + 30,
            });
          } else if (Math.abs(dragLeft - ox) <= snapThreshold) {
            targetX = ox;
            snappedX = true;
            newGuides.push({
              type: 'vertical',
              pos: Math.round(ox),
              from: Math.min(dragTop, oy) - 30,
              to: Math.max(dragBottom, oby) + 30,
            });
          } else if (Math.abs(dragRight - orx) <= snapThreshold) {
            targetX = orx - dw;
            snappedX = true;
            newGuides.push({
              type: 'vertical',
              pos: Math.round(orx),
              from: Math.min(dragTop, oy) - 30,
              to: Math.max(dragBottom, oby) + 30,
            });
          }
        }

        // Horizontal Alignment Snaps (Y-axis)
        if (!snappedY) {
          if (Math.abs(dragCenterY - ocy) <= snapThreshold) {
            targetY = ocy - dh / 2;
            snappedY = true;
            newGuides.push({
              type: 'horizontal',
              pos: Math.round(ocy),
              from: Math.min(dragLeft, ox) - 30,
              to: Math.max(dragRight, orx) + 30,
            });
          } else if (Math.abs(dragTop - oy) <= snapThreshold) {
            targetY = oy;
            snappedY = true;
            newGuides.push({
              type: 'horizontal',
              pos: Math.round(oy),
              from: Math.min(dragLeft, ox) - 30,
              to: Math.max(dragRight, orx) + 30,
            });
          } else if (Math.abs(dragBottom - oby) <= snapThreshold) {
            targetY = oby - dh;
            snappedY = true;
            newGuides.push({
              type: 'horizontal',
              pos: Math.round(oby),
              from: Math.min(dragLeft, ox) - 30,
              to: Math.max(dragRight, orx) + 30,
            });
          }
        }
      }

      setActiveGuides(newGuides);

      const origPos = multiDragStartsRef.current.get(draggingNodeId) || {
        startX: draggedNode?.x || 0,
        startY: draggedNode?.y || 0,
      };
      const deltaX = targetX - origPos.startX;
      const deltaY = targetY - origPos.startY;

      const updatedNodes = nodesWithPositions.map((n) => {
        if (selectedNodeIds.includes(n.id)) {
          const init = multiDragStartsRef.current.get(n.id);
          if (init) {
            return {
              ...n,
              x: Math.round(init.startX + deltaX),
              y: Math.round(init.startY + deltaY),
            };
          }
        }
        if (n.id === draggingNodeId) {
          return { ...n, x: Math.round(targetX), y: Math.round(targetY) };
        }
        return n;
      });

      dragMovedRef.current = true;
      latestDragNodesRef.current = updatedNodes;
      const liveUpdater = onLiveUpdateDiagram || onUpdateDiagram;
      liveUpdater({
        ...diagram,
        nodes: updatedNodes,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (threadDrag) {
      if (threadHoverTargetId && threadHoverTargetId !== threadDrag.sourceId) {
        handleCreateEdge(threadDrag.sourceId, threadHoverTargetId);
        setConnectSourceId(null);
      }
      setThreadDrag(null);
      setThreadHoverTargetId(null);
    }
    if (draggingNodeId && dragMovedRef.current && dragStartDiagramRef.current) {
      const finalNodes = latestDragNodesRef.current || nodesWithPositions;
      onUpdateDiagram({ ...diagram, nodes: finalNodes }, dragStartDiagramRef.current);
    }
    latestDragNodesRef.current = null;
    dragStartDiagramRef.current = null;
    dragMovedRef.current = false;
    setDraggingNodeId(null);
    setActiveGuides([]);
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeBox(null);
      marqueeStartRef.current = null;
    }
  };

  // Window listener to guarantee drag always commits even if mouse released outside canvas
  useEffect(() => {
    if (!draggingNodeId) return;
    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingNodeId, diagram, nodesWithPositions]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(2.5, Math.max(0.35, Number((prev + delta).toFixed(2)))));
    }
  };

  // Node Drag Start (supports Shift multi-select & group dragging)
  const handleNodeMouseDown = (e: React.MouseEvent, node: NodeSpec) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();

    if (inlineEditing) {
      setInlineEditing(null);
    }

    if (connectSourceId || threadDrag) {
      const srcId = threadDrag?.sourceId || connectSourceId;
      if (srcId && srcId !== node.id) {
        handleCreateEdge(srcId, node.id);
      }
      setConnectSourceId(null);
      setThreadDrag(null);
      setThreadHoverTargetId(null);
      return;
    }

    if (e.shiftKey) {
      // Toggle node in multi-selection
      const isAlreadySelected = selectedNodeIds.includes(node.id);
      const next = isAlreadySelected ? selectedNodeIds.filter((id) => id !== node.id) : [...selectedNodeIds, node.id];
      setSelectedNodeIds(next);
      setSelectedNodeId(next.length > 0 ? next[next.length - 1] : null);
      setSelectedEdgeId(null);
      return;
    }

    let currentSelection = selectedNodeIds;
    if (!selectedNodeIds.includes(node.id)) {
      currentSelection = [node.id];
      setSelectedNodeIds([node.id]);
      setSelectedNodeId(node.id);
    } else {
      setSelectedNodeId(node.id);
    }
    setSelectedEdgeId(null);
    dragStartDiagramRef.current = JSON.parse(JSON.stringify(diagram));
    dragMovedRef.current = false;
    setDraggingNodeId(node.id);

    // Save starting positions for all selected nodes
    const starts = new Map<string, { startX: number; startY: number }>();
    nodesWithPositions.forEach((n) => {
      if (currentSelection.includes(n.id)) {
        starts.set(n.id, { startX: n.x || 0, startY: n.y || 0 });
      }
    });
    multiDragStartsRef.current = starts;

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      dragOffsetRef.current = {
        offsetX: mouseCanvasX - (node.x || 0),
        offsetY: mouseCanvasY - (node.y || 0),
      };
    }
  };

  // Batch Multi-Selection Alignment Handlers (Figma-Style)
  const handleBatchAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedNodeIds.length <= 1) return;
    const selectedNodes = nodesWithPositions.filter((n) => selectedNodeIds.includes(n.id));
    if (selectedNodes.length <= 1) return;

    let updatedNodes = [...nodesWithPositions];

    if (alignment === 'left') {
      const minX = Math.min(...selectedNodes.map((n) => n.x || 0));
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, x: minX } : n
      );
    } else if (alignment === 'center') {
      const centers = selectedNodes.map((n) => (n.x || 0) + (n.width || 230) / 2);
      const avgCenter = Math.round(centers.reduce((a, b) => a + b, 0) / centers.length);
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, x: Math.round(avgCenter - (n.width || 230) / 2) } : n
      );
    } else if (alignment === 'right') {
      const maxRights = selectedNodes.map((n) => (n.x || 0) + (n.width || 230));
      const maxRight = Math.max(...maxRights);
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, x: maxRight - (n.width || 230) } : n
      );
    } else if (alignment === 'top') {
      const minY = Math.min(...selectedNodes.map((n) => n.y || 0));
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, y: minY } : n
      );
    } else if (alignment === 'middle') {
      const centers = selectedNodes.map((n) => (n.y || 0) + (n.height || 110) / 2);
      const avgCenter = Math.round(centers.reduce((a, b) => a + b, 0) / centers.length);
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, y: Math.round(avgCenter - (n.height || 110) / 2) } : n
      );
    } else if (alignment === 'bottom') {
      const maxBottoms = selectedNodes.map((n) => (n.y || 0) + (n.height || 110));
      const maxBottom = Math.max(...maxBottoms);
      updatedNodes = nodesWithPositions.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, y: maxBottom - (n.height || 110) } : n
      );
    }

    onUpdateDiagram({ ...diagram, nodes: updatedNodes });
  };

  const handleBatchDistribute = (direction: 'horizontal' | 'vertical') => {
    if (selectedNodeIds.length < 3) return;
    const selectedNodes = nodesWithPositions.filter((n) => selectedNodeIds.includes(n.id));
    if (selectedNodes.length < 3) return;

    if (direction === 'horizontal') {
      const sorted = [...selectedNodes].sort((a, b) => (a.x || 0) - (b.x || 0));
      const firstX = sorted[0].x || 0;
      const lastX = sorted[sorted.length - 1].x || 0;
      const span = lastX - firstX;
      const step = span / (sorted.length - 1);
      const posMap = new Map<string, number>();
      sorted.forEach((n, idx) => posMap.set(n.id, Math.round(firstX + idx * step)));

      const updatedNodes = nodesWithPositions.map((n) =>
        posMap.has(n.id) ? { ...n, x: posMap.get(n.id)! } : n
      );
      onUpdateDiagram({ ...diagram, nodes: updatedNodes });
    } else {
      const sorted = [...selectedNodes].sort((a, b) => (a.y || 0) - (b.y || 0));
      const firstY = sorted[0].y || 0;
      const lastY = sorted[sorted.length - 1].y || 0;
      const span = lastY - firstY;
      const step = span / (sorted.length - 1);
      const posMap = new Map<string, number>();
      sorted.forEach((n, idx) => posMap.set(n.id, Math.round(firstY + idx * step)));

      const updatedNodes = nodesWithPositions.map((n) =>
        posMap.has(n.id) ? { ...n, y: posMap.get(n.id)! } : n
      );
      onUpdateDiagram({ ...diagram, nodes: updatedNodes });
    }
  };

  const handleBatchDelete = () => {
    if (selectedNodeIds.length === 0) return;
    const updatedNodes = nodesWithPositions.filter((n) => !selectedNodeIds.includes(n.id));
    const updatedEdges = (diagram.edges || []).filter(
      (e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
    );
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
    onUpdateDiagram({ ...diagram, nodes: updatedNodes, edges: updatedEdges });
  };

  const handleBatchColor = (palette: PresetPalette) => {
    if (selectedNodeIds.length === 0) return;
    const updatedNodes = nodesWithPositions.map((n) => {
      if (selectedNodeIds.includes(n.id)) {
        return {
          ...n,
          customStyle: {
            ...(n.customStyle || {}),
            borderColor: palette.border,
            bgColor: palette.bg,
            textColor: palette.text,
            glowColor: palette.glow,
          },
        };
      }
      return n;
    });
    onUpdateDiagram({ ...diagram, nodes: updatedNodes });
  };

  // Auto-Fit all nodes into screen viewport
  const handleFitToScreen = () => {
    void [_handleTidyCanvas, _handleClearCanvas, _handleScaleAllBoxes];

    if (!containerRef.current || nodesWithPositions.length === 0) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodesWithPositions.forEach((n) => {
      const x = n.x || 0;
      const y = n.y || 0;
      const w = n.width || 230;
      const h = n.height || 110;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    });

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const scaleX = containerW / contentW;
    const scaleY = containerH / contentH;
    const newZoom = Math.min(1.4, Math.max(0.4, Math.min(scaleX, scaleY)));

    setZoom(Number(newZoom.toFixed(2)));
    setPan({
      x: (containerW - (minX + maxX) * newZoom) / 2,
      y: (containerH - (minY + maxY) * newZoom) / 2,
    });
  };

  // Auto-Layout Algorithms
  const applyAutoLayout = (layoutType: 'horizontal' | 'vertical' | 'grid' | 'tree' | 'radial') => {
    const nodes = [...nodesWithPositions];
    const total = nodes.length;
    if (total === 0) return;

    let updated: NodeSpec[] = [];

    if (layoutType === 'horizontal') {
      const cols = total <= 5 ? total : 4;
      updated = nodes.map((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          ...n,
          x: 100 + col * 290,
          y: total <= 5 ? 200 : 160 + row * 180,
        };
      });
    } else if (layoutType === 'vertical') {
      updated = nodes.map((n, i) => ({
        ...n,
        x: 450,
        y: 160 + i * 160,
      }));
    } else if (layoutType === 'grid') {
      const cols = total > 8 ? 4 : total > 4 ? 3 : 2;
      updated = nodes.map((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          ...n,
          x: 100 + col * 290,
          y: 160 + row * 180,
        };
      });
    } else if (layoutType === 'tree') {
      // Tiered tree based on incoming/outgoing edges
      const inDegree = new Map<string, number>();
      nodes.forEach((n) => inDegree.set(n.id, 0));
      (diagram.edges || []).forEach((e) => {
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      });

      // Sort by inDegree to find root nodes
      const roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
      const others = nodes.filter((n) => (inDegree.get(n.id) || 0) > 0);
      const sorted = [...roots, ...others];

      const levels: NodeSpec[][] = [[], [], []];
      sorted.forEach((n, idx) => {
        if (idx < Math.max(1, Math.floor(total / 3))) levels[0].push(n);
        else if (idx < Math.max(2, Math.floor((total * 2) / 3))) levels[1].push(n);
        else levels[2].push(n);
      });

      updated = [];
      levels.forEach((tier, levelIdx) => {
        const tierCount = tier.length;
        const spacingX = Math.max(280, 1000 / Math.max(1, tierCount));
        const startX = 550 - ((tierCount - 1) * spacingX) / 2;
        tier.forEach((n, tierIdx) => {
          updated.push({
            ...n,
            x: Math.round(startX + tierIdx * spacingX),
            y: 160 + levelIdx * 200,
          });
        });
      });
    } else if (layoutType === 'radial') {
      const radius = Math.max(230, total * 40);
      updated = nodes.map((n, i) => {
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
        return {
          ...n,
          x: Math.round(550 + radius * Math.cos(angle)),
          y: Math.round(350 + radius * Math.sin(angle)),
        };
      });
    }

    onUpdateDiagram({
      ...diagram,
      nodes: updated,
      canvasLayout: layoutType,
    });
  };

  // One-click Auto-Declutter & Tidy Layout
  const _handleTidyCanvas = () => {
    const nodes = [...nodesWithPositions];
    const total = nodes.length;
    if (total === 0) return;

    // Wrap neatly: 4 columns if > 4 nodes, else single row
    const cols = total <= 4 ? total : 4;
    const updatedNodes = nodes.map((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...n,
        x: 100 + col * 290,
        y: total <= 4 ? 200 : 160 + row * 180,
      };
    });

    // Remove boilerplate "Next Phase" labels so connector lines are clean & sleek
    const updatedEdges = (diagram.edges || []).map((e) => ({
      ...e,
      label: e.label === 'Next Phase' ? '' : e.label,
    }));

    onUpdateDiagram({
      ...diagram,
      nodes: updatedNodes,
      edges: updatedEdges,
    });

    setTimeout(() => {
      handleFitToScreen();
    }, 60);
  };

  // Instant Basic Structure / Starter Template Application
  const handleApplyBasicTemplate = (templateId: string) => {
    const tmpl = CANVAS_BASIC_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    onUpdateDiagram({
      ...diagram,
      nodes: tmpl.nodes,
      edges: tmpl.edges,
    });
    setIsTemplatesMenuOpen(false);
    setSelectedNodeId(tmpl.nodes[0]?.id || null);
    setSelectedEdgeId(null);

    setZoom(1);
    setPan({ x: 40, y: 0 });
  };

  const _handleClearCanvas = () => {
    onUpdateDiagram({
      ...diagram,
      nodes: [],
      edges: [],
    });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  // Node Mutations
  const handleUpdateNode = (id: string, updates: Partial<NodeSpec>) => {
    const updated = nodesWithPositions.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          ...updates,
          customStyle: {
            ...(n.customStyle || {}),
            ...(updates.customStyle || {}),
          },
        };
      }
      return n;
    });
    onUpdateDiagram({ ...diagram, nodes: updated });
  };

  // Drag-to-Resize Node Start
  const handleResizeStart = (
    e: React.MouseEvent,
    node: NodeSpec,
    handleType: 'se' | 'e' | 's'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingNodeId(node.id);
    setResizeHandleType(handleType);
    resizeStartDiagramRef.current = JSON.parse(JSON.stringify(diagram));
    resizeMovedRef.current = false;
    const shape = (node.customStyle?.shape || 'card') as string;
    const currentW = node.width || (shape === 'pill' ? 210 : shape === 'heart' ? 220 : 230);
    const currentH = node.height || (shape === 'pill' ? 56 : shape === 'heart' ? 180 : 110);
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startWidth: currentW,
      startHeight: currentH,
      nodeId: node.id,
    };
  };

  // Quick scale a single node by factor (e.g. 0.85 = -15%, 1.15 = +15%)
  const handleScaleNodeSize = (nodeId: string, factor: number) => {
    const node = nodesWithPositions.find((n) => n.id === nodeId);
    if (!node) return;
    const shape = (node.customStyle?.shape || 'card') as string;
    const currentW = node.width || (shape === 'pill' ? 210 : shape === 'heart' ? 220 : 230);
    const currentH = node.height || (shape === 'pill' ? 56 : shape === 'heart' ? 180 : 110);
    const newW = Math.max(120, Math.min(800, Math.round((currentW * factor) / 8) * 8));
    const newH = Math.max(44, Math.min(600, Math.round((currentH * factor) / 8) * 8));
    handleUpdateNode(nodeId, { width: newW, height: newH });
  };

  // Preset size for single node
  const handleSetNodePresetSize = (nodeId: string, width: number, height: number) => {
    handleUpdateNode(nodeId, { width, height });
  };

  // Global Box Preset: update all boxes in diagram
  const handleSetGlobalBoxPreset = (width: number, height: number) => {
    const updated = nodesWithPositions.map((n) => ({
      ...n,
      width,
      height,
    }));
    onUpdateDiagram({
      ...diagram,
      nodes: updated,
    });
  };

  // Global Box Scaling: scale all boxes across diagram by factor
  const _handleScaleAllBoxes = (factor: number) => {
    const updated = nodesWithPositions.map((n) => {
      const shape = (n.customStyle?.shape || 'card') as string;
      const curW = n.width || (shape === 'pill' ? 210 : shape === 'heart' ? 220 : 230);
      const curH = n.height || (shape === 'pill' ? 56 : shape === 'heart' ? 180 : 110);
      return {
        ...n,
        width: Math.max(120, Math.min(800, Math.round((curW * factor) / 8) * 8)),
        height: Math.max(44, Math.min(600, Math.round((curH * factor) / 8) * 8)),
      };
    });
    onUpdateDiagram({
      ...diagram,
      nodes: updated,
    });
  };

  const handleAddNode = (atPos?: { x: number; y: number }) => {
    const newId = `node_${Date.now().toString(36)}`;
    const index = nodesWithPositions.length + 1;
    const defaultColor = COLOR_PALETTES[(index - 1) % COLOR_PALETTES.length];

    let posX = 100;
    let posY = 180;
    if (atPos) {
      posX = atPos.x;
      posY = atPos.y;
    } else if (nodesWithPositions.length > 0) {
      const lastNode = nodesWithPositions[nodesWithPositions.length - 1];
      const lastX = lastNode.x || 100;
      const lastY = lastNode.y || 180;
      // Smart wrapping: if last node reaches right side, start a new row!
      if (lastX + 290 > 1050) {
        posX = 100;
        posY = lastY + 180;
      } else {
        posX = lastX + 290;
        posY = lastY;
      }
    }
    if (posY < 140) posY = 160;

    const newNode: NodeSpec = {
      id: newId,
      label: `Stage ${index}`,
      sublabel: 'Operational milestone or task description',
      type: 'process',
      order: index,
      badge: String(index).padStart(2, '0'),
      icon: 'Layers',
      x: posX,
      y: posY,
      width: 230,
      height: 110,
      customStyle: {
        shape: 'card',
        borderColor: defaultColor.border,
        bgColor: defaultColor.bg,
        textColor: defaultColor.text,
        glowColor: defaultColor.glow,
        borderStyle: 'solid',
        borderWidth: 2,
        shadow: 'md',
      },
    };

    // If there is a previous node, link to it automatically with clean connector
    let updatedEdges = [...(diagram.edges || [])];
    if (nodesWithPositions.length > 0) {
      const lastNode = nodesWithPositions[nodesWithPositions.length - 1];
      updatedEdges.push({
        id: `e_${lastNode.id}_${newId}`,
        source: lastNode.id,
        target: newId,
        label: '', // Clean connector without redundant boilerplate text
        style: 'solid',
        customStyle: {
          routing: 'curved',
          strokeStyle: 'solid',
          strokeWidth: 2,
          color: defaultColor.border,
          arrowMarker: 'arrow',
        },
      });
    }

    onUpdateDiagram({
      ...diagram,
      nodes: [...nodesWithPositions, newNode],
      edges: updatedEdges,
    });
    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (id: string) => {
    const updatedNodes = nodesWithPositions.filter((n) => n.id !== id);
    const updatedEdges = (diagram.edges || []).filter((e) => e.source !== id && e.target !== id);
    onUpdateDiagram({
      ...diagram,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (id: string) => {
    const source = nodeMap.get(id);
    if (!source) return;
    const newId = `node_${Date.now().toString(36)}`;
    const dup: NodeSpec = {
      ...source,
      id: newId,
      label: `${source.label} (Copy)`,
      x: (source.x || 0) + 40,
      y: (source.y || 0) + 40,
    };
    onUpdateDiagram({
      ...diagram,
      nodes: [...nodesWithPositions, dup],
    });
    setSelectedNodeId(newId);
  };

  // Superfast 1-Click "Add Next Step" (Whimsical / Miro Style Sprouting)
  const handleQuickAddNextStep = (sourceId: string) => {
    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) return;

    const newId = `node_${Date.now().toString(36)}`;
    const nextOrder = (sourceNode.order || nodesWithPositions.length) + 1;
    const defaultColor = COLOR_PALETTES[(nextOrder - 1) % COLOR_PALETTES.length];

    const sw = sourceNode.width || 230;
    const sh = sourceNode.height || 110;
    const sx = sourceNode.x || 100;
    const sy = sourceNode.y || 180;

    let posX = sx + sw + 70;
    let posY = sy;
    if (posX + sw > 1500) {
      posX = 100;
      posY = sy + sh + 70;
    }

    const newNode: NodeSpec = {
      id: newId,
      label: `Stage ${nextOrder}`,
      sublabel: 'Task or milestone description',
      type: 'process',
      order: nextOrder,
      badge: String(nextOrder).padStart(2, '0'),
      icon: 'Layers',
      x: posX,
      y: posY,
      width: sw,
      height: sh,
      customStyle: {
        shape: sourceNode.customStyle?.shape || 'card',
        borderColor: defaultColor.border,
        bgColor: defaultColor.bg,
        textColor: defaultColor.text,
        glowColor: defaultColor.glow,
        borderStyle: 'solid',
        borderWidth: 2,
        shadow: 'md',
      },
    };

    const newEdge: EdgeSpec = {
      id: `e_${sourceId}_${newId}_${Date.now().toString(36)}`,
      source: sourceId,
      target: newId,
      label: '',
      style: 'solid',
      customStyle: {
        routing: 'curved',
        strokeStyle: 'solid',
        strokeWidth: 2,
        color: sourceNode.customStyle?.borderColor || defaultColor.border,
        arrowMarker: 'arrow',
      },
    };

    onUpdateDiagram({
      ...diagram,
      nodes: [...nodesWithPositions, newNode],
      edges: [...(diagram.edges || []), newEdge],
    });

    setSelectedNodeId(newId);
    setSelectedNodeIds([newId]);
    setSelectedEdgeId(null);
    setInlineEditing({ nodeId: newId, field: 'label' });
  };

  // Instant Bulk Steps / Bullets to Complete Flow
  const handleQuickBulkSteps = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^[\d\.\-\*\•\>\)]+\s*/, '').trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const newNodes: NodeSpec[] = [];
    const newEdges: EdgeSpec[] = [];

    lines.forEach((title, i) => {
      const id = `step_${Date.now().toString(36)}_${i}`;
      const color = COLOR_PALETTES[i % COLOR_PALETTES.length];
      const col = i % 4;
      const row = Math.floor(i / 4);

      newNodes.push({
        id,
        label: title,
        sublabel: `Step ${i + 1} execution detail`,
        type: i === 0 ? 'start' : i === lines.length - 1 ? 'end' : 'process',
        order: i + 1,
        badge: String(i + 1).padStart(2, '0'),
        icon: i === 0 ? 'Zap' : i === lines.length - 1 ? 'Target' : 'Layers',
        x: 100 + col * 290,
        y: 180 + row * 180,
        width: 230,
        height: 110,
        customStyle: {
          shape: 'card',
          borderColor: color.border,
          bgColor: color.bg,
          textColor: color.text,
          glowColor: color.glow,
          borderStyle: 'solid',
          borderWidth: 2,
          shadow: 'md',
        },
      });

      if (i > 0) {
        newEdges.push({
          id: `e_${newNodes[i - 1].id}_${id}`,
          source: newNodes[i - 1].id,
          target: id,
          label: '',
          style: 'solid',
          customStyle: {
            routing: 'curved',
            strokeStyle: 'solid',
            strokeWidth: 2,
            color: color.border,
            arrowMarker: 'arrow',
          },
        });
      }
    });

    onUpdateDiagram({
      ...diagram,
      nodes: newNodes,
      edges: newEdges,
    });
    setSelectedNodeId(newNodes[0].id);
    setIsBulkStepsOpen(false);
    setBulkStepsText('');
    handleFitToScreen();
  };

  // Edge Mutations
  const handleCreateEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    // Prevent duplicate exact edge
    const exists = (diagram.edges || []).some((e) => e.source === sourceId && e.target === targetId);
    if (exists) return;

    const sourceNode = nodeMap.get(sourceId);
    const edgeColor = sourceNode?.customStyle?.borderColor || '#06b6d4';

    const newEdge: EdgeSpec = {
      id: `e_${sourceId}_${targetId}_${Date.now().toString(36)}`,
      source: sourceId,
      target: targetId,
      label: 'Flow',
      style: 'solid',
      customStyle: {
        routing: 'curved',
        strokeStyle: 'solid',
        strokeWidth: 2,
        color: edgeColor,
        arrowMarker: 'arrow',
      },
    };

    onUpdateDiagram({
      ...diagram,
      edges: [...(diagram.edges || []), newEdge],
    });
    setSelectedEdgeId(newEdge.id);
  };

  const handleUpdateEdge = (id: string, updates: Partial<EdgeSpec>) => {
    const updated = (diagram.edges || []).map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...updates,
          customStyle: {
            ...(e.customStyle || {}),
            ...(updates.customStyle || {}),
          },
        };
      }
      return e;
    });
    onUpdateDiagram({ ...diagram, edges: updated });
  };

  const handleDeleteEdge = (id: string) => {
    const updated = (diagram.edges || []).filter((e) => e.id !== id);
    onUpdateDiagram({ ...diagram, edges: updated });
    if (selectedEdgeId === id) setSelectedEdgeId(null);
  };

  // Interactive Physical Thread Drag Start
  const handleThreadStart = (
    node: NodeSpec,
    e: React.MouseEvent,
    anchor: 'right' | 'top' | 'bottom' | 'left' = 'right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (readOnly) return;

    const nw = node.width || 230;
    const nh = node.height || 110;
    let startX = (node.x || 0) + nw;
    let startY = (node.y || 0) + nh / 2;
    if (anchor === 'left') {
      startX = node.x || 0;
      startY = (node.y || 0) + nh / 2;
    } else if (anchor === 'top') {
      startX = (node.x || 0) + nw / 2;
      startY = node.y || 0;
    } else if (anchor === 'bottom') {
      startX = (node.x || 0) + nw / 2;
      startY = (node.y || 0) + nh;
    }

    setThreadDrag({
      sourceId: node.id,
      sourceAnchor: anchor,
      startX,
      startY,
    });
    setConnectSourceId(node.id);
    setThreadHoverTargetId(null);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left - pan.x) / zoom;
      const curY = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x: curX, y: curY });
    }
  };

  // Active Thread Dragging Window-Level Listener (Silky Smooth Realtime Tracking)
  useEffect(() => {
    if (!threadDrag) return;

    let currentHoverTarget: string | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left - pan.x) / zoom;
      const curY = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x: curX, y: curY });

      // Hit-test other nodes on canvas with generous target radius (+20px)
      const hitNode = nodesWithPositions.find((n) => {
        if (n.id === threadDrag.sourceId) return false;
        const nw = n.width || 230;
        const nh = n.height || 110;
        const nx = n.x || 0;
        const ny = n.y || 0;
        return curX >= nx - 20 && curX <= nx + nw + 20 && curY >= ny - 20 && curY <= ny + nh + 20;
      });

      const nextTargetId = hitNode ? hitNode.id : null;
      if (nextTargetId !== currentHoverTarget) {
        currentHoverTarget = nextTargetId;
        setThreadHoverTargetId(nextTargetId);
      }
    };

    const onMouseUp = () => {
      if (currentHoverTarget && currentHoverTarget !== threadDrag.sourceId) {
        handleCreateEdge(threadDrag.sourceId, currentHoverTarget);
        setConnectSourceId(null);
      }
      setThreadDrag(null);
      setThreadHoverTargetId(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [threadDrag, pan, zoom, nodesWithPositions]);

  // Calculate anchor point coordinates between source and target
  const getAnchorPoints = (source: NodeSpec, target: NodeSpec) => {
    const sw = source.width || 230;
    const sh = source.height || 110;
    const sx = (source.x || 0) + sw / 2;
    const sy = (source.y || 0) + sh / 2;

    const tw = target.width || 230;
    const th = target.height || 110;
    const tx = (target.x || 0) + tw / 2;
    const ty = (target.y || 0) + th / 2;

    const dx = tx - sx;
    const dy = ty - sy;

    // Connect to closest perimeter edge
    let x1 = sx;
    let y1 = sy;
    let x2 = tx;
    let y2 = ty;

    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal dominant
      if (dx > 0) {
        x1 = (source.x || 0) + sw;
        y1 = sy;
        x2 = target.x || 0;
        y2 = ty;
      } else {
        x1 = source.x || 0;
        y1 = sy;
        x2 = (target.x || 0) + tw;
        y2 = ty;
      }
    } else {
      // Vertical dominant
      if (dy > 0) {
        x1 = sx;
        y1 = (source.y || 0) + sh;
        x2 = tx;
        y2 = target.y || 0;
      } else {
        x1 = sx;
        y1 = source.y || 0;
        x2 = tx;
        y2 = (target.y || 0) + th;
      }
    }

    return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  };

  // Build SVG Path string based on routing
  const buildPathString = (
    routing: EdgeRouting,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): string => {
    const dx = x2 - x1;
    const dy = y2 - y1;

    switch (routing) {
      case 'straight':
        return `M ${x1} ${y1} L ${x2} ${y2}`;
      case 'orthogonal': {
        const midX = x1 + dx / 2;
        return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
      }
      case 'arc': {
        const cx = (x1 + x2) / 2 - dy * 0.2;
        const cy = (y1 + y2) / 2 + dx * 0.2;
        return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
      }
      case 'curved':
      default: {
        const curvature = Math.max(40, Math.abs(dx) * 0.45);
        const cp1x = x1 + (dx >= 0 ? curvature : -curvature);
        const cp1y = y1;
        const cp2x = x2 - (dx >= 0 ? curvature : -curvature);
        const cp2y = y2;
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
      }
    }
  };

  // Currently selected entities
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? (diagram.edges || []).find((e) => e.id === selectedEdgeId) : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDownBackground}
      onMouseMove={handleMouseMoveCanvas}
      onMouseUp={handleMouseUp}
      onDoubleClick={(e) => {
        if (readOnly) return;
        const target = e.target as HTMLElement;
        if (target.closest('[data-interactive="true"]') || target.closest('[data-node-id="true"]')) return;
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const clickX = Math.round(((e.clientX - rect.left - pan.x) / zoom) / gridSize) * gridSize;
          const clickY = Math.round(((e.clientY - rect.top - pan.y) / zoom) / gridSize) * gridSize;
          handleAddNode({ x: clickX - 110, y: clickY - 55 });
        }
      }}
    >
      {/* Floating Draggable Action Toolbar - Always Accessible & Responsive */}
      <div
        data-interactive="true"
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
        className="absolute z-30 flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] shadow-2xl pointer-events-auto transition-shadow animate-in fade-in"
      >
        {/* Grip Drag Handle */}
        <div
          onMouseDown={handleToolbarDragStart}
          onDoubleClick={handleResetToolbarPos}
          className="flex items-center justify-center px-1 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-grab active:cursor-grabbing transition-colors select-none shrink-0"
          title="Drag toolbar anywhere on canvas (Double-click to reset position)"
        >
          <GripVertical size={14} />
        </div>

        {/* Canvas Tool Selector (Select, Marquee, Hand) */}
        <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveCanvasTool('select')}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              activeCanvasTool === 'select'
                ? 'bg-amber-500 text-black font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            title="Pointer Tool (V) - Click & drag nodes"
          >
            <MousePointer size={13} />
          </button>
          <button
            type="button"
            onClick={() => setActiveCanvasTool('marquee')}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              activeCanvasTool === 'marquee'
                ? 'bg-cyan-500 text-black font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            title="Marquee Selection Tool (M) - Drag area to multi-select nodes"
          >
            <BoxSelect size={13} />
          </button>
          <button
            type="button"
            onClick={() => setActiveCanvasTool('hand')}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              activeCanvasTool === 'hand'
                ? 'bg-violet-500 text-white font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
            title="Hand Tool (H) - Drag canvas to pan"
          >
            <Hand size={13} />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {!readOnly && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSizeMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSizeMenuOpen
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-400'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
              title="Open Box Size menu to change all node sizes or scale diagram"
            >
              <Scaling size={13} className="text-indigo-400" />
              <span className="inline">Box Size</span>
              <ChevronDown size={11} className={`text-[var(--text-muted)] transition-transform duration-200 ${isSizeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSizeMenuOpen && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full mt-2 left-0 w-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-md"
              >
                <div className="px-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-2 flex items-center justify-between">
                  <span>Box Size Presets</span>
                  <span className="text-[9px] font-mono font-normal">All Nodes</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  {[
                    { id: 'Compact', label: 'Compact', w: 180, h: 80, desc: '180×80' },
                    { id: 'Standard', label: 'Standard', w: 230, h: 110, desc: '230×110' },
                    { id: 'Spacious', label: 'Spacious', w: 290, h: 130, desc: '290×130' },
                    { id: 'Wide Card', label: 'Wide Card', w: 340, h: 140, desc: '340×140' },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => {
                        handleSetGlobalBoxPreset(sz.w, sz.h);
                        setIsSizeMenuOpen(false);
                      }}
                      className="flex flex-col items-start px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-left group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-indigo-400">
                        {sz.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {sz.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedNode && (
                  <button
                    type="button"
                    onClick={() => {
                      const curW = selectedNode?.width || 230;
                      const curH = selectedNode?.height || 110;
                      handleSetGlobalBoxPreset(curW, curH);
                      setIsSizeMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Match Selected Box</span>
                    <span className="font-mono text-[10px]">
                      {selectedNode.width || 230}×{selectedNode.height || 110}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {/* Alignment & Flow Direction Layout Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => applyAutoLayout('horizontal')}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Arrange as Horizontal Pipeline"
          >
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyAutoLayout('vertical')}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors rotate-90 cursor-pointer"
            title="Arrange as Vertical Flowchart"
          >
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyAutoLayout('grid')}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-violet-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Arrange as Grid Matrix"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyAutoLayout('tree')}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Arrange as Hierarchy Tree"
          >
            <Layers size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyAutoLayout('radial')}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Arrange as Circular Flywheel"
          >
            <RotateCw size={13} />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {/* Quick Bulk Steps Importer (Paste Text -> Instant Diagram) */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsBulkStepsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            title="Paste steps or bullet points to instantly generate a complete workflow diagram"
          >
            <Sparkles size={12} className="text-emerald-400" />
            <span>⚡ Paste Steps</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleDockBottom}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer shrink-0"
          title={containerRef.current && toolbarPos.y > (containerRef.current.clientHeight / 2) ? "Dock to Top" : "Dock to Bottom"}
        >
          {containerRef.current && toolbarPos.y > (containerRef.current.clientHeight / 2) ? (
            <ArrowUpToLine size={13} className="text-amber-400" />
          ) : (
            <ArrowDownToLine size={13} />
          )}
        </button>

        <button
          type="button"
          onClick={handleResetToolbarPos}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer shrink-0"
          title="Reset toolbar position to top-left"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* ⚡ Instant Bulk Steps to Flow Modal */}
      {isBulkStepsOpen && (
        <div
          data-interactive="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setIsBulkStepsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">⚡ Instant Flow Creator (Paste Steps)</h3>
                  <p className="text-[0.72rem] text-[var(--text-muted)]">Paste numbered steps or bullets to generate all connected boxes in 1 second.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkStepsOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <X size={15} />
              </button>
            </div>

            <textarea
              value={bulkStepsText}
              onChange={(e) => setBulkStepsText(e.target.value)}
              placeholder={`1. Customer Submits Order\n2. Inventory & Stock Check\n3. Payment Processing\n4. Warehouse Packaging\n5. Dispatch & Delivery`}
              rows={6}
              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono resize-none leading-relaxed"
              autoFocus
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[0.68rem] text-[var(--text-muted)]">Each line becomes a stage connected in sequence.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkStepsOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBulkSteps(bulkStepsText)}
                  disabled={!bulkStepsText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Generate Flow</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Viewport / Zoom Controls (Cleanly positioned at Bottom-Right Corner) */}
      <div
        data-interactive="true"
        className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] shadow-xl pointer-events-auto select-none"
      >
        {/* Canvas Grid Pattern Cycle */}
        <button
          type="button"
          onClick={() => {
            const next = (effectiveGridPattern === 'dots' ? 'grid' : effectiveGridPattern === 'grid' ? 'clean' : 'dots');
            setGridPattern(next);
            onUpdateDiagram({ ...diagram, canvasGridPattern: next });
          }}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title={`Canvas Grid: ${effectiveGridPattern.toUpperCase()} (Click to cycle Dots / Grid / Clean)`}
        >
          <Grid2x2 size={13} />
        </button>

        <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-0.5" />

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <span className="font-mono text-[0.68rem] font-bold text-[var(--text-secondary)] min-w-[3rem] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))))}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={handleFitToScreen}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title="Fit to Screen"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title="Reset Pan & Zoom"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Clutter Helper Banner (Take it or Cross it) */}
      {!isExporting && !isClutterDismissed && nodesWithPositions.length > 5 && !connectSourceId && (
        <div data-interactive="true" className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)]/95 border border-amber-500/40 backdrop-blur-md shadow-2xl text-xs text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold">💡</span>
          <span className="text-[var(--text-secondary)]">Canvas cluttered? Start clean with a simple 4-box structure:</span>
          <button
            type="button"
            onClick={() => {
              handleApplyBasicTemplate('pipeline');
              setIsClutterDismissed(true);
              try { sessionStorage.setItem('bbot_clutter_tip_dismissed', 'true'); } catch {}
            }}
            className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-bold text-[0.68rem] transition-all shadow-xs cursor-pointer"
            title="Load 4-box pipeline template"
          >
            Load Simple Template
          </button>
          <div className="h-3.5 w-px bg-amber-500/30 mx-0.5" />
          <button
            type="button"
            onClick={() => {
              setIsClutterDismissed(true);
              try { sessionStorage.setItem('bbot_clutter_tip_dismissed', 'true'); } catch {}
            }}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Dismiss suggestion"
            aria-label="Dismiss clutter suggestion"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Connect Mode Banner */}
      {!isExporting && (connectSourceId || threadDrag) && (
        <div data-interactive="true" className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/95 border border-cyan-400/80 text-cyan-200 text-xs shadow-2xl backdrop-blur-md animate-bounce">
          <Zap size={13} className="text-cyan-400 shrink-0" />
          <span className="font-medium">
            {(() => {
              const srcId = threadDrag?.sourceId || connectSourceId;
              const srcNode = diagram.nodes.find((n) => n.id === srcId);
              const label = srcNode?.label?.replace(/<[^>]*>/g, '').trim().slice(0, 24);
              return label ? `Connecting thread from "${label}" → Drop or click target box` : 'Drag or click thread to connect';
            })()}
          </span>
          <span className="text-[0.65rem] text-cyan-400/70 border border-cyan-500/30 rounded px-1 py-0.2">Esc to cancel</span>
          <button
            type="button"
            onClick={() => {
              setConnectSourceId(null);
              setThreadDrag(null);
              setThreadHoverTargetId(null);
            }}
            className="p-0.5 rounded hover:bg-cyan-800/40 text-cyan-300 ml-0.5 cursor-pointer"
            title="Cancel Connection (Esc)"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Interactive 2D Canvas Surface */}
      <div
        ref={canvasRef}
        id="bbot-studio-canvas-content"
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundColor: getCanvasBgColor(),
          cursor: isPanning ? 'grabbing' : (connectSourceId || threadDrag) ? 'crosshair' : 'default',
        }}
      >
        {/* Architectural Background Grid */}
        {effectiveGridPattern !== 'clean' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20">
            <defs>
              <pattern
                id="interactive-canvas-grid-pattern"
                width={gridSize * zoom}
                height={gridSize * zoom}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x}, ${pan.y})`}
              >
                {effectiveGridPattern === 'dots' ? (
                  <circle cx="1.5" cy="1.5" r="1" fill={isLight ? '#94a3b8' : '#334155'} />
                ) : (
                  <path
                    d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
                    fill="none"
                    stroke={isLight ? '#cbd5e1' : '#1e293b'}
                    strokeWidth="0.75"
                  />
                )}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#interactive-canvas-grid-pattern)" />
          </svg>
        )}

        {/* Scaled & Panned Content Container */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connectors / Edges Layer */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
            <defs>
              {/* Fallback Marker Templates */}
              <marker id="marker-arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 1.5 1.8 L 8 5 L 1.5 8.2 L 3.2 5 Z" fill="#06b6d4" stroke="#06b6d4" strokeWidth="0.6" strokeLinejoin="round" />
              </marker>
              <marker id="marker-triangle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <polygon points="1.5,2 8,5 1.5,8" fill="#06b6d4" />
              </marker>
              <marker id="marker-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <circle cx="5" cy="5" r="3.5" fill="#06b6d4" />
              </marker>
              <marker id="marker-diamond" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <polygon points="5,1.5 8.5,5 5,8.5 1.5,5" fill="#06b6d4" />
              </marker>

              {/* Dynamic Per-Edge High-Fidelity Styled Markers */}
              {(diagram.edges || []).map((edge) => {
                const sNode = nodeMap.get(edge.source);
                const baseColor = edge.customStyle?.color || sNode?.customStyle?.borderColor || '#06b6d4';
                const isEdgeSel = selectedEdgeId === edge.id;
                const mColor = isEdgeSel ? '#f59e0b' : baseColor;
                const mType = edge.customStyle?.arrowMarker || 'arrow';
                const cleanId = edge.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                const endMarkerId = `marker-end-${cleanId}`;
                const startMarkerId = `marker-start-${cleanId}`;

                return (
                  <React.Fragment key={`defs-edge-${edge.id}`}>
                    {/* Modern Forward Arrowhead Marker for Target End */}
                    {mType !== 'none' && (
                      <marker
                        id={endMarkerId}
                        viewBox="0 0 10 10"
                        refX="7.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        {mType === 'circle' ? (
                          <circle cx="5" cy="5" r="3.5" fill={mColor} />
                        ) : mType === 'diamond' ? (
                          <polygon points="5,1.5 8.5,5 5,8.5 1.5,5" fill={mColor} />
                        ) : mType === 'triangle' ? (
                          <polygon points="1.5,2 8,5 1.5,8" fill={mColor} />
                        ) : (
                          /* Modern aerodynamic curved chevron */
                          <path
                            d="M 1.5 1.8 L 8 5 L 1.5 8.2 L 3.2 5 Z"
                            fill={mColor}
                            stroke={mColor}
                            strokeWidth="0.6"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        )}
                      </marker>
                    )}

                    {/* High-End Precision Reverse Chevron Marker for Bi-Directional Start */}
                    {mType === 'both' && (
                      <marker
                        id={startMarkerId}
                        viewBox="0 0 10 10"
                        refX="2.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        {/* Symmetrical reverse aerodynamic chevron pointing backward to source node */}
                        <path
                          d="M 8.5 1.8 L 2 5 L 8.5 8.2 L 6.8 5 Z"
                          fill={mColor}
                          stroke={mColor}
                          strokeWidth="0.6"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </marker>
                    )}
                  </React.Fragment>
                );
              })}
            </defs>

            {/* Render Diagram Edges */}
            {(diagram.edges || []).map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const { x1, y1, x2, y2, mx, my } = getAnchorPoints(sourceNode, targetNode);
              const routing = edge.customStyle?.routing || 'curved';
              const pathD = buildPathString(routing, x1, y1, x2, y2);

              const isSelected = selectedEdgeId === edge.id;
              const strokeColor = edge.customStyle?.color || sourceNode.customStyle?.borderColor || '#06b6d4';
              const strokeWidth = edge.customStyle?.strokeWidth || 2;
              const strokeStyle = edge.customStyle?.strokeStyle || edge.style || 'solid';
              const markerType = edge.customStyle?.arrowMarker || 'arrow';
              const cleanId = edge.id.replace(/[^a-zA-Z0-9_-]/g, '_');
              const endMarkerId = `marker-end-${cleanId}`;
              const startMarkerId = `marker-start-${cleanId}`;

              let dashArray = 'none';
              if (strokeStyle === 'dashed') dashArray = '6 4';
              else if (strokeStyle === 'dotted') dashArray = '2 4';

              return (
                <g key={edge.id} className="pointer-events-auto cursor-pointer group" onClick={() => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setIsInspectorOpen(true);
                }}>
                  {/* Invisible thicker stroke for easy clicking */}
                  <path d={pathD} fill="none" stroke="transparent" strokeWidth={16} />

                  {/* Highlight aura if selected */}
                  {isSelected && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={strokeWidth + 5}
                      strokeOpacity={0.6}
                      className="animate-pulse"
                    />
                  )}

                  {/* Main connection line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    className={strokeStyle === 'animated' ? 'animate-flow-dash' : ''}
                    markerEnd={markerType !== 'none' ? `url(#${endMarkerId})` : undefined}
                    markerStart={markerType === 'both' ? `url(#${startMarkerId})` : undefined}
                  />

                  {/* Connection Label Pill */}
                  {edge.label && edge.label !== 'Next Phase' && edge.label.trim() !== '' && (
                    <g transform={`translate(${mx}, ${my})`}>
                      <rect
                        x="-48"
                        y="-11"
                        width="96"
                        height="22"
                        rx="11"
                        fill="var(--bg-surface)"
                        stroke={isSelected ? '#f59e0b' : 'var(--border-subtle)'}
                        strokeWidth="1"
                        className="shadow-sm"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        fontSize="10"
                        fontWeight="600"
                        className="select-none pointer-events-none"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Live Interactive Connecting Thread (Physical Cable / Wire with Physics & Magnetic Snap) */}
            {(threadDrag || connectSourceId) && (() => {
              const srcId = threadDrag?.sourceId || connectSourceId;
              if (!srcId) return null;
              const src = nodeMap.get(srcId);
              if (!src) return null;

              const sw = src.width || 230;
              const sh = src.height || 110;
              let sx = (src.x || 0) + sw;
              let sy = (src.y || 0) + sh / 2;

              if (threadDrag?.sourceAnchor === 'left') {
                sx = src.x || 0;
                sy = (src.y || 0) + sh / 2;
              } else if (threadDrag?.sourceAnchor === 'top') {
                sx = (src.x || 0) + sw / 2;
                sy = src.y || 0;
              } else if (threadDrag?.sourceAnchor === 'bottom') {
                sx = (src.x || 0) + sw / 2;
                sy = (src.y || 0) + sh;
              }

              let tx = mousePos.x;
              let ty = mousePos.y;
              const activeTargetId = threadHoverTargetId;
              const targetNode = activeTargetId ? nodeMap.get(activeTargetId) : null;

              if (targetNode) {
                // Magnetic snap to target node closest side
                const tw = targetNode.width || 230;
                const th = targetNode.height || 110;
                const tCenterX = (targetNode.x || 0) + tw / 2;
                if (sx < tCenterX) {
                  tx = targetNode.x || 0;
                  ty = (targetNode.y || 0) + th / 2;
                } else {
                  tx = (targetNode.x || 0) + tw;
                  ty = (targetNode.y || 0) + th / 2;
                }
              }

              const dx = tx - sx;
              const dy = ty - sy;
              const dist = Math.hypot(dx, dy);
              const curvature = Math.min(Math.max(dist * 0.45, 30), 200);
              const cp1x = sx + (dx >= 0 ? curvature : -curvature * 0.4);
              const cp1y = sy + (Math.abs(dy) < 20 ? 8 : dy * 0.1);
              const cp2x = tx - (dx >= 0 ? curvature : -curvature * 0.4);
              const cp2y = ty - (Math.abs(dy) < 20 ? 8 : dy * 0.1);
              const pathD = `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;

              const isLocked = Boolean(targetNode);
              const mainColor = isLocked ? '#10b981' : '#06b6d4';
              const coreColor = isLocked ? '#34d399' : '#22d3ee';

              return (
                <g className="pointer-events-none select-none z-50">
                  {/* Outer Ambient Glow Cable */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth="8"
                    opacity="0.3"
                    strokeLinecap="round"
                  />

                  {/* Physical Thread Cable with Flowing Dash Pulse */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={coreColor}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />

                  {/* Inner Cable Core Light Wire */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    opacity="0.9"
                    strokeLinecap="round"
                  />

                  {/* Thread Port Origin Socket */}
                  <circle cx={sx} cy={sy} r="5" fill={coreColor} stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={sx} cy={sy} r="2" fill="#ffffff" />

                  {/* Live Moving Cable Tip / Magnetic Plug */}
                  <g transform={`translate(${tx}, ${ty})`}>
                    <circle r="12" fill={mainColor} opacity="0.35" className="animate-ping" />
                    <circle r="7" fill={coreColor} stroke="#ffffff" strokeWidth="2" />
                    <circle r="2.5" fill="#ffffff" />

                    {/* Floating Instruction / Status Badge */}
                    <g transform="translate(14, -12)">
                      <rect
                        x="-2"
                        y="-10"
                        width={isLocked ? 130 : 115}
                        height="20"
                        rx="10"
                        fill="#020617"
                        fillOpacity="0.92"
                        stroke={isLocked ? "#10b981" : "#06b6d4"}
                        strokeWidth="1.5"
                      />
                      <text
                        x={isLocked ? 63 : 56}
                        y="4"
                        textAnchor="middle"
                        fill={isLocked ? "#34d399" : "#22d3ee"}
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {isLocked ? "🎯 Release to Connect!" : "🧵 Drag to Box"}
                      </text>
                    </g>
                  </g>
                </g>
              );
            })()}

            {/* Smart Magnetic Alignment Guides (Figma-Style Snap Lines) */}
            {activeGuides.map((guide, idx) => (
              <g key={`guide-${idx}`} className="pointer-events-none">
                {guide.type === 'vertical' ? (
                  <>
                    <line
                      x1={guide.pos}
                      y1={guide.from}
                      x2={guide.pos}
                      y2={guide.to}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeOpacity="0.85"
                    />
                    <circle cx={guide.pos} cy={guide.from} r="2.5" fill="#06b6d4" />
                    <circle cx={guide.pos} cy={guide.to} r="2.5" fill="#06b6d4" />
                  </>
                ) : (
                  <>
                    <line
                      x1={guide.from}
                      y1={guide.pos}
                      x2={guide.to}
                      y2={guide.pos}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeOpacity="0.85"
                    />
                    <circle cx={guide.from} cy={guide.pos} r="2.5" fill="#06b6d4" />
                    <circle cx={guide.to} cy={guide.pos} r="2.5" fill="#06b6d4" />
                  </>
                )}
              </g>
            ))}
          </svg>

          {/* Marquee Area Selection Rectangle */}
          {isMarqueeSelecting && marqueeBox && (() => {
            const bx = Math.min(marqueeBox.startX, marqueeBox.currentX);
            const by = Math.min(marqueeBox.startY, marqueeBox.currentY);
            const bw = Math.abs(marqueeBox.currentX - marqueeBox.startX);
            const bh = Math.abs(marqueeBox.currentY - marqueeBox.startY);
            return (
              <div
                className="absolute border border-cyan-400 bg-cyan-500/15 backdrop-blur-[1px] rounded pointer-events-none z-50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                style={{ left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px` }}
              />
            );
          })()}

          {/* Quick Floating Arrowhead Bar for Selected Edge between Nodes */}
          {selectedEdge && !readOnly && !isExporting && (() => {
            const sNode = nodeMap.get(selectedEdge.source);
            const tNode = nodeMap.get(selectedEdge.target);
            if (!sNode || !tNode) return null;
            const { mx, my } = getAnchorPoints(sNode, tNode);
            const curMarker = selectedEdge.customStyle?.arrowMarker || 'arrow';

            return (
              <div
                data-interactive="true"
                data-export-exclude="true"
                className="absolute z-40 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-cyan-400/60 shadow-2xl pointer-events-auto text-xs whitespace-nowrap animate-in fade-in zoom-in-95"
                style={{ left: `${mx}px`, top: `${my - 28}px` }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-1.5 pl-1">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    Arrow Head:
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {ARROW_MARKER_CONFIG.map((m) => {
                    const isCurrent = curMarker === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          handleUpdateEdge(selectedEdge.id, {
                            customStyle: { ...(selectedEdge.customStyle || {}), arrowMarker: m.id },
                          })
                        }
                        className={`px-2 py-0.5 rounded-lg text-[0.65rem] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                        title={`Set Arrowhead: ${m.label}`}
                      >
                        {m.id === 'arrow' && '⟶ Single'}
                        {m.id === 'both' && '⟷ Dual'}
                        {m.id === 'triangle' && '▷ Triangle'}
                        {m.id === 'circle' && '● Circle'}
                        {m.id === 'diamond' && '◆ Diamond'}
                        {m.id === 'none' && '─ None'}
                      </button>
                    );
                  })}
                </div>
                <div className="border-l border-[var(--border-subtle)] pl-1 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const updatedEdges = (diagram.edges || []).map((e) =>
                        e.id === selectedEdge.id
                          ? { ...e, source: selectedEdge.target, target: selectedEdge.source }
                          : e
                      );
                      onUpdateDiagram({ ...diagram, edges: updatedEdges });
                    }}
                    className="p-1 rounded text-[var(--text-secondary)] hover:text-cyan-300 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                    title="Reverse Arrow Direction (⇄)"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEdge(selectedEdge.id)}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="Delete Connection"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Nodes Layer */}
          {nodesWithPositions.map((node) => {
            const isSelected = !isExporting && (selectedNodeId === node.id || selectedNodeIds.includes(node.id));
            const isSourceConnect = !isExporting && (connectSourceId === node.id || threadDrag?.sourceId === node.id);
            const isConnectTarget = !isExporting && (
              (connectSourceId !== null && connectSourceId !== node.id) ||
              (threadDrag !== null && threadDrag.sourceId !== node.id)
            );
            const isHoveredThreadTarget = !isExporting && threadHoverTargetId === node.id;
            const rawShape = (node.customStyle?.shape || 'card') as string;
            const shape: NodeShape =
              rawShape === 'sharp'
                ? 'rectangle'
                : ([
                    'card',
                    'rectangle',
                    'diamond',
                    'heart',
                    'cuboid',
                    'pill',
                    'hexagon',
                    'cylinder',
                    'glass',
                    'sticky',
                    'terminal',
                    'minimal',
                  ].includes(rawShape)
                    ? (rawShape as NodeShape)
                    : 'card');

            const defaultPalette = COLOR_PALETTES[(node.order ? node.order - 1 : 0) % COLOR_PALETTES.length];
            const borderColor = node.customStyle?.borderColor || defaultPalette.border;
            const rawBg = node.customStyle?.bgColor || defaultPalette.bg;
            const bgOpacity = node.customStyle?.bgOpacity !== undefined ? node.customStyle.bgOpacity : 100;
            const bgColor = computeRgbaBg(rawBg, bgOpacity);
            const textColor = node.customStyle?.textColor || (isLight ? '#0f172a' : defaultPalette.text);
            const subtextColor = node.customStyle?.subtextColor || (isLight ? '#475569' : '#94a3b8');
            const glowColor = node.customStyle?.glowColor || defaultPalette.glow;
            const borderWidth = node.customStyle?.borderWidth ?? 2;
            const borderStyle = node.customStyle?.borderStyle || 'solid';

            const fontSizeClass =
              node.customStyle?.fontSize === 'lg'
                ? 'text-base'
                : node.customStyle?.fontSize === 'md'
                ? 'text-sm'
                : node.customStyle?.fontSize === 'xs'
                ? 'text-[0.65rem]'
                : 'text-xs';

            const fontWeightClass =
              node.customStyle?.fontWeight === 'black'
                ? 'font-black'
                : node.customStyle?.fontWeight === 'normal'
                ? 'font-normal'
                : 'font-bold';

            const textAlignClass =
              node.customStyle?.textAlign === 'center'
                ? 'text-center'
                : node.customStyle?.textAlign === 'right'
                ? 'text-right'
                : 'text-left';

            const subfontSizeClass =
              node.customStyle?.subheadingFontSize === 'lg'
                ? 'text-[0.85rem]'
                : node.customStyle?.subheadingFontSize === 'md'
                ? 'text-[0.75rem]'
                : node.customStyle?.subheadingFontSize === 'xs'
                ? 'text-[0.60rem]'
                : 'text-[0.68rem]';

            const subfontWeightClass =
              node.customStyle?.subheadingFontWeight === 'bold'
                ? 'font-bold'
                : node.customStyle?.subheadingFontWeight === 'semibold'
                ? 'font-semibold'
                : node.customStyle?.subheadingFontWeight === 'medium'
                ? 'font-medium'
                : 'font-normal';

            const subfontStyleClass =
              node.customStyle?.subheadingStyle === 'italic'
                ? 'italic'
                : node.customStyle?.subheadingStyle === 'uppercase'
                ? 'uppercase tracking-wider'
                : '';

            const subtextAlignClass =
              node.customStyle?.subheadingTextAlign === 'center'
                ? 'text-center'
                : node.customStyle?.subheadingTextAlign === 'right'
                ? 'text-right'
                : node.customStyle?.subheadingTextAlign === 'left'
                ? 'text-left'
                : textAlignClass;

            const sublineClampClass =
              node.customStyle?.subheadingLines === 1
                ? 'line-clamp-1 truncate'
                : node.customStyle?.subheadingLines === 3
                ? 'line-clamp-3'
                : node.customStyle?.subheadingLines === 4
                ? 'line-clamp-4'
                : node.customStyle?.subheadingLines === 'all'
                ? 'overflow-visible'
                : 'line-clamp-2';

            const isSubheadingPill = node.customStyle?.subheadingPill === true;

            const w = node.width || (shape === 'pill' ? 210 : shape === 'heart' ? 220 : 230);
            const h = node.height || (shape === 'pill' ? 56 : shape === 'heart' ? 180 : 110);

            const isSvgContained = ['diamond', 'heart'].includes(shape);

            return (
              <div
                key={node.id}
                data-node-id="true"
                className="absolute transition-shadow cursor-move select-none"
                style={{
                  left: `${node.x || 0}px`,
                  top: `${node.y || 0}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  zIndex: isSelected ? 20 : 10,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  setSelectedNodeIds([node.id]);
                  setIsInspectorOpen(true);
                  setInlineEditing({ nodeId: node.id, field: 'label' });
                  setInlineTextValue(node.label);
                }}
              >
                {/* Floating Quick Action Bar on top of Selected Box */}
                {isSelected && !readOnly && (
                  <div
                    data-interactive="true"
                    className="absolute -top-11 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-amber-400/60 shadow-2xl pointer-events-auto text-xs whitespace-nowrap animate-in fade-in zoom-in-95"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* Quick Shapes */}
                    <div className="flex items-center gap-0.5 border-r border-[var(--border-subtle)] pr-1">
                      {(['card', 'diamond', 'heart', 'cuboid', 'rectangle', 'pill'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateNode(node.id, { customStyle: { ...(node.customStyle || {}), shape: s } })}
                          className={`px-1.5 py-0.5 rounded text-[0.68rem] transition-colors ${
                            shape === s
                              ? 'bg-amber-400 text-black font-bold'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                          }`}
                          title={`Change Shape: ${s}`}
                        >
                          {s === 'card' ? '🪪' : s === 'diamond' ? '💎' : s === 'heart' ? '❤️' : s === 'cuboid' ? '🧊' : s === 'rectangle' ? '▭' : '💊'}
                        </button>
                      ))}
                    </div>

                    {/* Quick Colors */}
                    <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] px-1">
                      {COLOR_PALETTES.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            handleUpdateNode(node.id, {
                              customStyle: {
                                ...(node.customStyle || {}),
                                borderColor: p.border,
                                bgColor: p.bg,
                                textColor: p.text,
                                glowColor: p.glow,
                              },
                            })
                          }
                          className="w-3.5 h-3.5 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer"
                          style={{ backgroundColor: p.border }}
                          title={`Color: ${p.name}`}
                        />
                      ))}
                    </div>

                    {/* Quick Size Controls */}
                    <div className="flex items-center gap-0.5 border-r border-[var(--border-subtle)] px-1">
                      <button
                        type="button"
                        onClick={() => handleScaleNodeSize(node.id, 0.85)}
                        className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                        title="Shrink Box (-15%)"
                      >
                        A-
                      </button>
                      {([
                        { id: 'S', w: 180, h: 80 },
                        { id: 'M', w: 230, h: 110 },
                        { id: 'L', w: 300, h: 140 },
                        { id: 'XL', w: 380, h: 180 },
                      ] as const).map((sz) => {
                        const isCurrent = Math.abs(w - sz.w) <= 15 && Math.abs(h - sz.h) <= 15;
                        return (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => handleSetNodePresetSize(node.id, sz.w, sz.h)}
                            className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-400 text-black font-extrabold shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                            title={`Set Size: ${sz.id} (${sz.w}×${sz.h}px)`}
                          >
                            {sz.id}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleScaleNodeSize(node.id, 1.15)}
                        className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                        title="Enlarge Box (+15%)"
                      >
                        A+
                      </button>
                    </div>

                    {/* ⚡ Instant Add Next Step (Whimsical / Miro Style Sprouting) */}
                    <button
                      type="button"
                      onClick={() => handleQuickAddNextStep(node.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer"
                      title="Add Next Connected Step (Tab)"
                    >
                      <Plus size={11} strokeWidth={3} className="text-amber-300" />
                      <span>Next Step</span>
                      <span className="text-[9px] opacity-60 font-mono">Tab</span>
                    </button>

                    {/* 1-Click Direct Connect Dropdown */}
                    {diagram.nodes.filter((n) => n.id !== node.id).length > 0 && (
                      <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-1 pl-0.5">
                        <Zap size={11} className="text-cyan-400 shrink-0" />
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleCreateEdge(node.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-cyan-400 rounded px-1.5 py-0.5 text-[0.68rem] focus:outline-none cursor-pointer max-w-[125px] truncate transition-colors"
                          title="1-Click Direct Connect To Another Box"
                        >
                          <option value="" disabled>Connect To... ▾</option>
                          {diagram.nodes
                            .filter((n) => n.id !== node.id)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                → {n.label?.replace(/<[^>]*>/g, '').trim().slice(0, 24) || n.id}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Link 2 Selected Boxes Button */}
                    {selectedNodeIds.length === 2 && selectedNodeIds.includes(node.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const otherId = selectedNodeIds.find((id) => id !== node.id);
                          if (otherId) handleCreateEdge(node.id, otherId);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.68rem] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors cursor-pointer"
                        title="Link the 2 selected boxes immediately"
                      >
                        <Zap size={10} /> Link 2 Boxes
                      </button>
                    )}

                    {/* Upload Image/Logo Quick Button */}
                    <label
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                      title={node.imageUrl ? 'Change Uploaded Image/Logo' : 'Upload Image/Logo to Box'}
                    >
                      <ImageIcon size={11} className={node.imageUrl ? 'text-cyan-400' : ''} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              if (base64) {
                                handleUpdateNode(node.id, { imageUrl: base64 });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {node.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleUpdateNode(node.id, { imageUrl: undefined })}
                        className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <X size={11} />
                      </button>
                    )}

                    {/* Edit Inspector Focus */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setIsInspectorOpen(true);
                      }}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                      title="Edit Box Text & Styling"
                    >
                      <Edit3 size={11} />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateNode(node.id)}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                      title="Duplicate Box"
                    >
                      <Copy size={11} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id)}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                      title="Delete Box"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}

                {/* Node Box Wrapper */}
                <div
                  className={`w-full h-full relative transition-all duration-150 flex flex-col justify-between overflow-hidden group/box ${
                    isSelected
                      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-2xl scale-[1.01]'
                      : isHoveredThreadTarget
                      ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-2xl shadow-emerald-500/50 scale-[1.03] animate-pulse cursor-pointer'
                      : isSourceConnect
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-xl animate-pulse'
                      : isConnectTarget
                      ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-xl shadow-emerald-500/25 animate-pulse cursor-pointer hover:scale-[1.02]'
                      : 'hover:shadow-lg'
                  }`}
                  style={{
                    backgroundColor: isSvgContained ? 'transparent' : bgColor,
                    borderColor: isSvgContained ? 'transparent' : borderColor,
                    borderWidth: isSvgContained ? '0px' : `${borderWidth}px`,
                    borderStyle: borderStyle,
                    borderRadius:
                      shape === 'pill'
                        ? '9999px'
                        : shape === 'rectangle'
                        ? '2px'
                        : isSvgContained
                        ? '0px'
                        : shape === 'cuboid'
                        ? '4px'
                        : shape === 'sticky'
                        ? '2px'
                        : shape === 'minimal'
                        ? '6px'
                        : '14px',
                    boxShadow: isSelected
                      ? `0 0 24px ${glowColor}`
                      : node.customStyle?.shadow === 'glow'
                      ? `0 0 16px ${glowColor}`
                      : undefined,
                    backdropFilter: shape === 'glass' ? 'blur(12px)' : undefined,
                  }}
                >
                  {/* Connect Target Overlay Badge */}
                  {isConnectTarget && !readOnly && !isExporting && (
                    <div className="absolute inset-0 z-40 bg-emerald-950/25 backdrop-blur-[0.5px] rounded-[inherit] flex items-center justify-center pointer-events-none transition-all">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[0.72rem] font-bold shadow-lg border border-emerald-400 animate-pulse tracking-wide select-none ${
                          isHoveredThreadTarget
                            ? 'bg-emerald-500 text-slate-950 scale-110 shadow-emerald-500/50 ring-2 ring-emerald-300'
                            : 'bg-emerald-600'
                        }`}
                      >
                        <Zap size={12} className={isHoveredThreadTarget ? 'fill-slate-950 text-slate-950 animate-bounce' : 'text-white'} />
                        {isHoveredThreadTarget ? 'Release to Connect Thread!' : 'Click or Drop Thread'}
                      </span>
                    </div>
                  )}

                  {/* Dedicated Pen Edit Button on Every Box (Appears on Hover Only, Excluded on Export) */}
                  {!readOnly && !isExporting && (
                    <button
                      type="button"
                      data-interactive="true"
                      data-export-exclude="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setIsInspectorOpen(true);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`absolute top-2 right-2 z-30 p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer shadow-sm opacity-0 pointer-events-none group-hover/box:opacity-100 group-hover/box:pointer-events-auto hover:scale-110 bg-black/60 hover:bg-amber-400 text-white hover:text-black dark:bg-zinc-800/90 dark:hover:bg-amber-400 dark:hover:text-black border border-white/20 hover:border-amber-400 ${
                        isSelected && isInspectorOpen
                          ? 'opacity-100 pointer-events-auto bg-amber-400 text-black scale-105 ring-2 ring-amber-300'
                          : ''
                      }`}
                      title="Edit Box (Click pen to edit text, styling, shapes & colors)"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}

                  {/* Direct In-Place Inline Text Editor Overlay (Figma-Style) */}
                  {inlineEditing?.nodeId === node.id && (
                    <div
                      data-interactive="true"
                      className="absolute inset-0 z-40 p-2.5 bg-[var(--bg-surface)]/98 backdrop-blur-xl rounded-xl flex flex-col justify-between gap-1 shadow-2xl animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                        <span className="text-[0.6rem] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                          <Edit3 size={10} /> Edit Stage
                        </span>
                        <span className="text-[0.55rem] text-[var(--text-muted)] font-mono">Enter ↵ saves</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 justify-center">
                        <input
                          type="text"
                          value={inlineTextValue}
                          autoFocus
                          placeholder="Stage Title..."
                          onChange={(e) => setInlineTextValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const subInput = document.getElementById(`inline-sub-${node.id}`) as HTMLInputElement;
                              handleUpdateNode(node.id, {
                                label: inlineTextValue.trim() || node.label,
                                sublabel: subInput ? subInput.value : node.sublabel,
                              });
                              setInlineEditing(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setInlineEditing(null);
                            }
                          }}
                          className="w-full text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-primary)] px-2 py-1 rounded-lg border border-cyan-400 outline-none ring-2 ring-cyan-400/30"
                        />
                        <input
                          type="text"
                          defaultValue={node.sublabel || ''}
                          placeholder="Description (optional)..."
                          id={`inline-sub-${node.id}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const sub = (e.target as HTMLInputElement).value;
                              handleUpdateNode(node.id, {
                                label: inlineTextValue.trim() || node.label,
                                sublabel: sub,
                              });
                              setInlineEditing(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setInlineEditing(null);
                            }
                          }}
                          className="w-full text-[0.68rem] text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-1 rounded-lg border border-[var(--border-subtle)] focus:border-cyan-400 outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setInlineEditing(null)}
                          className="px-2 py-0.5 rounded text-[0.62rem] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const subInput = document.getElementById(`inline-sub-${node.id}`) as HTMLInputElement;
                            handleUpdateNode(node.id, {
                              label: inlineTextValue.trim() || node.label,
                              sublabel: subInput ? subInput.value : node.sublabel,
                            });
                            setInlineEditing(null);
                          }}
                          className="px-2.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[0.65rem] flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Check size={11} /> Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shape 1: Modern Card */}
                  {shape === 'card' && (
                    <>
                      <div
                        className="h-1.5 w-full shrink-0"
                        style={{ backgroundColor: borderColor }}
                      />
                      <div className={`p-3 flex-1 flex flex-col justify-between min-h-0 ${textAlignClass}`}>
                        <div className="flex items-start justify-between gap-1.5 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            {node.imageUrl && (
                              <img
                                src={node.imageUrl}
                                alt=""
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md object-contain shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs"
                              />
                            )}
                            <span
                              className={`${fontWeightClass} ${fontSizeClass} truncate leading-tight`}
                              style={{ color: textColor }}
                            >
                              {node.label}
                            </span>
                          </div>
                          {node.badge && (
                            <span
                              className="shrink-0 text-[0.62rem] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono"
                              style={{
                                backgroundColor: node.customStyle?.glowColor || 'rgba(255,255,255,0.1)',
                                color: textColor,
                              }}
                            >
                              {node.badge}
                            </span>
                          )}
                        </div>
                        {node.sublabel && (
                          <p
                            className={`${subfontSizeClass} ${subfontWeightClass} ${subfontStyleClass} ${subtextAlignClass} ${sublineClampClass} mt-1 leading-snug w-full ${
                              isSubheadingPill ? 'px-2 py-0.5 rounded bg-white/10 dark:bg-black/25 border border-white/10' : ''
                            }`}
                            style={{ color: subtextColor }}
                          >
                            {node.sublabel}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Shape 2: Pure Rectangle */}
                  {shape === 'rectangle' && (
                    <div className={`p-3 flex flex-col justify-between h-full border-t-2 ${textAlignClass}`} style={{ borderTopColor: borderColor }}>
                      <div className="flex items-start justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          {node.imageUrl && (
                            <img
                              src={node.imageUrl}
                              alt=""
                              className="w-6 h-6 rounded-none object-contain shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs"
                            />
                          )}
                          <span
                            className={`${fontWeightClass} ${fontSizeClass} tracking-tight truncate leading-tight`}
                            style={{ color: textColor }}
                          >
                            {node.label}
                          </span>
                        </div>
                        {node.badge && (
                          <span
                            className="shrink-0 font-mono text-[0.6rem] font-bold px-1 py-0.5 border"
                            style={{ borderColor: borderColor, color: textColor }}
                          >
                            {node.badge}
                          </span>
                        )}
                      </div>
                      {node.sublabel && (
                        <p
                          className={`${subfontSizeClass} ${subfontWeightClass} ${subfontStyleClass} ${subtextAlignClass} ${sublineClampClass} mt-1 leading-snug w-full font-mono ${
                            isSubheadingPill ? 'px-2 py-0.5 rounded bg-white/10 dark:bg-black/25 border border-white/10' : ''
                          }`}
                          style={{ color: subtextColor }}
                        >
                          {node.sublabel}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Shape 3: Diamond Rhombus Decision Gate */}
                  {shape === 'diamond' && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 text-center overflow-hidden">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                          points="50 4, 96 50, 50 96, 4 50"
                          fill={bgColor}
                          stroke={borderColor}
                          strokeWidth={borderWidth * 0.8}
                          strokeDasharray={borderStyle === 'dashed' ? '4 3' : borderStyle === 'dotted' ? '2 2' : 'none'}
                        />
                      </svg>
                      <div className="relative z-10 flex flex-col items-center justify-center max-w-[70%]">
                        {node.imageUrl && (
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-contain mb-1 shadow-sm shrink-0 bg-black/20 p-0.5 border border-white/20"
                          />
                        )}
                        <span
                          className={`${fontWeightClass} ${fontSizeClass} leading-tight break-words max-w-full`}
                          style={{ color: textColor }}
                        >
                          {node.label}
                        </span>
                        {node.sublabel && (
                          <span
                            className={`${subfontSizeClass} ${subfontWeightClass} ${subfontStyleClass} ${subtextAlignClass} ${sublineClampClass} max-w-full mt-0.5 ${
                              isSubheadingPill ? 'px-1.5 py-0.5 rounded bg-white/10 dark:bg-black/25 border border-white/10' : ''
                            }`}
                            style={{ color: subtextColor }}
                          >
                            {node.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shape 4: Heart Shape ❤️ */}
                  {shape === 'heart' && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 text-center overflow-hidden">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d="M 50,88 C 20,68 6,48 6,28 C 6,14 17,4 30,4 C 38,4 46,9 50,16 C 54,9 62,4 70,4 C 83,4 94,14 94,28 C 94,48 80,68 50,88 Z"
                          fill={bgColor}
                          stroke={borderColor}
                          strokeWidth={borderWidth * 0.8}
                          strokeDasharray={borderStyle === 'dashed' ? '4 3' : borderStyle === 'dotted' ? '2 2' : 'none'}
                        />
                      </svg>
                      <div className="relative z-10 flex flex-col items-center justify-center max-w-[72%] pt-1">
                        {node.imageUrl && (
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-contain mb-1 shadow-sm shrink-0 bg-black/20 p-0.5 border border-white/20"
                          />
                        )}
                        <span
                          className={`${fontWeightClass} ${fontSizeClass} leading-tight break-words max-w-full`}
                          style={{ color: textColor }}
                        >
                          {node.label}
                        </span>
                        {node.sublabel && (
                          <span
                            className={`${subfontSizeClass} ${subfontWeightClass} ${subfontStyleClass} ${subtextAlignClass} ${sublineClampClass} max-w-full mt-0.5 ${
                              isSubheadingPill ? 'px-1.5 py-0.5 rounded bg-white/10 dark:bg-black/25 border border-white/10' : ''
                            }`}
                            style={{ color: subtextColor }}
                          >
                            {node.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shape 5: 3D Isometric Cuboid 🧊 */}
                  {shape === 'cuboid' && (
                    <div className={`relative w-full h-full flex flex-col justify-between p-3 overflow-hidden ${textAlignClass}`}>
                      {/* Top Isometric Plane */}
                      <div
                        className="absolute top-0 left-0 right-0 h-3.5 border-b opacity-85"
                        style={{
                          backgroundColor: borderColor,
                          clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
                          filter: 'brightness(1.25)',
                        }}
                      />
                      {/* Right Isometric Plane */}
                      <div
                        className="absolute top-0 right-0 bottom-0 w-3 border-l opacity-70"
                        style={{
                          backgroundColor: borderColor,
                          clipPath: 'polygon(0% 100%, 0% 14px, 100% 0%, 100% calc(100% - 14px))',
                          filter: 'brightness(0.75)',
                        }}
                      />
                      {/* Front Face Content */}
                      <div className="pt-2 flex items-start justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          {node.imageUrl && (
                            <img
                              src={node.imageUrl}
                              alt=""
                              className="w-6 h-6 rounded-md object-contain shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs"
                            />
                          )}
                          <span
                            className={`${fontWeightClass} ${fontSizeClass} truncate`} style={{ color: textColor }}
                          >
                            {node.label}
                          </span>
                        </div>
                        {node.badge && (
                          <span
                            className="shrink-0 text-[0.6rem] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase mr-2"
                            style={{ backgroundColor: borderColor, color: '#ffffff' }}
                          >
                            {node.badge}
                          </span>
                        )}
                      </div>
                      {node.sublabel && (
                        <p className="text-[0.68rem] line-clamp-2 mt-1 leading-snug pr-3 w-full" style={{ color: subtextColor }}>
                          {node.sublabel}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Shape 6: Capsule Pill */}
                  {shape === 'pill' && (
                    <div className="px-4 py-2 flex items-center justify-between gap-2.5 h-full">
                      <div className="flex items-center gap-2 min-w-0">
                        {node.imageUrl && (
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-contain shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs"
                          />
                        )}
                        <span className={`${fontWeightClass} ${fontSizeClass} truncate`} style={{ color: textColor }}>
                          {node.label}
                        </span>
                      </div>
                      {node.badge && (
                        <span
                          className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: borderColor, color: '#ffffff' }}
                        >
                          {node.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Shape 7: Sticky Note with Pin 📌 */}
                  {shape === 'sticky' && (
                    <div className={`relative p-3.5 flex flex-col justify-between h-full shadow-md ${textAlignClass}`}>
                      {/* Top Pin Dot */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white dark:border-black shadow-sm" />
                      <div className="pt-2">
                        <span
                          className={`${fontWeightClass} ${fontSizeClass} block truncate leading-tight`}
                          style={{ color: textColor }}
                        >
                          {node.label}
                        </span>
                        {node.sublabel && (
                          <p className="text-[0.7rem] line-clamp-3 mt-1 leading-relaxed opacity-85" style={{ color: subtextColor }}>
                            {node.sublabel}
                          </p>
                        )}
                      </div>
                      {/* Folded Corner at bottom right */}
                      <div
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-black/20 dark:bg-white/20"
                        style={{ clipPath: 'polygon(0% 100%, 100% 0%, 100% 100%)' }}
                      />
                    </div>
                  )}

                  {/* Shape 8: Code Terminal Console 💻 */}
                  {shape === 'terminal' && (
                    <div className="flex flex-col justify-between h-full bg-[#18181b] border border-neutral-700/80 rounded-lg overflow-hidden font-mono shadow-xl">
                      <div className="h-5 px-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-[0.55rem] text-neutral-400 truncate">bash ~ bbot</span>
                        {node.badge && <span className="text-[0.55rem] text-amber-400 font-bold">{node.badge}</span>}
                      </div>
                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-emerald-400 text-[0.68rem] font-bold">
                            <span>&gt;_</span>
                            <span className="truncate" style={{ color: textColor }}>{node.label}</span>
                          </div>
                          {node.sublabel && (
                            <p className="text-[0.62rem] text-neutral-400 line-clamp-2 mt-1 font-mono">
                              # {node.sublabel}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[0.58rem] text-neutral-500 pt-1 border-t border-neutral-800">
                          <span>status: 200 OK</span>
                          {node.imageUrl && (
                            <img src={node.imageUrl} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shape 9: Minimalist Outline ▫️ */}
                  {shape === 'minimal' && (
                    <div className={`p-3 flex flex-col justify-between h-full ${textAlignClass}`}>
                      <div className="flex items-start justify-between gap-1 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          {node.imageUrl && (
                            <img src={node.imageUrl} alt="" className="w-5 h-5 rounded object-contain shrink-0 bg-black/20 p-0.5 border border-white/20" />
                          )}
                          <span
                            className={`${fontWeightClass} ${fontSizeClass} tracking-tight truncate leading-tight`}
                            style={{ color: textColor }}
                          >
                            {node.label}
                          </span>
                        </div>
                        {node.badge && (
                          <span className="text-[0.6rem] font-mono opacity-60">[{node.badge}]</span>
                        )}
                      </div>
                      {node.sublabel && (
                        <p className="text-[0.68rem] opacity-75 line-clamp-2 mt-1 w-full" style={{ color: subtextColor }}>
                          {node.sublabel}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Shape 10: 3D Cylinder Database */}
                  {shape === 'cylinder' && (
                    <div className={`p-2.5 flex flex-col justify-between h-full ${textAlignClass}`}>
                      <div
                        className="h-3 w-full rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: borderColor }}
                      />
                      <div className="py-1 text-center w-full flex flex-col items-center">
                        {node.imageUrl && (
                          <img src={node.imageUrl} alt="" className="w-6 h-6 rounded-md object-contain mb-1 shrink-0 bg-black/20 p-0.5 border border-white/20" />
                        )}
                        <span className={`${fontWeightClass} ${fontSizeClass} block truncate`} style={{ color: textColor }}>
                          {node.label}
                        </span>
                        <span className="text-[0.65rem] opacity-75 block truncate" style={{ color: subtextColor }}>
                          {node.sublabel || 'Data Store'}
                        </span>
                      </div>
                      <div
                        className="h-2 w-full rounded-b-full opacity-60 shrink-0"
                        style={{ backgroundColor: borderColor }}
                      />
                    </div>
                  )}

                  {/* Shape 11: Frosted Glass */}
                  {shape === 'glass' && (
                    <div className={`p-3 flex flex-col justify-between h-full ${textAlignClass}`}>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          {node.imageUrl && (
                            <img src={node.imageUrl} alt="" className="w-6 h-6 rounded-md object-contain shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs" />
                          )}
                          <span className={`${fontWeightClass} ${fontSizeClass} truncate`} style={{ color: textColor }}>
                            {node.label}
                          </span>
                        </div>
                        {node.badge && (
                          <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white">
                            {node.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.65rem] opacity-80 line-clamp-2 mt-1 w-full" style={{ color: subtextColor }}>
                        {node.sublabel || 'Glassmorphism Module'}
                      </p>
                    </div>
                  )}

                  {/* Shape 12: Hexagon Core Hub */}
                  {shape === 'hexagon' && (
                    <div className="p-2.5 flex flex-col items-center justify-center text-center h-full">
                      {node.imageUrl && (
                        <img src={node.imageUrl} alt="" className="w-6 h-6 rounded-md object-contain mb-1 shrink-0 bg-black/20 p-0.5 border border-white/20 shadow-xs" />
                      )}
                      <span className={`${fontWeightClass} ${fontSizeClass} truncate w-full`} style={{ color: textColor }}>
                        {node.label}
                      </span>
                      {node.sublabel && (
                        <span className="text-[0.62rem] opacity-80 truncate w-full" style={{ color: subtextColor }}>
                          {node.sublabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Dedicated Thread Connector Cord & Bead (Taar per Box) */}
                {!readOnly && !isExporting && (
                  <div
                    data-interactive="true"
                    onMouseDown={(e) => handleThreadStart(node, e, 'right')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectSourceId(node.id);
                    }}
                    className={`absolute -right-4 top-1/2 -translate-y-1/2 flex items-center cursor-grab active:cursor-grabbing z-30 group/thread select-none transition-all ${
                      isSelected || isSourceConnect
                        ? 'opacity-100 scale-110'
                        : 'opacity-75 group-hover/box:opacity-100 hover:opacity-100 hover:scale-125'
                    }`}
                    title="🧵 Drag thread to connect to another box (or click to pick target)"
                  >
                    {/* Micro flexible wire cord connecting from box border to thread plug */}
                    <div className="w-2.5 h-1 bg-cyan-400 group-hover/thread:bg-cyan-300 rounded-l shadow-sm" />

                    {/* Glowing Thread Plug Bead */}
                    <div className="relative w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 via-cyan-500 to-emerald-400 border-2 border-white dark:border-slate-900 shadow-md flex items-center justify-center transition-transform hover:scale-110">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping opacity-60 absolute" />
                      <Zap size={10} className="text-white fill-white relative z-10" />
                    </div>

                    {/* Floating tooltip on hover */}
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/95 text-cyan-300 text-[0.62rem] font-bold shadow-xl border border-cyan-400/40 pointer-events-none opacity-0 group-hover/thread:opacity-100 transition-opacity whitespace-nowrap z-50">
                      🧵 Drag thread to connect
                    </div>
                  </div>
                )}

                {/* Connection Handles (4 cardinal anchor points: Top, Right, Bottom, Left) */}
                {!readOnly && !isExporting && (
                  <>
                    {/* Top Anchor Handle */}
                    <button
                      type="button"
                      data-interactive="true"
                      onMouseDown={(e) => handleThreadStart(node, e, 'top')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectSourceId(node.id);
                      }}
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-500 hover:bg-cyan-400 border-2 border-white dark:border-slate-900 ${
                        isSelected ? 'opacity-100 scale-100 shadow-md shadow-cyan-500/50 ring-2 ring-cyan-400/40' : 'opacity-0 group-hover:opacity-100'
                      } hover:opacity-100 hover:scale-125 transition-all shadow-md flex items-center justify-center cursor-crosshair z-30`}
                      title="Drag thread from Top"
                    >
                      <Plus size={10} className="text-white" strokeWidth={3} />
                    </button>

                    {/* Right Anchor Handle */}
                    <button
                      type="button"
                      data-interactive="true"
                      onMouseDown={(e) => handleThreadStart(node, e, 'right')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectSourceId(node.id);
                      }}
                      className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cyan-500 hover:bg-cyan-400 border-2 border-white dark:border-slate-900 ${
                        isSelected ? 'opacity-100 scale-100 shadow-md shadow-cyan-500/50 ring-2 ring-cyan-400/40' : 'opacity-0 group-hover:opacity-100'
                      } hover:opacity-100 hover:scale-125 transition-all shadow-md flex items-center justify-center cursor-crosshair z-30`}
                      title="Drag thread from Right"
                    >
                      <Plus size={10} className="text-white" strokeWidth={3} />
                    </button>

                    {/* Bottom Anchor Handle */}
                    <button
                      type="button"
                      data-interactive="true"
                      onMouseDown={(e) => handleThreadStart(node, e, 'bottom')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectSourceId(node.id);
                      }}
                      className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-500 hover:bg-cyan-400 border-2 border-white dark:border-slate-900 ${
                        isSelected ? 'opacity-100 scale-100 shadow-md shadow-cyan-500/50 ring-2 ring-cyan-400/40' : 'opacity-0 group-hover:opacity-100'
                      } hover:opacity-100 hover:scale-125 transition-all shadow-md flex items-center justify-center cursor-crosshair z-30`}
                      title="Drag thread from Bottom"
                    >
                      <Plus size={10} className="text-white" strokeWidth={3} />
                    </button>

                    {/* Left Anchor Handle */}
                    <button
                      type="button"
                      data-interactive="true"
                      onMouseDown={(e) => handleThreadStart(node, e, 'left')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectSourceId(node.id);
                      }}
                      className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cyan-500 hover:bg-cyan-400 border-2 border-white dark:border-slate-900 ${
                        isSelected ? 'opacity-100 scale-100 shadow-md shadow-cyan-500/50 ring-2 ring-cyan-400/40' : 'opacity-0 group-hover:opacity-100'
                      } hover:opacity-100 hover:scale-125 transition-all shadow-md flex items-center justify-center cursor-crosshair z-30`}
                      title="Drag thread from Left"
                    >
                      <Plus size={10} className="text-white" strokeWidth={3} />
                    </button>
                  </>
                )}

                {/* Drag-to-Resize Handles (Visible when selected & not read-only) */}
                {isSelected && !readOnly && (
                  <>
                    {/* Bottom-Right Corner Handle (Dual axis resize) */}
                    <div
                      data-interactive="true"
                      onMouseDown={(e) => handleResizeStart(e, node, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 shadow-md cursor-se-resize z-50 transition-transform hover:scale-125 flex items-center justify-center select-none"
                      title="Drag to resize width and height"
                    >
                      <div className="w-1 h-1 rounded-full bg-black/70 pointer-events-none" />
                    </div>

                    {/* Right Edge Handle (Horizontal width resize) */}
                    <div
                      data-interactive="true"
                      onMouseDown={(e) => handleResizeStart(e, node, 'e')}
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-6 rounded-full bg-amber-400 border border-slate-900 shadow-sm cursor-ew-resize z-50 transition-transform hover:scale-125 select-none"
                      title="Drag to resize width"
                    />

                    {/* Bottom Edge Handle (Vertical height resize) */}
                    <div
                      data-interactive="true"
                      onMouseDown={(e) => handleResizeStart(e, node, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2 w-6 rounded-full bg-amber-400 border border-slate-900 shadow-sm cursor-ns-resize z-50 transition-transform hover:scale-125 select-none"
                      title="Drag to resize height"
                    />

                    {/* Live Size Indicator Tag while Resizing */}
                    {resizingNodeId === node.id && (
                      <div
                        data-interactive="true"
                        className="absolute -bottom-7 right-0 px-1.5 py-0.5 rounded bg-black/90 text-amber-300 font-mono text-[0.62rem] font-bold shadow-lg border border-amber-400/40 pointer-events-none z-50 whitespace-nowrap"
                      >
                        {Math.round(w)} × {Math.round(h)} px
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Empty Canvas Starter Banner */}
          {nodesWithPositions.length === 0 && (
            <div className="absolute left-[350px] top-[220px] flex flex-col items-center justify-center pointer-events-auto p-4 z-30">
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] shadow-2xl text-center w-80">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Canvas is Empty</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 mb-4 leading-relaxed">
                  Start clean with a 4-box pipeline structure, or add your first box.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyBasicTemplate('pipeline')}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-bold text-xs transition-all shadow-sm"
                  >
                    🚀 Load Simple Template (4 Boxes)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNode()}
                    className="w-full py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-hover)] text-xs text-[var(--text-secondary)] font-semibold transition-all"
                  >
                    + Add Box
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Inspector Panel for Selected Node */}
      {selectedNode && isInspectorOpen && !readOnly && !isExporting && (
        <div
          data-interactive="true"
          className="absolute right-4 top-16 bottom-4 w-80 max-w-[calc(100vw-2rem)] z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200"
        >
          {/* Header */}
          <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-amber-400" />
              <span className="font-bold text-xs text-[var(--text-primary)]">Box Inspector & Styling</span>
            </div>
            <button
              type="button"
              onClick={() => setIsInspectorOpen(false)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
              title="Close Panel"
            >
              <X size={13} />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Section 1: Box Title, Subtitle & Text Styling */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider">
                <Type size={12} className="text-cyan-400" />
                <span>Text Content & Typography</span>
              </div>
              {/* Box Title (Header) */}
              <div>
                <span className="text-[0.62rem] text-[var(--text-muted)] block mb-0.5 font-semibold">Box Title (Header)</span>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => handleUpdateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-amber-400"
                  placeholder="Stage title..."
                />
              </div>

              {/* Title Typography Controls */}
              <div className="pt-0.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Title Size</span>
                    <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => {
                        const isCurrent = (selectedNode.customStyle?.fontSize || 'xs') === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), fontSize: size },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] font-bold uppercase transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs font-black'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Title Weight</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      {(['normal', 'bold', 'black'] as const).map((weight) => {
                        const isCurrent = (selectedNode.customStyle?.fontWeight || 'bold') === weight;
                        return (
                          <button
                            key={weight}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), fontWeight: weight },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs font-black'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                            }`}
                          >
                            {weight === 'black' ? 'Black' : weight === 'bold' ? 'Bold' : 'Norm'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Title Alignment</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      {(['left', 'center', 'right'] as const).map((align) => {
                        const isCurrent = (selectedNode.customStyle?.textAlign || 'left') === align;
                        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                        return (
                          <button
                            key={align}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), textAlign: align },
                              })
                            }
                            className={`py-1 flex items-center justify-center rounded transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={`Align ${align}`}
                          >
                            <Icon size={11} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Title Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={toHexColor(selectedNode.customStyle?.textColor, '#ffffff')}
                        onChange={(e) =>
                          handleUpdateNode(selectedNode.id, {
                            customStyle: { ...(selectedNode.customStyle || {}), textColor: e.target.value },
                          })
                        }
                        className="w-6 h-6 rounded-md cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                        title="Title Color"
                      />
                      <input
                        type="text"
                        value={selectedNode.customStyle?.textColor || ''}
                        onChange={(e) =>
                          handleUpdateNode(selectedNode.id, {
                            customStyle: { ...(selectedNode.customStyle || {}), textColor: e.target.value },
                          })
                        }
                        placeholder="#ffffff"
                        className="w-full px-1.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.62rem] font-mono text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Subheading / Subtitle Dedicated Granular Controls */}
              <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 space-y-2.5 mt-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[0.68rem] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Type size={12} className="text-amber-400" />
                    <span>Detail / Subheading Settings</span>
                  </span>
                  {selectedNode.sublabel && (
                    <button
                      type="button"
                      onClick={() => handleUpdateNode(selectedNode.id, { sublabel: '' })}
                      className="text-[0.58rem] text-rose-400 hover:underline cursor-pointer"
                      title="Clear subtitle text"
                    >
                      Clear Text
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[0.6rem] text-[var(--text-muted)] block mb-0.5 font-medium">Subtitle Content Text</span>
                  <textarea
                    value={selectedNode.sublabel || ''}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { sublabel: e.target.value })}
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[0.7rem] text-[var(--text-primary)] focus:outline-none focus:border-amber-400 resize-none font-normal"
                    placeholder="Enter subtitle notes, metrics, or description..."
                  />
                </div>

                {/* Subheading Font Size & Font Weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Sub Font Size</span>
                    <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => {
                        const isCurrent = (selectedNode.customStyle?.subheadingFontSize || 'sm') === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), subheadingFontSize: size },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] font-bold uppercase transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs font-black'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={`Font size: ${size === 'xs' ? '10px' : size === 'sm' ? '11px' : size === 'md' ? '12px' : '14px'}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Sub Weight</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {(['normal', 'medium', 'bold'] as const).map((weight) => {
                        const isCurrent = (selectedNode.customStyle?.subheadingFontWeight || 'normal') === weight;
                        return (
                          <button
                            key={weight}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), subheadingFontWeight: weight },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs font-bold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {weight === 'bold' ? 'Bold' : weight === 'medium' ? 'Med' : 'Norm'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Subheading Alignment & Style (Italic / Caps) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Sub Alignment</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {(['left', 'center', 'right'] as const).map((align) => {
                        const isCurrent = (selectedNode.customStyle?.subheadingTextAlign || selectedNode.customStyle?.textAlign || 'left') === align;
                        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                        return (
                          <button
                            key={align}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), subheadingTextAlign: align },
                              })
                            }
                            className={`py-1 flex items-center justify-center rounded transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={`Align subtitle ${align}`}
                          >
                            <Icon size={11} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Sub Font Style</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {(['normal', 'italic', 'uppercase'] as const).map((st) => {
                        const isCurrent = (selectedNode.customStyle?.subheadingStyle || 'normal') === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), subheadingStyle: st },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] font-bold transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {st === 'italic' ? <span className="flex items-center justify-center"><Italic size={11} /></span> : st === 'uppercase' ? 'CAPS' : 'Norm'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Subheading Color & Line Truncation */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Sub Text Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={toHexColor(selectedNode.customStyle?.subtextColor, '#94a3b8')}
                        onChange={(e) =>
                          handleUpdateNode(selectedNode.id, {
                            customStyle: { ...(selectedNode.customStyle || {}), subtextColor: e.target.value },
                          })
                        }
                        className="w-6 h-6 rounded-md cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                        title="Pick Subtitle Color"
                      />
                      <input
                        type="text"
                        value={selectedNode.customStyle?.subtextColor || ''}
                        onChange={(e) =>
                          handleUpdateNode(selectedNode.id, {
                            customStyle: { ...(selectedNode.customStyle || {}), subtextColor: e.target.value },
                          })
                        }
                        placeholder="#94a3b8"
                        className="w-full px-1.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[0.62rem] font-mono text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Max Lines</span>
                    <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {([1, 2, 3, 'all'] as const).map((lines) => {
                        const isCurrent = (selectedNode.customStyle?.subheadingLines || 2) === lines;
                        return (
                          <button
                            key={lines}
                            type="button"
                            onClick={() =>
                              handleUpdateNode(selectedNode.id, {
                                customStyle: { ...(selectedNode.customStyle || {}), subheadingLines: lines },
                              })
                            }
                            className={`py-0.5 rounded text-[0.58rem] font-bold transition-all ${
                              isCurrent
                                ? 'bg-amber-400 text-black shadow-xs font-black'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={lines === 'all' ? 'No limit / Full Text' : `${lines} lines`}
                          >
                            {lines === 'all' ? 'All' : `${lines}L`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Subheading Pill Tag Frame Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60">
                  <div>
                    <span className="text-[0.62rem] font-semibold text-[var(--text-primary)] block">Pill Tag Frame</span>
                    <span className="text-[0.55rem] text-[var(--text-muted)] block">Display subtitle in a rounded badge pill</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: {
                          ...(selectedNode.customStyle || {}),
                          subheadingPill: !selectedNode.customStyle?.subheadingPill,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[0.62rem] font-bold transition-all cursor-pointer ${
                      selectedNode.customStyle?.subheadingPill
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {selectedNode.customStyle?.subheadingPill ? '✓ Enabled' : 'Off'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Box Shape Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block">
                  Box Shape & Style (12 Shapes)
                </label>
                <span className="text-[0.6rem] text-amber-400 font-mono">
                  {SHAPES_CONFIG.find((s) => s.id === (selectedNode.customStyle?.shape || 'card'))?.emoji}{' '}
                  {SHAPES_CONFIG.find((s) => s.id === (selectedNode.customStyle?.shape || 'card'))?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                {SHAPES_CONFIG.map((s) => {
                  const isCurrent = (selectedNode.customStyle?.shape || 'card') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        handleUpdateNode(selectedNode.id, {
                          customStyle: { ...(selectedNode.customStyle || {}), shape: s.id },
                        })
                      }
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm ring-1 ring-amber-400'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40'
                      }`}
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-[0.68rem] font-bold truncate leading-tight">{s.label}</div>
                        <div className="text-[0.58rem] opacity-70 truncate">{s.iconLabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Custom Colors & Fill ("Apni Marzi Jo Colour Karna Hai") */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider">
                <Palette size={12} className="text-amber-400" />
                <span>Custom Colors & Fill</span>
              </div>

              {/* Background Color & Opacity Slider */}
              <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-bold text-[var(--text-primary)]">Background Fill</span>
                  <span className="text-[0.6rem] font-mono text-[var(--text-muted)]">
                    Opacity: {selectedNode.customStyle?.bgOpacity !== undefined ? selectedNode.customStyle.bgOpacity : 100}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(selectedNode.customStyle?.bgColor, '#06b6d4')}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), bgColor: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                    title="Pick Background Color"
                  />
                  <input
                    type="text"
                    value={selectedNode.customStyle?.bgColor || ''}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), bgColor: e.target.value },
                      })
                    }
                    placeholder="#06b6d4 / rgba(...)"
                    className="flex-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                {/* Opacity Slider */}
                <div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedNode.customStyle?.bgOpacity !== undefined ? selectedNode.customStyle.bgOpacity : 100}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), bgOpacity: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-amber-400 cursor-pointer h-1.5"
                  />
                </div>
              </div>

              {/* Border Color, Width & Style */}
              <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 space-y-2">
                <span className="text-[0.65rem] font-bold text-[var(--text-primary)] block">Border Outline</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(selectedNode.customStyle?.borderColor, '#06b6d4')}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), borderColor: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                    title="Pick Border Color"
                  />
                  <input
                    type="text"
                    value={selectedNode.customStyle?.borderColor || ''}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), borderColor: e.target.value },
                      })
                    }
                    placeholder="#06b6d4"
                    className="flex-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Width</span>
                    <select
                      value={selectedNode.customStyle?.borderWidth || 2}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          customStyle: { ...(selectedNode.customStyle || {}), borderWidth: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.68rem] text-[var(--text-primary)]"
                    >
                      <option value={1}>1px (Fine)</option>
                      <option value={2}>2px (Standard)</option>
                      <option value={3}>3px (Bold)</option>
                      <option value={4}>4px (Heavy)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[0.6rem] text-[var(--text-muted)] block mb-1">Style</span>
                    <select
                      value={selectedNode.customStyle?.borderStyle || 'solid'}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, {
                          customStyle: { ...(selectedNode.customStyle || {}), borderStyle: e.target.value as any },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.68rem] text-[var(--text-primary)]"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Glow / Shadow Color */}
              <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 space-y-2">
                <span className="text-[0.65rem] font-bold text-[var(--text-primary)] block">Glow & Shadow</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(selectedNode.customStyle?.glowColor, '#06b6d4')}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), glowColor: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                    title="Glow Color"
                  />
                  <select
                    value={selectedNode.customStyle?.shadow || 'glow'}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, {
                        customStyle: { ...(selectedNode.customStyle || {}), shadow: e.target.value as any },
                      })
                    }
                    className="flex-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.68rem] text-[var(--text-primary)]"
                  >
                    <option value="glow">Ambient Glow</option>
                    <option value="sm">Soft Shadow</option>
                    <option value="md">Medium Shadow</option>
                    <option value="lg">Heavy Elevation</option>
                    <option value="none">Flat (No Shadow)</option>
                  </select>
                </div>
              </div>

              {/* Quick Rainbow Swatches */}
              <div>
                <span className="text-[0.62rem] text-[var(--text-muted)] block mb-1 font-bold">
                  Quick Palette Swatches
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() =>
                        handleUpdateNode(selectedNode.id, {
                          customStyle: {
                            ...(selectedNode.customStyle || {}),
                            borderColor: swatch,
                            bgColor: swatch,
                            glowColor: swatch,
                          },
                        })
                      }
                      className="w-5 h-5 rounded-md border border-white/20 hover:scale-125 transition-transform"
                      style={{ backgroundColor: swatch }}
                      title={`Apply ${swatch}`}
                    />
                  ))}
                </div>
              </div>

              {/* Curated Theme Presets */}
              <div>
                <span className="text-[0.62rem] text-[var(--text-muted)] block mb-1 font-bold">
                  Curated Studio Themes
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() =>
                        handleUpdateNode(selectedNode.id, {
                          customStyle: {
                            ...(selectedNode.customStyle || {}),
                            borderColor: pal.border,
                            bgColor: pal.bg,
                            textColor: pal.text,
                            glowColor: pal.glow,
                          },
                        })
                      }
                      className="p-1 rounded-lg border border-[var(--border-subtle)] flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                      title={pal.name}
                    >
                      <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: pal.border }} />
                      <span className="text-[0.55rem] font-medium text-[var(--text-muted)] truncate w-full text-center">
                        {pal.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Box Dimensions & Meta */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block">
                  Dimensions & Size
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const curW = selectedNode?.width || 230;
                    const curH = selectedNode?.height || 110;
                    handleSetGlobalBoxPreset(curW, curH);
                  }}
                  className="text-[0.62rem] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                  title="Apply current width & height to all boxes in the diagram"
                >
                  Apply to All Boxes
                </button>
              </div>

              {/* Quick Presets & Scale in Inspector */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {([
                    { id: 'S', w: 180, h: 80 },
                    { id: 'M', w: 230, h: 110 },
                    { id: 'L', w: 300, h: 140 },
                    { id: 'XL', w: 380, h: 180 },
                  ] as const).map((sz) => {
                    const curW = selectedNode?.width || 230;
                    const curH = selectedNode?.height || 110;
                    const isCur = Math.abs(curW - sz.w) <= 15 && Math.abs(curH - sz.h) <= 15;
                    return (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => handleUpdateNode(selectedNode.id, { width: sz.w, height: sz.h })}
                        className={`px-2 py-0.5 rounded text-[0.65rem] font-bold transition-all cursor-pointer ${
                          isCur
                            ? 'bg-amber-400 text-black shadow-xs font-extrabold'
                            : 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        title={`Set to ${sz.id} (${sz.w}×${sz.h}px)`}
                      >
                        {sz.id}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleScaleNodeSize(selectedNode.id, 0.85)}
                    className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-400 cursor-pointer"
                    title="Shrink -15%"
                  >
                    -15%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScaleNodeSize(selectedNode.id, 1.15)}
                    className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-400 cursor-pointer"
                    title="Enlarge +15%"
                  >
                    +15%
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[0.62rem] text-[var(--text-muted)] block mb-0.5">Width (px)</span>
                  <input
                    type="number"
                    value={selectedNode.width || 230}
                    step={10}
                    min={120}
                    max={800}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { width: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.7rem] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <span className="text-[0.62rem] text-[var(--text-muted)] block mb-0.5">Height (px)</span>
                  <input
                    type="number"
                    value={selectedNode.height || 110}
                    step={10}
                    min={44}
                    max={600}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { height: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.7rem] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Custom Image / Logo Upload */}
              <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-cyan-400" /> Box Image / Logo
                  </span>
                  {selectedNode.imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleUpdateNode(selectedNode.id, { imageUrl: undefined })}
                      className="text-[0.62rem] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedNode.imageUrl ? (
                    <div className="w-10 h-10 rounded-lg border border-cyan-400/40 bg-black/30 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      <img src={selectedNode.imageUrl} alt="Uploaded logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center shrink-0 text-[var(--text-muted)]">
                      <ImageIcon size={16} className="opacity-40" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-1">
                    <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs">
                      <Upload size={12} />
                      <span>{selectedNode.imageUrl ? 'Change Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              if (base64) {
                                handleUpdateNode(selectedNode.id, { imageUrl: base64 });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={selectedNode.imageUrl && !selectedNode.imageUrl.startsWith('data:') ? selectedNode.imageUrl : ''}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { imageUrl: e.target.value || undefined })}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[0.65rem] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedNode.badge || ''}
                  onChange={(e) => handleUpdateNode(selectedNode.id, { badge: e.target.value })}
                  placeholder="Badge (e.g. 01, P0, Optional)"
                  className="w-full px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.7rem] text-[var(--text-primary)] font-mono"
                />
              </div>
            </div>

            {/* Quick Actions & 1-Click Connect */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              {diagram.nodes.filter((n) => n.id !== selectedNode.id).length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Zap size={11} className="text-cyan-400" /> 1-Click Direct Connect:
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCreateEdge(selectedNode.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-cyan-400 rounded-md px-2 py-1.5 text-xs focus:outline-none cursor-pointer truncate transition-colors"
                  >
                    <option value="" disabled>Select target box... ▾</option>
                    {diagram.nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          → {n.label?.replace(/<[^>]*>/g, '').trim().slice(0, 32) || n.id}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setConnectSourceId(selectedNode.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[0.7rem] font-bold hover:bg-cyan-500/30 transition-colors"
                  title="Click here, then click any box on canvas to connect"
                >
                  <Link2 size={12} />
                  <span>🎯 Pick Target on Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateNode(selectedNode.id)}
                  className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                  title="Duplicate Box"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  title="Delete Box"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Inspector Panel for Selected Edge */}
      {selectedEdge && !readOnly && !isExporting && (
        <div
          data-interactive="true"
          className="absolute right-4 top-16 bottom-4 w-80 max-w-[calc(100vw-2rem)] z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200"
        >
          {/* Header */}
          <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-cyan-400" />
              <span className="font-bold text-xs text-[var(--text-primary)]">Connection Line Inspector</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEdgeId(null)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              title="Close Panel"
            >
              <X size={13} />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Edge Label */}
            <div>
              <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Connection Label
              </label>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={(e) => handleUpdateEdge(selectedEdge.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-cyan-400"
                placeholder="Condition / payload (e.g. 200 OK, Yes, Async)..."
              />
            </div>

            {/* Custom Line Color ("Apni Marzi Jo Colour Karna Hai") */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider">
                <Palette size={12} className="text-cyan-400" />
                <span>Line Color & Theme</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toHexColor(selectedEdge.customStyle?.color || selectedEdge.color, '#06b6d4')}
                  onChange={(e) =>
                    handleUpdateEdge(selectedEdge.id, {
                      customStyle: { ...(selectedEdge.customStyle || {}), color: e.target.value },
                    })
                  }
                  className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--border-subtle)] bg-transparent p-0.5 shrink-0"
                  title="Pick Custom Line Color"
                />
                <input
                  type="text"
                  value={selectedEdge.customStyle?.color || selectedEdge.color || ''}
                  onChange={(e) =>
                    handleUpdateEdge(selectedEdge.id, {
                      customStyle: { ...(selectedEdge.customStyle || {}), color: e.target.value },
                    })
                  }
                  placeholder="#06b6d4"
                  className="flex-1 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs font-mono text-[var(--text-primary)]"
                />
              </div>
              {/* Quick Swatches for Edge */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() =>
                      handleUpdateEdge(selectedEdge.id, {
                        customStyle: { ...(selectedEdge.customStyle || {}), color: swatch },
                      })
                    }
                    className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                    style={{ backgroundColor: swatch }}
                    title={`Line Color: ${swatch}`}
                  />
                ))}
              </div>
            </div>

            {/* Line Routing Curve */}
            <div>
              <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Line Geometry & Routing
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROUTING_CONFIG.map((r) => {
                  const isCurrent = (selectedEdge.customStyle?.routing || 'curved') === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        handleUpdateEdge(selectedEdge.id, {
                          customStyle: { ...(selectedEdge.customStyle || {}), routing: r.id },
                        })
                      }
                      className={`p-1.5 rounded-lg border text-[0.68rem] font-bold text-left transition-all ${
                        isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/30'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Stroke Style */}
            <div>
              <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Stroke Dash Style
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STROKE_STYLE_CONFIG.map((st) => {
                  const isCurrent = (selectedEdge.customStyle?.strokeStyle || selectedEdge.style || 'solid') === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        handleUpdateEdge(selectedEdge.id, {
                          customStyle: { ...(selectedEdge.customStyle || {}), strokeStyle: st.id },
                        })
                      }
                      className={`p-1.5 rounded-lg border text-[0.68rem] font-bold text-left transition-all ${
                        isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/30'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arrowhead Markers */}
            <div>
              <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Arrowhead Marker
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ARROW_MARKER_CONFIG.map((m) => {
                  const isCurrent = (selectedEdge.customStyle?.arrowMarker || 'arrow') === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        handleUpdateEdge(selectedEdge.id, {
                          customStyle: { ...(selectedEdge.customStyle || {}), arrowMarker: m.id },
                        })
                      }
                      className={`p-1.5 rounded-lg border text-[0.68rem] font-bold text-left transition-all flex items-center justify-between gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm ring-1 ring-cyan-400/30'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/30'
                      }`}
                    >
                      <span className="truncate">{m.label}</span>
                      {m.badge && (
                        <span className="text-[0.58rem] font-mono font-bold px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thickness */}
            <div className="space-y-1">
              <label className="font-bold text-[0.68rem] text-[var(--text-muted)] uppercase tracking-wider block">
                Line Width
              </label>
              <select
                value={selectedEdge.customStyle?.strokeWidth || 2}
                onChange={(e) =>
                  handleUpdateEdge(selectedEdge.id, {
                    customStyle: { ...(selectedEdge.customStyle || {}), strokeWidth: Number(e.target.value) },
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[0.7rem] text-[var(--text-primary)]"
              >
                <option value={1.5}>1.5px (Fine Line)</option>
                <option value={2}>2px (Standard Line)</option>
                <option value={3}>3px (Bold Line)</option>
                <option value={4}>4px (Heavy Trunk Line)</option>
              </select>
            </div>

            {/* Delete Edge */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => handleDeleteEdge(selectedEdge.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Batch Multi-Selection Dock (Figma-Style Superpower) */}
      {selectedNodeIds.length > 1 && !readOnly && !isExporting && (
        <div
          data-interactive="true"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-cyan-400/70 shadow-[0_8px_32px_rgba(6,182,212,0.25)] pointer-events-auto text-xs whitespace-nowrap animate-in fade-in slide-in-from-bottom-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 pr-2 border-r border-[var(--border-subtle)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px]">
              {selectedNodeIds.length}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">Selected</span>
          </div>

          {/* Alignment Tools */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => handleBatchAlign('left')}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Align Left (Edges)"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleBatchAlign('center')}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Align Center (Horizontal)"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleBatchAlign('right')}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Align Right (Edges)"
            >
              <AlignRight size={13} />
            </button>
            <div className="h-3 w-[1px] bg-[var(--border-subtle)] mx-1" />
            <button
              type="button"
              onClick={() => handleBatchAlign('top')}
              className="px-1.5 py-0.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] font-bold text-[11px] transition-colors cursor-pointer"
              title="Align Top (Edges)"
            >
              ↑ Top
            </button>
            <button
              type="button"
              onClick={() => handleBatchAlign('middle')}
              className="px-1.5 py-0.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] font-bold text-[11px] transition-colors cursor-pointer"
              title="Align Middle (Vertical)"
            >
              ↕ Mid
            </button>
            <button
              type="button"
              onClick={() => handleBatchAlign('bottom')}
              className="px-1.5 py-0.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] font-bold text-[11px] transition-colors cursor-pointer"
              title="Align Bottom (Edges)"
            >
              ↓ Btm
            </button>
          </div>

          {/* Distribution Tools */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => handleBatchDistribute('horizontal')}
              disabled={selectedNodeIds.length < 3}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Distribute Evenly Horizontally"
            >
              <MoveHorizontal size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleBatchDistribute('vertical')}
              disabled={selectedNodeIds.length < 3}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Distribute Evenly Vertically"
            >
              <MoveVertical size={13} />
            </button>
          </div>

          {/* Batch Colors */}
          <div className="flex items-center gap-1 pr-2 border-r border-[var(--border-subtle)]">
            {COLOR_PALETTES.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleBatchColor(p)}
                className="w-4 h-4 rounded-full border border-white/30 transition-transform hover:scale-125 cursor-pointer shadow-xs"
                style={{ backgroundColor: p.border }}
                title={`Apply ${p.name} to All Selected`}
              />
            ))}
          </div>

          {/* Batch Delete */}
          <button
            type="button"
            onClick={handleBatchDelete}
            className="p-1.5 px-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            title="Delete All Selected Nodes"
          >
            <Trash2 size={13} />
            <span>Delete ({selectedNodeIds.length})</span>
          </button>
        </div>
      )}

      {/* Map Dataset Modal in InteractiveCanvas */}
      {canvasMapDatasetTemplate && (
        <MapDatasetModal
          isOpen={!!canvasMapDatasetTemplate}
          onClose={() => setCanvasMapDatasetTemplate(null)}
          template={canvasMapDatasetTemplate.diagram}
          templateName={canvasMapDatasetTemplate.name}
          currentDiagram={diagram}
          onApply={(mappedDiagram) => {
            onUpdateDiagram(mappedDiagram);
            setCanvasMapDatasetTemplate(null);
          }}
        />
      )}
    </div>
  );
});
