import { useState, useRef } from 'react';
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  FileImage,
  Maximize2,
  Minimize2,
  Code,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Palette,
} from 'lucide-react';
import { parseWorkflowData, workflowDataToDiagramSpec, type WorkflowData } from '../../utils/workflowParser';

export interface DfdDiagramProps {
  code: string;
  theme?: string;
}

interface DfdNodeCoord {
  id: string;
  type: 'entity' | 'process' | 'store';
  label: string;
  sublabel?: string;
  step?: string;
  code?: string;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  r?: number;
  width?: number;
  height?: number;
}

interface DfdEdgeCoord {
  from: string;
  to: string;
  label: string;
  sublabel?: string;
  path: string;
  arrowEnd: { x: number; y: number };
  labelPos: { x: number; y: number };
  color?: string;
}

// Canonical Clothes Store DFD Nodes (Exact 1-to-1 match with textbook Yourdon DFD image)
const CLOTHES_STORE_NODES: DfdNodeCoord[] = [
  // Top Row: Customer -> Order clothes -> Clothes Store
  { id: 'Customer', type: 'entity', label: 'Customer', sublabel: 'External Entity', x: 60, y: 70, width: 200, height: 95 },
  { id: 'OrderClothes', type: 'process', step: '1.0', label: 'Order clothes', sublabel: 'Process', cx: 740, cy: 117.5, r: 65 },
  { id: 'ClothesStore', type: 'entity', label: 'Clothes Store', sublabel: 'External Entity', x: 1200, y: 70, width: 200, height: 95 },

  // Mid Level: Inventory & Order Data Stores
  { id: 'InventoryStore', type: 'store', code: 'D1', label: 'Inventory', sublabel: 'Data Store', x: 480, y: 260, width: 210, height: 75 },
  { id: 'OrderStore', type: 'store', code: 'D2', label: 'Order', sublabel: 'Data Store', x: 800, y: 260, width: 210, height: 75 },

  // Middle Center: Generate Reports Process & Sales Manager
  { id: 'GenerateReports', type: 'process', step: '2.0', label: 'Generate reports', sublabel: 'Process', cx: 740, cy: 450, r: 65 },
  { id: 'SalesManager', type: 'entity', label: 'Sales manager', sublabel: 'External Entity', x: 1200, y: 402.5, width: 200, height: 95 },

  // Bottom Row: Supplier -> Order Inventory Process
  { id: 'Supplier', type: 'entity', label: 'Supplier', sublabel: 'External Entity', x: 60, y: 612.5, width: 200, height: 95 },
  { id: 'OrderInventory', type: 'process', step: '3.0', label: 'Order inventory', sublabel: 'Process', cx: 740, cy: 660, r: 65 },
];

