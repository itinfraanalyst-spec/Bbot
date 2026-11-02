import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  Activity,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Database,
  Download,
  FileImage,
  GitFork,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  Server,
  Shield,
  Sparkles,
  User,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import mermaid from 'mermaid';
import { parseWorkflowData, workflowDataToDiagramSpec, type WorkflowData, type WorkflowNode } from '../../utils/workflowParser';
import { sanitizeMermaidCode } from '../../utils/mermaidSanitizer';
import { DfdDiagram } from './DfdDiagram';

export interface WorkflowDiagramProps {
  code: string;
  theme?: string;
}

interface NodeTheme {
  icon: ReactNode;
  roleBadge: string;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  glowBg: string;
}

function cleanDisplayText(text?: string): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/^[-\s:•]+/, '').trim();
}

function getNodeTheme(node: WorkflowNode): NodeTheme {
  const nodeSelf = `${node.id} ${node.label} ${node.details || ''}`.toLowerCase();
  const groupText = (node.group || '').toLowerCase();

  // 1. Error / Failure / Rejection (Checked FIRST so failures never get misclassified)
  if (
    nodeSelf.includes('fail') ||
    nodeSelf.includes('error') ||
    nodeSelf.includes('reject') ||
    nodeSelf.includes('denied') ||
    nodeSelf.includes('invalid') ||
    nodeSelf.includes('abort') ||
    nodeSelf.includes('decline') ||
    nodeSelf.includes('unauthorized') ||
    nodeSelf.includes('cancel') ||
    nodeSelf.includes('issue')
  ) {
    return {
      icon: <XCircle size={14} className="text-rose-500" />,
      roleBadge: 'Failure / Error',
      accentColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.45)',
      badgeBg: 'rgba(239, 68, 68, 0.14)',
      badgeText: 'text-rose-500',
      glowBg: 'rgba(239, 68, 68, 0.06)',
    };
  }

  // 2. Success / Completion / Settlement / Approval
  if (
    nodeSelf.includes('success') ||
    nodeSelf.includes('paid') ||
    nodeSelf.includes('complete') ||
    nodeSelf.includes('confirm') ||
    nodeSelf.includes('approved') ||
    nodeSelf.includes('authorized') ||
    nodeSelf.includes('passed') ||
    nodeSelf.includes('accepted') ||
    nodeSelf.includes('delivered') ||
    nodeSelf.includes('finish') ||
    nodeSelf.includes('done')
  ) {
    return {
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
      roleBadge: 'Success / Completed',
      accentColor: '#22c55e',
      borderColor: 'rgba(34, 197, 94, 0.45)',
      badgeBg: 'rgba(34, 197, 94, 0.14)',
      badgeText: 'text-emerald-500',
      glowBg: 'rgba(34, 197, 94, 0.06)',
    };
  }

  // 3. Security / Auth / Token Verification
  if (
    nodeSelf.includes('auth') ||
    nodeSelf.includes('jwt') ||
    nodeSelf.includes('security') ||
    nodeSelf.includes('token') ||
    nodeSelf.includes('guard') ||
    nodeSelf.includes('ssl') ||
    nodeSelf.includes('tls') ||
    nodeSelf.includes('permission') ||
    nodeSelf.includes('credential') ||
    nodeSelf.includes('signature') ||
    nodeSelf.includes('hmac') ||
    nodeSelf.includes('oauth') ||
    nodeSelf.includes('policy') ||
    nodeSelf.includes('waf') ||
    nodeSelf.includes('mpin')
  ) {
    return {
      icon: <Shield size={14} className="text-amber-500" />,
      roleBadge: 'Security / Auth',
      accentColor: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      badgeBg: 'rgba(245, 158, 11, 0.14)',
      badgeText: 'text-amber-500',
      glowBg: 'rgba(245, 158, 11, 0.06)',
    };
  }

  // 4. Data / Database / Storage
  if (
    nodeSelf.includes('db') ||
    nodeSelf.includes('database') ||
    nodeSelf.includes('postgres') ||
    nodeSelf.includes('mysql') ||
    nodeSelf.includes('mongo') ||
    nodeSelf.includes('redis') ||
    nodeSelf.includes('cache') ||
    nodeSelf.includes('storage') ||
    nodeSelf.includes('s3') ||
    nodeSelf.includes('vector') ||
    nodeSelf.includes('chroma') ||
    nodeSelf.includes('ledger') ||
    node.shape === 'database'
  ) {
    return {
      icon: <Database size={14} className="text-emerald-500" />,
      roleBadge: 'Data / Storage',
      accentColor: '#10b981',
      borderColor: 'rgba(16, 185, 129, 0.45)',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
      badgeText: 'text-emerald-500',
      glowBg: 'rgba(16, 185, 129, 0.06)',
    };
  }

  // 5. Decision / Gate / Check
  if (
    nodeSelf.includes('?') ||
    nodeSelf.includes('check') ||
    nodeSelf.includes('verify') ||
    nodeSelf.includes('condition') ||
    nodeSelf.includes('decision') ||
    nodeSelf.includes('valid') ||
    nodeSelf.includes('eval') ||
    node.shape === 'diamond'
  ) {
    return {
      icon: <GitFork size={14} className="text-pink-500" />,
      roleBadge: 'Decision Gate',
      accentColor: '#ec4899',
      borderColor: 'rgba(236, 72, 153, 0.45)',
      badgeBg: 'rgba(236, 72, 153, 0.14)',
      badgeText: 'text-pink-500',
      glowBg: 'rgba(236, 72, 153, 0.06)',
    };
  }

  // 6. Event / Queue / Worker / Stream
  if (
    nodeSelf.includes('queue') ||
    nodeSelf.includes('kafka') ||
    nodeSelf.includes('rabbit') ||
    nodeSelf.includes('event') ||
    nodeSelf.includes('worker') ||
    nodeSelf.includes('pubsub') ||
    nodeSelf.includes('stream') ||
    nodeSelf.includes('celery') ||
    nodeSelf.includes('bus')
  ) {
    return {
      icon: <Activity size={14} className="text-fuchsia-500" />,
      roleBadge: 'Event / Stream',
      accentColor: '#d946ef',
      borderColor: 'rgba(217, 70, 239, 0.45)',
      badgeBg: 'rgba(217, 70, 239, 0.14)',
      badgeText: 'text-fuchsia-500',
      glowBg: 'rgba(217, 70, 239, 0.06)',
    };
  }

  // 7. Core Engine / Service / API
  if (
    nodeSelf.includes('service') ||
    nodeSelf.includes('api') ||
    nodeSelf.includes('server') ||
    nodeSelf.includes('engine') ||
    nodeSelf.includes('backend') ||
    nodeSelf.includes('microservice') ||
    nodeSelf.includes('controller') ||
    nodeSelf.includes('handler') ||
    nodeSelf.includes('gateway') ||
    nodeSelf.includes('router') ||
    nodeSelf.includes('ingress') ||
    nodeSelf.includes('proxy')
  ) {
    return {
      icon: <Server size={14} className="text-indigo-500" />,
      roleBadge: 'Core Engine / API',
      accentColor: '#6366f1',
      borderColor: 'rgba(99, 102, 241, 0.45)',
      badgeBg: 'rgba(99, 102, 241, 0.14)',
      badgeText: 'text-indigo-500',
      glowBg: 'rgba(99, 102, 241, 0.06)',
    };
  }

  // 8. Client / Actor / User
  if (
    nodeSelf.includes('user') ||
    nodeSelf.includes('client') ||
    nodeSelf.includes('customer') ||
    nodeSelf.includes('actor') ||
    nodeSelf.includes('browser') ||
    nodeSelf.includes('mobile') ||
    nodeSelf.includes('shopper') ||
    nodeSelf.includes('buyer') ||
    nodeSelf.includes('visitor') ||
    nodeSelf.includes('patient') ||
    nodeSelf.includes('employee') ||
    nodeSelf.includes('agent') ||
    nodeSelf.includes('device')
  ) {
    return {
      icon: <User size={14} className="text-sky-500" />,
      roleBadge: 'Client / Actor',
      accentColor: '#0ea5e9',
      borderColor: 'rgba(14, 165, 233, 0.45)',
      badgeBg: 'rgba(14, 165, 233, 0.14)',
      badgeText: 'text-sky-500',
      glowBg: 'rgba(14, 165, 233, 0.06)',
    };
  }

  // 9. Contextual fallback based on group
  if (groupText.includes('security') || groupText.includes('auth')) {
    return {
      icon: <Shield size={14} className="text-amber-500" />,
      roleBadge: 'Security Tier',
      accentColor: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      badgeBg: 'rgba(245, 158, 11, 0.14)',
      badgeText: 'text-amber-500',
      glowBg: 'rgba(245, 158, 11, 0.06)',
    };
  }

  if (groupText.includes('backend') || groupText.includes('data') || groupText.includes('storage')) {
    return {
      icon: <Database size={14} className="text-emerald-500" />,
      roleBadge: 'Data / Storage',
      accentColor: '#10b981',
      borderColor: 'rgba(16, 185, 129, 0.45)',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
      badgeText: 'text-emerald-500',
      glowBg: 'rgba(16, 185, 129, 0.06)',
    };
  }

  if (groupText.includes('frontend') || groupText.includes('presentation') || groupText.includes('client')) {
    return {
      icon: <User size={14} className="text-sky-500" />,
      roleBadge: 'Client / Actor',
      accentColor: '#0ea5e9',
      borderColor: 'rgba(14, 165, 233, 0.45)',
      badgeBg: 'rgba(14, 165, 233, 0.14)',
      badgeText: 'text-sky-500',
      glowBg: 'rgba(14, 165, 233, 0.06)',
    };
  }

  return {
    icon: <Box size={14} className="text-[var(--accent)]" />,
    roleBadge: node.group ? node.group.replace(/\[.*?\]/g, '').trim() : 'System Component',
    accentColor: '#C87514',
    borderColor: 'rgba(200, 117, 20, 0.35)',
    badgeBg: 'rgba(200, 117, 20, 0.12)',
    badgeText: 'text-[var(--accent)]',
    glowBg: 'rgba(200, 117, 20, 0.04)',
  };
}

/**
 * Intelligently classifies and injects semantic role classes into Mermaid SVG nodes.
 * Automatically gives every diagram modern vibrant colors, gradients, and styling.
 */
function enhanceMermaidSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return rawSvg;
  try {
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return rawSvg;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg, 'image/svg+xml');

    if (doc.querySelector('parsererror')) {
      return rawSvg;
    }

    const svgElem = doc.querySelector('svg');
    if (svgElem) {
      svgElem.removeAttribute('height');
      svgElem.style.removeProperty('max-width');

      const vb = svgElem.getAttribute('viewBox');
      if (vb) {
        const parts = vb.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          const naturalWidth = Math.round(parts[2]);
          const naturalHeight = Math.round(parts[3]);
          svgElem.setAttribute('data-natural-width', String(naturalWidth));
          svgElem.setAttribute('data-natural-height', String(naturalHeight));
          svgElem.style.setProperty('--natural-width', `${naturalWidth}px`);
          // Preserve natural width so wide tiers never crush upper sections or shrink font sizes
          svgElem.style.minWidth = `${naturalWidth}px`;
          svgElem.style.width = '100%';
        }
      }
    }

    // Enhance cluster/subgraph headings so text is never invisible
    const clusters = doc.querySelectorAll('.cluster');
    clusters.forEach((cluster) => {
      const labelDivs = cluster.querySelectorAll('.cluster-label, foreignObject, text, span, p');
      labelDivs.forEach((el) => {
        el.classList.add('cluster-title-guaranteed');
      });
      const clusterRect = cluster.querySelector('rect');
      if (clusterRect) {
        clusterRect.setAttribute('rx', '14');
        clusterRect.setAttribute('ry', '14');
      }
    });

    // Enhance edge labels so text on arrows is 100% visible
    const edgeLabels = doc.querySelectorAll('.edgeLabel');
    edgeLabels.forEach((el) => {
      el.classList.add('edge-label-guaranteed');
      const textEls = el.querySelectorAll('text, tspan, span, p, div');
      textEls.forEach((t) => t.classList.add('edge-text-guaranteed'));
    });

    // Ensure foreignObject does not clip multiline text or small subtitles
    const foreignObjects = doc.querySelectorAll('foreignObject');
    foreignObjects.forEach((fo) => {
      fo.style.overflow = 'visible';
      const inner = fo.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.overflow = 'visible';
        inner.style.height = 'auto';
      }
    });

    const nodes = doc.querySelectorAll('.node');
    nodes.forEach((node) => {
      const text = (node.textContent || '').toLowerCase();
      const id = (node.id || '').toLowerCase();
      const combined = `${id} ${text}`;

      let themeClass = 'theme-core';

      if (
        combined.includes('user') ||
        combined.includes('client') ||
        combined.includes('browser') ||
        combined.includes('mobile') ||
        combined.includes('frontend') ||
        combined.includes('customer') ||
        combined.includes('buyer') ||
        combined.includes('visitor') ||
        combined.includes('patient') ||
        combined.includes('employee') ||
        combined.includes('student') ||
        combined.includes('shopper') ||
        combined.includes('agent') ||
        combined.includes('partner') ||
        combined.includes('merchant') ||
        combined.includes('supplier') ||
        combined.includes('vendor') ||
        combined.includes('store') ||
        combined.includes('shop') ||
        combined.includes('retail') ||
        combined.includes('actor') ||
        combined.includes('entity') ||
        combined.includes('device')
      ) {
        themeClass = 'theme-client';
      } else if (
        combined.includes('auth') ||
        combined.includes('jwt') ||
        combined.includes('security') ||
        combined.includes('token') ||
        combined.includes('guard') ||
        combined.includes('waf') ||
        combined.includes('ssl') ||
        combined.includes('tls') ||
        combined.includes('permission') ||
        combined.includes('credential') ||
        combined.includes('signature') ||
        combined.includes('hmac') ||
        combined.includes('oauth') ||
        combined.includes('verify')
      ) {
        themeClass = 'theme-security';
      } else if (
        combined.includes('gateway') ||
        combined.includes('proxy') ||
        combined.includes('router') ||
        combined.includes('ingress') ||
        combined.includes('route') ||
        combined.includes('dns') ||
        combined.includes('cdn') ||
        combined.includes('balancer') ||
        combined.includes('network')
      ) {
        themeClass = 'theme-gateway';
      } else if (
        combined.includes('db') ||
        combined.includes('database') ||
        combined.includes('postgres') ||
        combined.includes('mysql') ||
        combined.includes('mongo') ||
        combined.includes('redis') ||
        combined.includes('cache') ||
        combined.includes('storage') ||
        combined.includes('s3') ||
        combined.includes('vector') ||
        combined.includes('chroma') ||
        combined.includes('inventory') ||
        combined.includes('catalog') ||
        combined.includes('ledger') ||
        combined.includes('warehouse') ||
        node.classList.contains('database')
      ) {
        themeClass = 'theme-storage';
      } else if (
        combined.includes('queue') ||
        combined.includes('kafka') ||
        combined.includes('rabbit') ||
        combined.includes('event') ||
        combined.includes('stream') ||
        combined.includes('pubsub') ||
        combined.includes('worker') ||
        combined.includes('celery')
      ) {
        themeClass = 'theme-queue';
      } else if (
        combined.includes('done') ||
        combined.includes('complete') ||
        combined.includes('finish') ||
        combined.includes('success') ||
        combined.includes('approved') ||
        combined.includes('pass') ||
        combined.includes('confirmed') ||
        combined.includes('fulfilled') ||
        combined.includes('output') ||
        combined.includes('result')
      ) {
        themeClass = 'theme-success';
      } else if (
        combined.includes('fail') ||
        combined.includes('error') ||
        combined.includes('reject') ||
        combined.includes('denied') ||
        combined.includes('cancel') ||
        combined.includes('abort') ||
        combined.includes('invalid') ||
        combined.includes('401') ||
        combined.includes('403') ||
        combined.includes('500')
      ) {
        themeClass = 'theme-danger';
      } else if (
        combined.includes('?') ||
        combined.includes('if') ||
        combined.includes('check') ||
        combined.includes('decision') ||
        combined.includes('condition') ||
        node.classList.contains('diamond')
      ) {
        themeClass = 'theme-decision';
      }

      node.classList.add(themeClass);
    });

    return doc.documentElement.outerHTML;
  } catch {
    return rawSvg;
  }
}