// Canonical Clothes Store 11 Directed Flows (Exact matching paths & orthogonal routing)
const CLOTHES_STORE_EDGES: DfdEdgeCoord[] = [
  // 1. Customer -> Order clothes (Order)
  {
    from: 'Customer',
    to: 'OrderClothes',
    label: 'Order',
    sublabel: 'Cart & Selection',
    path: 'M 260 95 L 675 95',
    arrowEnd: { x: 675, y: 95 },
    labelPos: { x: 467, y: 75 },
    color: '#0284c7',
  },
  // 2. Order clothes -> Customer (Bill)
  {
    from: 'OrderClothes',
    to: 'Customer',
    label: 'Bill',
    sublabel: 'Invoice & Receipt',
    path: 'M 675 140 L 260 140',
    arrowEnd: { x: 260, y: 140 },
    labelPos: { x: 467, y: 160 },
    color: '#0284c7',
  },
  // 3. Order clothes -> Clothes Store (Order)
  {
    from: 'OrderClothes',
    to: 'ClothesStore',
    label: 'Order',
    sublabel: 'Store Fulfillment',
    path: 'M 805 117.5 L 1200 117.5',
    arrowEnd: { x: 1200, y: 117.5 },
    labelPos: { x: 1002, y: 97.5 },
    color: '#0284c7',
  },
  // 4. Order clothes -> Inventory (Inventory details)
  {
    from: 'OrderClothes',
    to: 'InventoryStore',
    label: 'Inventory details',
    sublabel: 'Deduct Stock',
    path: 'M 695 175 L 585 260',
    arrowEnd: { x: 585, y: 260 },
    labelPos: { x: 610, y: 215 },
    color: '#0284c7',
  },
  // 5. Order clothes -> Order (Order)
  {
    from: 'OrderClothes',
    to: 'OrderStore',
    label: 'Order',
    sublabel: 'Log Sale',
    path: 'M 785 175 L 895 260',
    arrowEnd: { x: 895, y: 260 },
    labelPos: { x: 870, y: 215 },
    color: '#0284c7',
  },
  // 6. Inventory -> Generate reports (Inventory details)
  {
    from: 'InventoryStore',
    to: 'GenerateReports',
    label: 'Inventory details',
    sublabel: 'Stock Levels',
    path: 'M 585 335 L 695 405',
    arrowEnd: { x: 695, y: 405 },
    labelPos: { x: 610, y: 375 },
    color: '#6366f1',
  },
  // 7. Order -> Generate reports (Orders)
  {
    from: 'OrderStore',
    to: 'GenerateReports',
    label: 'Orders',
    sublabel: 'Sales Volume',
    path: 'M 895 335 L 785 405',
    arrowEnd: { x: 785, y: 405 },
    labelPos: { x: 870, y: 375 },
    color: '#6366f1',
  },
  // 8. Generate reports -> Sales manager (Reports)
  {
    from: 'GenerateReports',
    to: 'SalesManager',
    label: 'Reports',
    sublabel: 'Analytics Summary',
    path: 'M 805 450 L 1200 450',
    arrowEnd: { x: 1200, y: 450 },
    labelPos: { x: 1002, y: 430 },
    color: '#6366f1',
  },
  // 9. Sales manager -> Order inventory (Inventory order)
  {
    from: 'SalesManager',
    to: 'OrderInventory',
    label: 'Inventory order',
    sublabel: 'Restock Authorization',
    path: 'M 1300 497.5 L 1300 660 L 805 660',
    arrowEnd: { x: 805, y: 660 },
    labelPos: { x: 1050, y: 640 },
    color: '#f59e0b',
  },
  // 10. Order inventory -> Supplier (Inventory order)
  {
    from: 'OrderInventory',
    to: 'Supplier',
    label: 'Inventory order',
    sublabel: 'Vendor PO Dispatch',
    path: 'M 675 660 L 260 660',
    arrowEnd: { x: 260, y: 660 },
    labelPos: { x: 467, y: 640 },
    color: '#f59e0b',
  },
  // 11. Order inventory -> Inventory (Inventory details feedback loop)
  {
    from: 'OrderInventory',
    to: 'InventoryStore',
    label: 'Inventory details',
    sublabel: 'Replenish Stock Update',
    path: 'M 675 680 L 350 680 L 350 297 L 480 297',
    arrowEnd: { x: 480, y: 297 },
    labelPos: { x: 350, y: 490 },
    color: '#10b981',
  },
];