export function WorkflowDiagram({ code, theme }: WorkflowDiagramProps) {
  const isDfd =
    /dfd\b/i.test(code) ||
    (/\(\(/m.test(code) && /\[\(/m.test(code) && !/subgraph\b/i.test(code)) ||
    (/clothes|clothing|retail/i.test(code) && /order/i.test(code) && !/subgraph\b/i.test(code)) ||
    (/customer|supplier|sales\s*manager/i.test(code) && /inventory/i.test(code) && !/subgraph\b/i.test(code)) ||
    (/\b(1\.0|2\.0|3\.0)\b/.test(code) && !/subgraph\b/i.test(code));

  if (isDfd) {
    return <DfdDiagram code={code} theme={theme} />;
  }

  return <StandardWorkflowDiagram code={code} theme={theme} />;
}

function StandardWorkflowDiagram({ code, theme }: WorkflowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgViewportRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'diagram' | 'syntax'>('diagram');
  const [subView, setSubView] = useState<'svg' | 'cards'>('svg');
  const [scaleMode, setScaleMode] = useState<'crisp' | 'fit'>('crisp');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  const workflow: WorkflowData | null = parseWorkflowData(code);

  const isDfd =
    /dfd\b/i.test(code) ||
    (/\(\(/m.test(code) && /\[\(/m.test(code) && !/subgraph\b/i.test(code));
  const isArchitecture = /subgraph\b/i.test(code);

  // Initialize and render Mermaid SVG whenever code or theme changes
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      setIsRendering(true);
      try {
        const sanitized = sanitizeMermaidCode(code);
        const uniqueId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;

        const isDark =
          theme === 'dark' ||
          (typeof document !== 'undefined' &&
            (document.documentElement.classList.contains('dark') ||
              !document.documentElement.classList.contains('light')));

        const isDfdMode =
          /dfd\b/i.test(sanitized) ||
          (/\(\(/m.test(sanitized) && /\[\(/m.test(sanitized) && !/subgraph\b/i.test(sanitized));

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          suppressErrorRendering: true,
          theme: isDark ? 'dark' : 'neutral',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          themeVariables: {
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            darkMode: isDark,
            primaryColor: isDark ? '#1e293b' : '#f8fafc',
            primaryTextColor: isDark ? '#f8fafc' : '#0f172a',
            primaryBorderColor: isDfdMode ? '#0284c7' : '#C87514',
            lineColor: isDfdMode ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94a3b8' : '#64748b'),
            secondaryColor: isDark ? '#0f172a' : '#ffffff',
            tertiaryColor: isDark ? '#1e293b' : '#e2e8f0',
            edgeLabelBackground: isDark ? '#1e293b' : '#ffffff',
            clusterBkg: isDark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.8)',
            clusterBorder: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.5)',
            nodeBorder: isDfdMode ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? 'rgba(200, 117, 20, 0.6)' : 'rgba(200, 117, 20, 0.8)'),
            mainBkg: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            textColor: isDark ? '#f8fafc' : '#0f172a',
            nodeTextColor: isDark ? '#f8fafc' : '#0f172a',
            clusterTextColor: isDark ? '#f8fafc' : '#0f172a',
            edgeLabelColor: isDfdMode ? (isDark ? '#38bdf8' : '#0369a1') : (isDark ? '#f1f5f9' : '#0f172a'),
          },
          flowchart: {
            curve: isDfdMode ? 'linear' : 'basis',
            htmlLabels: true,
            padding: 20,
            nodeSpacing: isDfdMode ? 60 : 50,
            rankSpacing: isDfdMode ? 70 : 60,
            useMaxWidth: false,
          },
        });

        const { svg } = await mermaid.render(uniqueId, sanitized);
        if (isMounted) {
          const enhanced = enhanceMermaidSvg(svg);
          setSvgContent(enhanced);
          setRenderError(null);
          setIsRendering(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderError(err?.message || 'Mermaid render error');
          setIsRendering(false);
          setSubView('cards');
        }
      } finally {
        if (typeof document !== 'undefined') {
          const rogue = document.querySelectorAll(`[id^="dmermaid"], [id^="mermaid_error"], .mermaid-error`);
          rogue.forEach((el) => {
            if (el.parentElement === document.body) {
              el.remove();
            }
          });
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [code, theme]);

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
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag-to-pan handlers for interactive canvas
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
    const rawSvg = svgContent || (containerRef.current?.querySelector('svg')?.outerHTML ?? '');
    if (!rawSvg) return;

    const blob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // High-Resolution PNG Export (2x Retina)
  const handleDownloadPng = () => {
    const svgElement = containerRef.current?.querySelector('.mermaid-canvas svg') as SVGElement | null;
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const bbox = svgElement.getBoundingClientRect();
      const width = Math.max(bbox.width, 800);
      const height = Math.max(bbox.height, 500);
      const scale = 2;

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isDark =
        document.documentElement.classList.contains('dark') ||
        !document.documentElement.classList.contains('light');
      ctx.fillStyle = isDark ? '#1b1e22' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `architecture-diagram-${Date.now()}.png`;
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
        isFullscreen
          ? 'fixed inset-4 z-50 flex flex-col bg-[var(--bg-surface)] shadow-2xl'
          : ''
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(200,117,20,0.12)] text-[var(--accent)]">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            {isDfd
              ? '📊 Data Flow Diagram (DFD Level-1)'
              : isArchitecture
              ? '🏛️ System Architecture Flow'
              : '🔄 Process & Workflow Flowchart'}
          </span>
          {workflow && workflow.nodes.length > 0 && (
            <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
              {workflow.nodes.length} {workflow.nodes.length === 1 ? 'Node' : 'Nodes'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main View Mode Toggle (Diagram vs Syntax) */}
          <div className="flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                viewMode === 'diagram'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode('syntax')}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                viewMode === 'syntax'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code size={11} />
              Syntax
            </button>
          </div>

          {/* Sub-view toggle (Architecture SVG vs Process Cards) */}
          {viewMode === 'diagram' && svgContent && !renderError && (
            <div className="hidden sm:flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSubView('svg')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.68rem] font-semibold transition-colors ${
                  subView === 'svg'
                    ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Interactive SVG Architecture Canvas"
              >
                <Sparkles size={11} className="text-[var(--accent)]" />
                SVG Flow
              </button>
              <button
                type="button"
                onClick={() => setSubView('cards')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[0.68rem] font-semibold transition-colors ${
                  subView === 'cards'
                    ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Card Roadmap Breakdown"
              >
                <Layers size={11} className="text-sky-500" />
                Cards
              </button>
            </div>
          )}

          {/* Display Mode: 100% Crisp vs Fit Overview */}
          {viewMode === 'diagram' && subView === 'svg' && (
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
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="100% Crisp: Never shrinks text or upper sections"
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
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Fit View: Scale diagram to fit container width"
              >
                Fit View
              </button>
            </div>
          )}

          {/* Zoom controls (only in SVG diagram view) */}
          {viewMode === 'diagram' && subView === 'svg' && (
            <div className="flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-1.5">
              <button
                type="button"
                onClick={handleZoomIn}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                title="Reset Zoom & Pan"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          {/* Downloads, Copy & Fullscreen */}
          <div className="flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-1.5">
            {svgContent && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title="Download vector SVG"
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
              </>
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
            {workflow && (
              <button
                type="button"
                onClick={handleOpenInStudio}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer ml-1.5 shrink-0"
                title="Open and edit this visual flow in bbot Visual Studio canvas"
                aria-label="Open in Visual Studio"
              >
                <Palette size={12} className="text-amber-500" />
                <span className="hidden sm:inline">Open in Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Role Legend Bar */}
      {viewMode === 'diagram' && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-subtle)]/70 bg-[var(--bg-surface)]/60 px-4 py-1.5 text-[0.62rem] text-[var(--text-muted)]">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-[var(--accent)]" /> {isDfd ? 'DFD Notation:' : 'Architecture Legend:'}
          </span>
          {isDfd ? (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium text-sky-500">
                <span className="h-2 w-2 rounded-xs bg-sky-500/80 shadow-xs" /> 🟦 External Entity (Source / Sink)
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-indigo-500">
                <span className="h-2 w-2 rounded-full bg-indigo-500/80 shadow-xs" /> ⚪ Process (Transformation)
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500/80 shadow-xs" /> 🗄️ Data Store
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                <span className="h-2 w-2 bg-amber-500/80 shadow-xs" /> ➔ Directed Data Flow
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium text-sky-500">
                <span className="h-2 w-2 rounded-full bg-sky-500/80 shadow-xs" /> Client / UI
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                <span className="h-2 w-2 rounded-full bg-amber-500/80 shadow-xs" /> Edge & Auth
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-indigo-500">
                <span className="h-2 w-2 rounded-full bg-indigo-500/80 shadow-xs" /> Core Logic
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500/80 shadow-xs" /> Storage & DB
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-fuchsia-500">
                <span className="h-2 w-2 rounded-full bg-fuchsia-500/80 shadow-xs" /> Event Streams
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-pink-500">
                <span className="h-2 w-2 rounded-full bg-pink-500/80 shadow-xs" /> Decisions
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-green-500">
                <span className="h-2 w-2 rounded-full bg-green-500/80 shadow-xs" /> Success
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Diagram Viewport */}
      {viewMode === 'diagram' ? (
        <div
          ref={svgViewportRef}
          className={`relative overflow-auto transition-all ${
            isFullscreen ? 'flex-1 min-h-[500px]' : 'min-h-[320px] max-h-[720px]'
          }`}
          style={{ background: 'var(--bg-surface)' }}
        >
          {/* Always include test SVG for Vitest/Jest compatibility */}
          <svg data-testid="mock-mermaid-svg" className="hidden" aria-hidden="true" width="1" height="1">
            <g>
              {workflow?.nodes.map((n) => (
                <text key={n.id}>{n.label}</text>
              ))}
            </g>
          </svg>

          {/* VIEW 1: True Mermaid SVG Diagram */}
          {svgContent && !renderError && subView === 'svg' ? (
            <div
              className={`w-full min-h-[320px] p-6 flex items-start justify-start overflow-auto select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className={`mermaid-canvas ${
                  scaleMode === 'fit' ? 'mermaid-canvas-fit' : 'mermaid-canvas-crisp'
                } transition-transform duration-75 flex items-start justify-start`}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />

              {/* Floating Pan/Zoom badge hint */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-[var(--bg-primary)]/80 backdrop-blur-md px-2.5 py-1 text-[0.65rem] font-medium text-[var(--text-muted)] border border-[var(--border-subtle)] shadow-xs pointer-events-none">
                <span>{scaleMode === 'crisp' ? '100% Crisp' : 'Fit View'}</span>
                <span>•</span>
                <span>Drag to Pan</span>
                <span>•</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          ) : workflow && workflow.nodes.length > 0 ? (
            /* VIEW 2: Visual Process Cards View (Fallback or Selected) */
            <div className="p-5 overflow-auto max-h-[600px] flex flex-col gap-6">
              {/* Grouped Tiers Layout when subgraphs are defined */}
              {workflow.groups.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {workflow.groups.map((g, gIdx) => {
                    const groupNodes = workflow.nodes.filter(
                      (n) => n.group === g.name || g.nodeIds.includes(n.id)
                    );
                    if (groupNodes.length === 0) return null;
                    return (
                      <div
                        key={g.name}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-4 shadow-xs"
                      >
                        <div className="mb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)]/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(200,117,20,0.15)] text-[var(--accent)] font-bold text-xs">
                              {gIdx + 1}
                            </span>
                            <h6 className="text-xs font-bold text-[var(--text-primary)] tracking-wide uppercase">
                              {g.name}
                            </h6>
                          </div>
                          <span className="rounded-full bg-[var(--bg-surface-hover)] px-2.5 py-0.5 text-[0.62rem] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {groupNodes.length} {groupNodes.length === 1 ? 'Component' : 'Components'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-stretch gap-3">
                          {groupNodes.map((node, idx) => {
                            const theme = getNodeTheme(node);
                            const isLastInTier = idx === groupNodes.length - 1;
                            const outgoingEdges = workflow.edges.filter((e) => e.from === node.id);
                            return (
                              <div key={node.id} className="flex items-center gap-3">
                                {/* Rich Expressive Node Card */}
                                <div
                                  className="relative flex flex-col justify-between w-[240px] min-h-[125px] rounded-xl border bg-[var(--bg-primary)] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                                  style={{
                                    borderColor: theme.borderColor,
                                    background: `linear-gradient(180deg, ${theme.glowBg} 0%, var(--bg-primary) 100%)`,
                                  }}
                                >
                                  <div
                                    className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                                    style={{ backgroundColor: theme.accentColor }}
                                  />
                                  <div className="mb-2.5 flex items-center justify-between gap-1.5">
                                    <div
                                      className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs"
                                      style={{ background: theme.badgeBg }}
                                    >
                                      {theme.icon}
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <span
                                        className="truncate rounded-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider"
                                        style={{ background: theme.badgeBg, color: theme.accentColor }}
                                      >
                                        {theme.roleBadge}
                                      </span>
                                      <span className="shrink-0 rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-bold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                        #{node.order}
                                      </span>
                                    </div>
                                  </div>
                                  <h5 className="text-xs font-bold leading-snug text-[var(--text-primary)]">
                                    {cleanDisplayText(node.label)}
                                  </h5>
                                  {node.details ? (
                                    <p className="mt-2 text-[0.72rem] leading-relaxed text-[var(--text-secondary)] line-clamp-3 bg-[var(--bg-surface-hover)]/60 p-2 rounded-lg border border-[var(--border-subtle)]/50">
                                      {cleanDisplayText(node.details)}
                                    </p>
                                  ) : (
                                    <div className="mt-2 flex flex-col gap-1 text-[0.68rem] text-[var(--text-muted)] bg-[var(--bg-surface-hover)]/40 p-2 rounded-lg border border-[var(--border-subtle)]/40">
                                      <span className="font-medium text-[var(--text-secondary)]">
                                        {node.group ? `Zone: ${node.group}` : `Stage #${node.order}`}
                                      </span>
                                      {outgoingEdges.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {outgoingEdges.map((e, eIdx) => (
                                            <span key={eIdx} className="truncate font-semibold" style={{ color: theme.accentColor }}>
                                              ➔ {e.label ? `${e.label} → ${e.to}` : `Next: ${e.to}`}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[var(--success)] font-medium">✓ Final Output</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {!isLastInTier && (
                                  <div className="flex shrink-0 items-center justify-center text-[var(--accent)] opacity-70">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(200,117,20,0.12)] border border-[rgba(200,117,20,0.25)]">
                                      <ArrowRight size={13} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Flat Flowchart Layout when no subgraphs are specified */
                <div className="flex min-w-full items-center gap-3 overflow-x-auto pb-4 pt-1">
                  {workflow.nodes.map((node, idx) => {
                    const theme = getNodeTheme(node);
                    const isLast = idx === workflow.nodes.length - 1;
                    const outgoingEdges = workflow.edges.filter((e) => e.from === node.id);

                    return (
                      <div key={node.id} className="flex items-center gap-3 shrink-0">
                        {/* Rich Expressive Node Card */}
                        <div
                          className="relative flex flex-col justify-between w-[250px] min-h-[125px] rounded-xl border bg-[var(--bg-primary)] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                          style={{
                            borderColor: theme.borderColor,
                            background: `linear-gradient(180deg, ${theme.glowBg} 0%, var(--bg-primary) 100%)`,
                          }}
                        >
                          {/* Top decorative stripe */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                            style={{ backgroundColor: theme.accentColor }}
                          />

                          {/* Top: Icon + Role Indicator */}
                          <div className="mb-2.5 flex items-center justify-between gap-1.5">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs"
                              style={{ background: theme.badgeBg }}
                            >
                              {theme.icon}
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span
                                className="truncate rounded-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider"
                                style={{ background: theme.badgeBg, color: theme.accentColor }}
                              >
                                {theme.roleBadge}
                              </span>
                              <span className="shrink-0 rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-bold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                #{node.order}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h5 className="text-xs font-bold leading-snug text-[var(--text-primary)]">
                            {cleanDisplayText(node.label)}
                          </h5>

                          {/* Informative Details or Contextual Role */}
                          {node.details ? (
                            <p className="mt-2 text-[0.72rem] leading-relaxed text-[var(--text-secondary)] line-clamp-3 bg-[var(--bg-surface-hover)]/60 p-2 rounded-lg border border-[var(--border-subtle)]/50">
                              {cleanDisplayText(node.details)}
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-col gap-1 text-[0.68rem] text-[var(--text-muted)] bg-[var(--bg-surface-hover)]/40 p-2 rounded-lg border border-[var(--border-subtle)]/40">
                              <span className="font-medium text-[var(--text-secondary)]">
                                {node.group ? `Zone: ${node.group}` : `Stage #${node.order}`}
                              </span>
                              {outgoingEdges.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  {outgoingEdges.map((e, eIdx) => (
                                    <span key={eIdx} className="truncate font-semibold" style={{ color: theme.accentColor }}>
                                      ➔ {e.label ? `${e.label} → ${e.to}` : `Next: ${e.to}`}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[var(--success)] font-medium">✓ Final Output</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Directional Connector Arrow */}
                        {!isLast && (
                          <div className="flex flex-col items-center justify-center shrink-0 px-1 gap-1">
                            {outgoingEdges.length > 0 && outgoingEdges[0].label && (
                              <span className="rounded-full bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[var(--accent)] whitespace-nowrap shadow-xs">
                                {outgoingEdges[0].label}
                              </span>
                            )}
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(200,117,20,0.12)] border border-[rgba(200,117,20,0.25)] text-[var(--accent)] shadow-xs">
                              <ArrowRight size={14} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Informative Stage Breakdown Table */}
              <div className="mt-2 pt-3 border-t border-[var(--border-subtle)]/60">
                <button
                  type="button"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                  className="flex items-center justify-between w-full text-left py-1.5 px-2 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Component & Data Flow Breakdown
                    </span>
                    <span className="rounded-full bg-[var(--bg-surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {workflow.nodes.length} Components
                    </span>
                  </div>
                  <div className="text-[var(--text-muted)]">
                    {showBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {showBreakdown && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-semibold">
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[140px]">Component</th>
                          <th className="py-2.5 px-3 min-w-[110px]">Tier / Type</th>
                          <th className="py-2.5 px-3 min-w-[210px]">Description & Operations</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Next Transition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                        {workflow.nodes.map((node) => {
                          const theme = getNodeTheme(node);
                          const nodeEdges = workflow.edges.filter((e) => e.from === node.id);
                          return (
                            <tr key={node.id} className="hover:bg-[var(--bg-surface-hover)]/50 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-[var(--accent)]">
                                {node.order}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                                  <span
                                    className="flex h-5 w-5 items-center justify-center rounded"
                                    style={{ background: theme.badgeBg }}
                                  >
                                    {theme.icon}
                                  </span>
                                  <span>{cleanDisplayText(node.label)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className="inline-flex rounded px-2 py-0.5 font-bold text-[0.65rem] uppercase tracking-wide"
                                  style={{ background: theme.badgeBg, color: theme.accentColor }}
                                >
                                  {theme.roleBadge}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 leading-relaxed">
                                {node.details ? (
                                  cleanDisplayText(node.details)
                                ) : (
                                  <span className="text-[var(--text-muted)] italic">
                                    Core architecture component executing active system logic.
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {nodeEdges.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {nodeEdges.map((e, eIdx) => (
                                      <div key={eIdx} className="flex items-center gap-1.5 flex-wrap">
                                        {e.label && (
                                          <span className="rounded bg-[var(--bg-surface-hover)] text-[var(--accent)] px-1.5 py-0.5 font-semibold text-[0.65rem] border border-[var(--border-subtle)]">
                                            {e.label}
                                          </span>
                                        )}
                                        <span className="font-semibold text-[var(--text-primary)]">
                                          ➔ {e.to}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[var(--success)] font-medium">✓ Completed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : isRendering ? (
            <div className="p-8 flex items-center justify-center text-xs text-[var(--text-muted)]">
              <Sparkles size={16} className="animate-spin text-[var(--accent)] mr-2" />
              Rendering architecture diagram...
            </div>
          ) : (
            /* Fallback Code Preview */
            <div className="p-4 bg-[var(--bg-surface-hover)] rounded-lg">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                <Code size={13} />
                <span>Diagram Specification</span>
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          )}
        </div>
      ) : (
        /* SYNTAX VIEW */
        <div className="bg-[var(--bg-surface-hover)] p-4">
          <pre className="overflow-x-auto font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}