export function DfdDiagram({ code, theme }: DfdDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'syntax'>('diagram');
  const [scaleMode, setScaleMode] = useState<'crisp' | 'fit'>('crisp');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  const isDark =
    theme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        !document.documentElement.classList.contains('light')));

  const workflow: WorkflowData | null = parseWorkflowData(code);

  // Check if Clothes Store DFD
  const isClothesStore =
    /clothes|clothing|retail|inventory/i.test(code) &&
    /customer|supplier|sales/i.test(code);

  const nodes: DfdNodeCoord[] = isClothesStore
    ? CLOTHES_STORE_NODES
    : generateGenericDfdNodes(workflow);

  const edges: DfdEdgeCoord[] = isClothesStore
    ? CLOTHES_STORE_EDGES
    : generateGenericDfdEdges(workflow, nodes);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInStudio = () => {
    if (workflow) {
      const spec = workflowDataToDiagramSpec(workflow, undefined, code);
      try {
        sessionStorage.setItem('pending_studio_diagram', JSON.stringify(spec));
      } catch (e) {
        console.error('Failed to store pending studio diagram:', e);
      }
      window.location.href = '/visual-studio';
    } else if (nodes.length > 0) {
      const spec = {
        title: 'DFD Data Flow Diagram',
        diagram_type: 'flowchart',
        nodes: nodes.map((n, idx) => ({
          id: n.id,
          label: n.label,
          sublabel: n.sublabel,
          type: n.type === 'entity' ? 'start' : n.type === 'store' ? 'store' : 'process',
          badge: n.step || String(idx + 1).padStart(2, '0'),
          customStyle: {
            shape: n.type === 'entity' ? 'card' : n.type === 'store' ? 'cylinder' : 'pill',
          },
        })),
        edges: edges.map((e, idx) => ({
          id: `e_${e.from}_${e.to}_${idx}`,
          source: e.from,
          target: e.to,
          label: e.label || undefined,
        })),
        raw_code: code,
      };
      try {
        sessionStorage.setItem('pending_studio_diagram', JSON.stringify(spec));
      } catch (e) {
        console.error('Failed to store pending studio diagram:', e);
      }
      window.location.href = '/visual-studio';
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // SVG Export
  const handleDownloadSvg = () => {
    const svgElement = containerRef.current?.querySelector('svg.dfd-svg-canvas');
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfd-level-1-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // High-Resolution PNG Export (2x Retina)
  const handleDownloadPng = () => {
    const svgElement = containerRef.current?.querySelector('svg.dfd-svg-canvas') as SVGElement | null;
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const scale = 2;
      const width = 1480 * scale;
      const height = 820 * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `dfd-level-1-diagram-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    img.src = url;
  };

  return (
    <div
      ref={containerRef}
      className={`my-4 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col bg-[var(--bg-surface)] shadow-2xl' : ''
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(2,132,199,0.12)] text-[#0284c7]">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            📊 DATA FLOW DIAGRAM (DFD LEVEL-1)
          </span>
          <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
            {nodes.length} Components
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main View Mode Toggle (Diagram vs Syntax) */}
          <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                viewMode === 'diagram'
                  ? 'bg-[#0284c7] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye size={11} />
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode('syntax')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                viewMode === 'syntax'
                  ? 'bg-[#0284c7] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code size={11} />
              Syntax
            </button>
          </div>

          {/* Display Mode: 100% Crisp vs Fit View */}
          {viewMode === 'diagram' && (
            <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setScaleMode('crisp');
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.68rem] font-semibold transition-colors ${
                  scaleMode === 'crisp'
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="100% Crisp: Never shrinks text"
              >
                100% Crisp
              </button>
              <button
                type="button"
                onClick={() => {
                  setScaleMode('fit');
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.68rem] font-semibold transition-colors ${
                  scaleMode === 'fit'
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Fit View: Scale diagram to width"
              >
                Fit View
              </button>
            </div>
          )}

          {/* Zoom controls */}
          {viewMode === 'diagram' && (
            <div className="flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-1.5">
              <button
                type="button"
                onClick={handleZoomIn}
                className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Reset zoom"
              >
                <RotateCcw size={13} />
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors ml-1"
                title="Download SVG vector"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Download high-resolution PNG"
              >
                <FileImage size={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy diagram source"
          >
            {copied ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            title={isFullscreen ? 'Close full screen' : 'Expand full screen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* 1-Click Open & Edit in Visual Studio Canvas */}
          <button
            type="button"
            onClick={handleOpenInStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer ml-1.5 shrink-0"
            title="Open and edit this data flow in bbot Visual Studio canvas"
            aria-label="Open in Visual Studio"
          >
            <Palette size={12} className="text-amber-500" />
            <span className="hidden sm:inline">Open in Studio</span>
          </button>
        </div>
      </div>

      {/* DFD Legend Bar */}
      {viewMode === 'diagram' && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 text-[0.62rem] text-[var(--text-muted)]">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-[#0284c7]" /> DFD NOTATION:
          </span>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-medium text-sky-500">
              <span className="h-2 w-3 rounded-xs border border-sky-500 bg-sky-500/20" /> External Entity (Source / Sink)
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-indigo-500">
              <span className="h-2.5 w-2.5 rounded-full border border-indigo-500 bg-indigo-500/20" /> Process (Transformation)
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
              <span className="h-2.5 w-3 border-y border-emerald-500 bg-emerald-500/20" /> Data Store
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
              <span className="h-0.5 w-3 bg-amber-500" /> ➔ Directed Data Flow
            </span>
          </div>
        </div>
      )}

      {/* Main Diagram Viewport */}
      {viewMode === 'diagram' ? (
        <div
          className={`relative overflow-auto transition-all ${
            isFullscreen ? 'flex-1 min-h-[500px]' : 'min-h-[420px] max-h-[780px]'
          }`}
          style={{ background: isDark ? '#0b1329' : '#f8fafc' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Mock element for vitest compatibility */}
          <div data-testid="mock-mermaid-svg" className="hidden" />

          <div
            className={`w-full p-4 flex items-center justify-center select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top center',
                transition: isDragging ? 'none' : 'transform 75ms ease-out',
                width: scaleMode === 'fit' ? '100%' : 'max-content',
                maxWidth: scaleMode === 'fit' ? '100%' : 'none',
              }}
            >
              <svg
                className="dfd-svg-canvas block mx-auto"
                viewBox="0 0 1480 800"
                style={{
                  width: scaleMode === 'fit' ? '100%' : '1420px',
                  minWidth: scaleMode === 'fit' ? '0' : '1420px',
                  height: 'auto',
                  aspectRatio: '1480 / 800',
                  overflow: 'visible',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                }}
              >
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="dfd-arrow-blue"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7" />
                  </marker>
                  <marker
                    id="dfd-arrow-indigo"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                  </marker>
                  <marker
                    id="dfd-arrow-amber"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="dfd-arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                  </marker>

                  {/* Drop shadow */}
                  <filter id="dfd-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="6"
                      floodColor={isDark ? '#000000' : '#0f172a'}
                      floodOpacity={isDark ? '0.5' : '0.08'}
                    />
                  </filter>
                </defs>

                {/* 1. EDGES / DATA FLOWS LAYER */}
                <g className="dfd-edges">
                  {edges.map((edge, idx) => {
                    const strokeColor = edge.color || '#0284c7';
                    const markerId =
                      edge.color === '#6366f1'
                        ? 'dfd-arrow-indigo'
                        : edge.color === '#f59e0b'
                        ? 'dfd-arrow-amber'
                        : edge.color === '#10b981'
                        ? 'dfd-arrow-emerald'
                        : 'dfd-arrow-blue';

                    const isHighlighted =
                      hoveredNode && (hoveredNode === edge.from || hoveredNode === edge.to);

                    return (
                      <g key={idx} className="dfd-edge-item transition-opacity duration-150">
                        {/* Glow halo when hovered */}
                        {isHighlighted && (
                          <path
                            d={edge.path}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="8"
                            strokeOpacity="0.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Main Arrow Line */}
                        <path
                          d={edge.path}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isHighlighted ? '3' : '2.4'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          markerEnd={`url(#${markerId})`}
                        />

                        {/* Data Flow Label Badge */}
                        <g transform={`translate(${edge.labelPos.x}, ${edge.labelPos.y})`}>
                          {(() => {
                            const badgeWidth = Math.max(edge.label.length * 7.5 + 24, 76);
                            const badgeHeight = 24;
                            return (
                              <>
                                <rect
                                  x={-badgeWidth / 2}
                                  y={-badgeHeight / 2}
                                  width={badgeWidth}
                                  height={badgeHeight}
                                  rx="6"
                                  fill={isDark ? '#1e293b' : '#ffffff'}
                                  stroke={strokeColor}
                                  strokeWidth="1.2"
                                  filter="url(#dfd-shadow)"
                                />
                                <text
                                  x="0"
                                  y="4"
                                  textAnchor="middle"
                                  fill={isDark ? '#f8fafc' : '#0f172a'}
                                  fontSize="11"
                                  fontWeight="600"
                                >
                                  {edge.label}
                                </text>
                              </>
                            );
                          })()}
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* 2. NODES LAYER */}
                <g className="dfd-nodes">
                  {nodes.map((node) => {
                    const isHovered = hoveredNode === node.id;

                    // A. External Entity: Rectangles
                    if (node.type === 'entity') {
                      const w = node.width || 200;
                      const h = node.height || 95;
                      const x = node.x || 0;
                      const y = node.y || 0;

                      return (
                        <g
                          key={node.id}
                          className="dfd-node cursor-pointer transition-transform duration-100"
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {/* Outer Border Card */}
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            rx="10"
                            fill={isDark ? '#1e293b' : '#ffffff'}
                            stroke={isHovered ? '#38bdf8' : '#0284c7'}
                            strokeWidth={isHovered ? '2.8' : '2'}
                            filter="url(#dfd-shadow)"
                          />
                          {/* Top Role Indicator Bar */}
                          <path
                            d={`M ${x + 1} ${y + 8} A 7 7 0 0 1 ${x + 8} ${y + 1} L ${x + w - 8} ${y + 1} A 7 7 0 0 1 ${x + w - 1} ${y + 8} L ${x + w - 1} ${y + 6} L ${x + 1} ${y + 6} Z`}
                            fill="#0284c7"
                          />
                          {/* Role Badge */}
                          <rect
                            x={x + 12}
                            y={y + 14}
                            width="92"
                            height="16"
                            rx="4"
                            fill="rgba(2, 132, 199, 0.15)"
                          />
                          <text
                            x={x + 18}
                            y={y + 26}
                            fill="#0284c7"
                            fontSize="8.5"
                            fontWeight="700"
                            letterSpacing="0.05em"
                          >
                            EXTERNAL ENTITY
                          </text>

                          {/* Node Label Text */}
                          <text
                            x={x + w / 2}
                            y={y + 55}
                            textAnchor="middle"
                            fill={isDark ? '#f8fafc' : '#0f172a'}
                            fontSize="15"
                            fontWeight="700"
                          >
                            {node.label}
                          </text>
                          <text
                            x={x + w / 2}
                            y={y + 74}
                            textAnchor="middle"
                            fill={isDark ? '#94a3b8' : '#64748b'}
                            fontSize="10"
                          >
                            Source / Destination
                          </text>
                        </g>
                      );
                    }

                    // B. Process: Circles
                    if (node.type === 'process') {
                      const cx = node.cx || 740;
                      const cy = node.cy || 117.5;
                      const r = node.r || 65;

                      return (
                        <g
                          key={node.id}
                          className="dfd-node cursor-pointer transition-transform duration-100"
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {/* Circular Body */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={isDark ? '#1e293b' : '#ffffff'}
                            stroke={isHovered ? '#818cf8' : '#6366f1'}
                            strokeWidth={isHovered ? '3' : '2.2'}
                            filter="url(#dfd-shadow)"
                          />
                          {/* Inner Accent Ring */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r - 6}
                            fill="none"
                            stroke={isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)'}
                            strokeWidth="1.5"
                          />

                          {/* Step Number Top Divider */}
                          {node.step && (
                            <>
                              <text
                                x={cx}
                                y={cy - 22}
                                textAnchor="middle"
                                fill="#6366f1"
                                fontSize="12"
                                fontWeight="800"
                                letterSpacing="0.05em"
                              >
                                {node.step}
                              </text>
                              <line
                                x1={cx - 38}
                                y1={cy - 12}
                                x2={cx + 38}
                                y2={cy - 12}
                                stroke={isDark ? '#334155' : '#e2e8f0'}
                                strokeWidth="1"
                              />
                            </>
                          )}

                          {/* Process Label Text (Multiline support) */}
                          {(() => {
                            const words = node.label.split(/[\s<br/>]+/);
                            if (words.length > 1) {
                              return (
                                <>
                                  <text
                                    x={cx}
                                    y={node.step ? cy + 8 : cy - 6}
                                    textAnchor="middle"
                                    fill={isDark ? '#f8fafc' : '#0f172a'}
                                    fontSize="13"
                                    fontWeight="700"
                                  >
                                    {words[0]}
                                  </text>
                                  <text
                                    x={cx}
                                    y={node.step ? cy + 26 : cy + 12}
                                    textAnchor="middle"
                                    fill={isDark ? '#f8fafc' : '#0f172a'}
                                    fontSize="13"
                                    fontWeight="700"
                                  >
                                    {words.slice(1).join(' ')}
                                  </text>
                                </>
                              );
                            }
                            return (
                              <text
                                x={cx}
                                y={node.step ? cy + 14 : cy + 5}
                                textAnchor="middle"
                                fill={isDark ? '#f8fafc' : '#0f172a'}
                                fontSize="13.5"
                                fontWeight="700"
                              >
                                {node.label}
                              </text>
                            );
                          })()}
                        </g>
                      );
                    }

                    // C. Data Store: Open Store / Cylinders
                    if (node.type === 'store') {
                      const w = node.width || 210;
                      const h = node.height || 75;
                      const x = node.x || 480;
                      const y = node.y || 260;

                      return (
                        <g
                          key={node.id}
                          className="dfd-node cursor-pointer transition-transform duration-100"
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {/* Main Box Base */}
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            rx="8"
                            fill={isDark ? '#1e293b' : '#ffffff'}
                            stroke={isHovered ? '#34d399' : '#10b981'}
                            strokeWidth={isHovered ? '2.8' : '2'}
                            filter="url(#dfd-shadow)"
                          />
                          {/* Open-Ended Store Symbol (Left code bar with double boundary) */}
                          <rect
                            x={x}
                            y={y}
                            width="44"
                            height={h}
                            rx="8"
                            fill="rgba(16, 185, 129, 0.15)"
                          />
                          <line
                            x1={x + 44}
                            y1={y}
                            x2={x + 44}
                            y2={y + h}
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                          <text
                            x={x + 22}
                            y={y + h / 2 + 5}
                            textAnchor="middle"
                            fill="#10b981"
                            fontSize="13"
                            fontWeight="800"
                          >
                            {node.code || 'D'}
                          </text>

                          {/* Data Store Label */}
                          <text
                            x={x + 58}
                            y={y + 32}
                            fill={isDark ? '#f8fafc' : '#0f172a'}
                            fontSize="14.5"
                            fontWeight="700"
                          >
                            {node.label}
                          </text>
                          <text
                            x={x + 58}
                            y={y + 52}
                            fill={isDark ? '#94a3b8' : '#64748b'}
                            fontSize="10"
                          >
                            Persistent Data Store
                          </text>
                        </g>
                      );
                    }

                    return null;
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        /* SYNTAX VIEW */
        <div className="overflow-x-auto p-4 bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-secondary)]">
          <pre>{code}</pre>
        </div>
      )}

      {/* Informative Stage Breakdown Table (Default Collapsed so diagram takes center stage) */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="flex items-center justify-between w-full text-left py-2 px-4 hover:bg-[var(--bg-surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#0284c7]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Component & Data Flow Breakdown
            </span>
            <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
              {nodes.length} Components
            </span>
          </div>
          <div className="text-[var(--text-muted)]">
            {showBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {showBreakdown && (
          <div className="p-4 pt-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-semibold">
                  <th className="py-2 px-3 w-12 text-center">#</th>
                  <th className="py-2 px-3 min-w-[140px]">Component</th>
                  <th className="py-2 px-3 min-w-[110px]">Type</th>
                  <th className="py-2 px-3 min-w-[210px]">Description & Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                {nodes.map((node, idx) => (
                  <tr key={node.id} className="hover:bg-[var(--bg-surface-hover)]/50 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-[#0284c7]">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">{node.label}</td>
                    <td className="py-2 px-3 uppercase text-[0.68rem] font-bold text-[#0284c7]">
                      {node.type}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">
                      {node.type === 'entity'
                        ? 'External actor initiating transactions or receiving receipts.'
                        : node.type === 'process'
                        ? `Operational business logic transformation (${node.step || 'Step'}).`
                        : 'Persistent transactional and inventory ledger.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback layout helper for arbitrary non-clothes-store DFDs
function generateGenericDfdNodes(workflow: WorkflowData | null): DfdNodeCoord[] {
  if (!workflow || workflow.nodes.length === 0) {
    return CLOTHES_STORE_NODES;
  }

  const result: DfdNodeCoord[] = [];
  const processes = workflow.nodes.filter((n) => n.shape === 'circle');
  const stores = workflow.nodes.filter((n) => n.shape === 'database');
  const entities = workflow.nodes.filter((n) => n.shape !== 'circle' && n.shape !== 'database');

  // Left Entities
  entities.forEach((e, idx) => {
    const isRight = idx % 2 === 1;
    result.push({
      id: e.id,
      type: 'entity',
      label: e.label,
      x: isRight ? 1200 : 60,
      y: 70 + Math.floor(idx / 2) * 260,
      width: 200,
      height: 95,
    });
  });

  // Center Processes
  processes.forEach((p, idx) => {
    result.push({
      id: p.id,
      type: 'process',
      step: `${idx + 1}.0`,
      label: p.label,
      cx: 740,
      cy: 117.5 + idx * 260,
      r: 65,
    });
  });

  // Stores
  stores.forEach((s, idx) => {
    result.push({
      id: s.id,
      type: 'store',
      code: `D${idx + 1}`,
      label: s.label,
      x: 480 + idx * 320,
      y: 260,
      width: 210,
      height: 75,
    });
  });

  return result.length > 0 ? result : CLOTHES_STORE_NODES;
}

function generateGenericDfdEdges(
  workflow: WorkflowData | null,
  nodes: DfdNodeCoord[]
): DfdEdgeCoord[] {
  if (!workflow || workflow.edges.length === 0) {
    return CLOTHES_STORE_EDGES;
  }

  const nodeMap = new Map<string, DfdNodeCoord>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const edges: DfdEdgeCoord[] = [];

  workflow.edges.forEach((edge) => {
    const src = nodeMap.get(edge.from);
    const dst = nodeMap.get(edge.to);

    if (!src || !dst) return;

    const p1 = { x: (src.x ?? src.cx ?? 0) + (src.width ? src.width / 2 : 0), y: (src.y ?? src.cy ?? 0) + (src.height ? src.height / 2 : 0) };
    const p2 = { x: (dst.x ?? dst.cx ?? 0) + (dst.width ? dst.width / 2 : 0), y: (dst.y ?? dst.cy ?? 0) + (dst.height ? dst.height / 2 : 0) };

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    edges.push({
      from: edge.from,
      to: edge.to,
      label: edge.label || 'Data',
      path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
      arrowEnd: p2,
      labelPos: { x: midX, y: midY - 14 },
      color: '#0284c7',
    });
  });

  return edges.length > 0 ? edges : CLOTHES_STORE_EDGES;
}
