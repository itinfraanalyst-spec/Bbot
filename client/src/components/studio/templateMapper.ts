import type { DiagramSpec, NodeSpec, EdgeSpec } from './types';

export interface DatasetItem {
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: string;
}

export const SAMPLE_DATASETS: { id: string; name: string; description: string; items: DatasetItem[] }[] = [
  {
    id: 'ml_pipeline',
    name: 'AI / ML Training Lifecycle',
    description: 'Data Sourcing → Preprocessing → Model Training → Evaluation → Production Endpoint',
    items: [
      { label: 'Data Ingestion & Sinks', sublabel: 'Stream telemetry from Kafka & S3 buckets', badge: '01', icon: 'Database' },
      { label: 'Feature Engineering', sublabel: 'Normalization, tokenization & embeddings', badge: '02', icon: 'Zap' },
      { label: 'Distributed Training', sublabel: 'PyTorch multi-GPU cluster checkpoints', badge: '03', icon: 'Cpu' },
      { label: 'Model Validation & QA', sublabel: 'Accuracy benchmarks & bias threshold checks', badge: '04', icon: 'Shield' },
      { label: 'Deployment & Gateway', sublabel: 'Triton inference cluster with auto-scaling', badge: '05', icon: 'Target' },
    ],
  },
  {
    id: 'ecommerce_order',
    name: 'E-Commerce Order Fulfillment',
    description: 'Cart Checkout → Payment Auth → Warehouse Dispatch → Carrier Delivery',
    items: [
      { label: 'Checkout & Cart Lock', sublabel: 'Validate inventory & apply promo coupons', badge: '01', icon: 'Box' },
      { label: 'Payment Gateway Auth', sublabel: '3D-Secure card capture & fraud scoring', badge: '02', icon: 'Lock' },
      { label: 'Warehouse Pick & Pack', sublabel: 'Automated barcode scan & packaging', badge: '03', icon: 'Layers' },
      { label: 'Last-Mile Delivery', sublabel: 'Courier GPS tracking & customer SMS alerts', badge: '04', icon: 'Send' },
    ],
  },
  {
    id: 'incident_ops',
    name: 'IT Ops Incident Triage & Resolution',
    description: 'Alert Ingress → Severity Assessment → Runbook Execution → RCA Postmortem',
    items: [
      { label: 'Alert Detection', sublabel: 'Prometheus SLA breach trigger fired', badge: 'P1', icon: 'Activity' },
      { label: 'On-Call Escalation', sublabel: 'PagerDuty dispatch to primary engineer', badge: 'P2', icon: 'Users' },
      { label: 'Mitigation Runbook', sublabel: 'Failover traffic to secondary region', badge: 'P3', icon: 'Zap' },
      { label: 'Root Cause Postmortem', sublabel: 'Document timeline & preventative action items', badge: 'P4', icon: 'FileText' },
    ],
  },
  {
    id: 'user_funnel',
    name: 'Customer Onboarding & Activation',
    description: 'Visitor → Sign-Up → Workspace Setup → Team Invite → Paid Conversion',
    items: [
      { label: 'Organic Visitor', sublabel: 'Landing page visit from search or campaign', badge: 'S1', icon: 'Globe' },
      { label: 'Account Sign-Up', sublabel: 'Email verification & OAuth authentication', badge: 'S2', icon: 'Users' },
      { label: 'Workspace Setup', sublabel: 'Project initialization & template selection', badge: 'S3', icon: 'Box' },
      { label: 'Team Collaboration', sublabel: 'Inviting colleagues & creating shared visuals', badge: 'S4', icon: 'Share2' },
      { label: 'Enterprise Upgrade', sublabel: 'Premium subscription & SLA activation', badge: 'S5', icon: 'Target' },
    ],
  },
];

/**
 * Parses raw user-supplied text (lines, CSV, or JSON) into structured DatasetItem objects.
 */
export function parseDatasetText(raw: string): DatasetItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // 1. Try parsing JSON array
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const items: DatasetItem[] = [];
      arr.forEach((entry, i) => {
        if (typeof entry === 'string') {
          items.push({ label: entry, badge: String(i + 1).padStart(2, '0') });
        } else if (typeof entry === 'object' && entry !== null) {
          const label = entry.label || entry.name || entry.title || entry.stage || `Stage ${i + 1}`;
          const sublabel = entry.sublabel || entry.description || entry.desc || entry.subtitle || entry.details;
          const badge = entry.badge || entry.id || String(i + 1).padStart(2, '0');
          const icon = entry.icon;
          items.push({ label: String(label), sublabel: sublabel ? String(sublabel) : undefined, badge: String(badge), icon: icon ? String(icon) : undefined });
        }
      });
      if (items.length > 0) return items;
    } catch {
      // not valid JSON, proceed to line/CSV parsing
    }
  }

  // 2. Parse Line-by-Line or CSV
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: DatasetItem[] = [];

  lines.forEach((line, i) => {
    // Strip leading numbers or bullets like "1. ", "01. ", "- ", "* "
    let cleanLine = line.replace(/^[\d]+[\.\)\-\:]\s*/, '').replace(/^[\*\-\•]\s*/, '').trim();

    // Check for [Badge] bracket annotation e.g. [Critical], [P1], [Stage 1]
    let lineBadge: string | undefined = undefined;
    const badgeMatch = cleanLine.match(/\[(.*?)\]/);
    if (badgeMatch) {
      lineBadge = badgeMatch[1].trim();
      cleanLine = cleanLine.replace(/\[(.*?)\]/, '').trim();
    }

    // Check for comma or tab separation (CSV/TSV)
    if (cleanLine.includes(',') && !cleanLine.includes(' - ')) {
      const parts = cleanLine.split(',').map((p) => p.trim());
      const firstCol = (parts[0] || '').toLowerCase();
      if (
        parts.length >= 2 &&
        i === 0 &&
        (firstCol === 'label' || firstCol === 'name' || firstCol === 'stage' || firstCol === 'step' || firstCol === 'title')
      ) {
        // Skip CSV header line
        return;
      }
      items.push({
        label: parts[0] || `Stage ${i + 1}`,
        sublabel: parts[1] || undefined,
        badge: lineBadge || parts[2] || String(i + 1).padStart(2, '0'),
        icon: parts[3] || undefined,
      });
      return;
    }

    // Check for " - " or ": " separator between Label and Description
    let label = cleanLine;
    let sublabel: string | undefined = undefined;

    if (cleanLine.includes(' - ')) {
      const parts = cleanLine.split(' - ');
      label = parts[0].trim();
      sublabel = parts.slice(1).join(' - ').trim();
    } else if (cleanLine.includes(': ')) {
      const parts = cleanLine.split(': ');
      label = parts[0].trim();
      sublabel = parts.slice(1).join(': ').trim();
    } else if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map((p) => p.trim());
      label = parts[0];
      sublabel = parts[1] || undefined;
    }

    items.push({
      label,
      sublabel,
      badge: lineBadge || String(i + 1).padStart(2, '0'),
    });
  });

  return items;
}

/**
 * Applies a saved template's design, layout, shapes, sizes, colors, and connectors
 * to an existing diagram / dataset, keeping the dataset's actual labels/content.
 */
export function applyTemplateToDataset(
  templateDiagram: DiagramSpec,
  currentDiagram: DiagramSpec
): DiagramSpec {
  const currentNodes = currentDiagram.nodes || [];
  const tplNodes = templateDiagram.nodes || [];

  if (currentNodes.length === 0 || tplNodes.length === 0) {
    return JSON.parse(JSON.stringify(templateDiagram));
  }

  // Calculate layout delta between template nodes for smooth continuation
  let dx = 290;
  let dy = 0;
  if (tplNodes.length >= 2) {
    const x0 = tplNodes[0].x ?? 100;
    const x1 = tplNodes[1].x ?? 390;
    const y0 = tplNodes[0].y ?? 200;
    const y1 = tplNodes[1].y ?? 200;
    dx = x1 - x0 || 290;
    dy = y1 - y0;
  }

  const mappedNodes: NodeSpec[] = currentNodes.map((node, idx) => {
    const tplNode = tplNodes[idx] || tplNodes[idx % tplNodes.length];
    const isOverflow = idx >= tplNodes.length;

    let posX = tplNode.x ?? (100 + idx * 290);
    let posY = tplNode.y ?? 200;

    if (isOverflow) {
      const lastTpl = tplNodes[tplNodes.length - 1];
      const overflowIndex = idx - tplNodes.length + 1;
      posX = (lastTpl.x ?? 100) + overflowIndex * dx;
      posY = (lastTpl.y ?? 200) + overflowIndex * dy;
    }

    const resolvedShape = (tplNode as any).shape || tplNode.customStyle?.shape || (node as any).shape;

    return {
      ...node,
      type: tplNode.type || node.type,
      width: tplNode.width,
      height: tplNode.height,
      x: posX,
      y: posY,
      ...(resolvedShape ? { shape: resolvedShape } : {}),
      customStyle: {
        ...(tplNode.customStyle || {}),
        ...(resolvedShape ? { shape: resolvedShape } : {}),
      },
    };
  });

  // Re-style connectors to match the template's style
  const tplEdges = templateDiagram.edges || [];
  const defaultEdgeStyle = tplEdges[0]?.customStyle || {
    routing: 'curved',
    strokeWidth: 2,
    strokeStyle: 'solid',
    arrowMarker: 'arrow',
  };

  const adaptedEdges: EdgeSpec[] = (currentDiagram.edges || []).map((edge, idx) => {
    const tplEdge = tplEdges[idx] || tplEdges[idx % Math.max(1, tplEdges.length)] || {};
    const routing = (tplEdge as any).routing || tplEdge.customStyle?.routing;
    const animated = (tplEdge as any).animated !== undefined ? (tplEdge as any).animated : tplEdge.customStyle?.animated;

    return {
      ...edge,
      style: tplEdge.style || edge.style,
      ...(routing ? { routing } : {}),
      ...(animated !== undefined ? { animated } : {}),
      customStyle: {
        ...(defaultEdgeStyle as any),
        ...(tplEdge.customStyle || {}),
        ...(routing ? { routing } : {}),
        ...(animated !== undefined ? { animated } : {}),
      },
    };
  });

  return {
    ...currentDiagram,
    diagramType: templateDiagram.diagramType || currentDiagram.diagramType,
    theme: templateDiagram.theme || currentDiagram.theme,
    canvasLayout: templateDiagram.canvasLayout || currentDiagram.canvasLayout,
    nodes: mappedNodes,
    edges: adaptedEdges.length > 0 ? adaptedEdges : templateDiagram.edges,
  };
}

/**
 * Creates a brand new DiagramSpec by mapping a list of DatasetItems
 * directly into the visual blueprint of a saved template.
 */
export function mapDatasetItemsToTemplate(
  items: DatasetItem[],
  template: DiagramSpec,
  titleOverride?: string
): DiagramSpec {
  if (!items || items.length === 0) {
    return JSON.parse(JSON.stringify(template));
  }

  const tplNodes = template.nodes || [];
  let dx = 290;
  let dy = 0;
  if (tplNodes.length >= 2) {
    const x0 = tplNodes[0].x ?? 100;
    const x1 = tplNodes[1].x ?? 390;
    const y0 = tplNodes[0].y ?? 200;
    const y1 = tplNodes[1].y ?? 200;
    dx = x1 - x0 || 290;
    dy = y1 - y0;
  }

  const newNodes: NodeSpec[] = items.map((item, idx) => {
    const tplNode = tplNodes[idx] || tplNodes[idx % Math.max(1, tplNodes.length)] || {};
    const isOverflow = idx >= tplNodes.length;

    let posX = tplNode.x ?? (100 + idx * 290);
    let posY = tplNode.y ?? 200;

    if (isOverflow && tplNodes.length > 0) {
      const lastTpl = tplNodes[tplNodes.length - 1];
      const overflowIndex = idx - tplNodes.length + 1;
      posX = (lastTpl.x ?? 100) + overflowIndex * dx;
      posY = (lastTpl.y ?? 200) + overflowIndex * dy;
    }

    return {
      id: `node_data_${idx + 1}`,
      label: item.label,
      sublabel: item.sublabel || tplNode.sublabel,
      badge: item.badge || String(idx + 1).padStart(2, '0'),
      type: tplNode.type || 'process',
      order: idx + 1,
      icon: item.icon || tplNode.icon || 'Layers',
      x: posX,
      y: posY,
      width: tplNode.width || 230,
      height: tplNode.height || 110,
      customStyle: {
        ...(tplNode.customStyle || {}),
      },
    };
  });

  // Rebuild sequential edges between dataset nodes using template edge styles
  const tplEdges = template.edges || [];
  const defaultEdgeStyle = tplEdges[0]?.customStyle || {
    routing: 'curved',
    strokeWidth: 2,
    strokeStyle: 'solid',
    arrowMarker: 'arrow',
    color: tplNodes[0]?.customStyle?.borderColor || '#06b6d4',
  };

  const newEdges: EdgeSpec[] = [];
  for (let i = 0; i < newNodes.length - 1; i++) {
    const src = newNodes[i];
    const tgt = newNodes[i + 1];
    const tplEdge = tplEdges[i] || tplEdges[i % Math.max(1, tplEdges.length)] || {};

    newEdges.push({
      id: `e_${src.id}_${tgt.id}`,
      source: src.id,
      target: tgt.id,
      label: tplEdge.label || 'Next',
      style: tplEdge.style || 'solid',
      customStyle: {
        ...(defaultEdgeStyle as any),
        ...(tplEdge.customStyle || {}),
        color: src.customStyle?.borderColor || tplEdge.customStyle?.color || defaultEdgeStyle.color,
      },
    });
  }

  return {
    ...template,
    title: titleOverride || `${template.title || 'Visual Model'} - Dataset View`,
    summary: `Synthesized from custom dataset mapped onto ${(template as any).name || template.title || 'template blueprint'}.`,
    nodes: newNodes,
    edges: newEdges,
  };
}

/**
 * Sanitizes a diagram specification into a pure reusable visual design template.
 * Strips all proprietary text, client details, and specific operational content
 * while keeping 100% of the design, colors, geometry, borders, layout, and connections.
 */
export function sanitizeDiagramBlueprint(
  diagram: DiagramSpec,
  templateName?: string
): DiagramSpec {
  const cloned: DiagramSpec = JSON.parse(JSON.stringify(diagram));
  cloned.title = (templateName || cloned.title || 'Custom Process Blueprint').trim();
  cloned.summary = 'Reusable visual design blueprint. Geometry, layout, and theme preserved.';
  cloned.chartData = undefined;

  if (Array.isArray(cloned.nodes)) {
    cloned.nodes = cloned.nodes.map((node, idx) => {
      const typeStr = String(node.type || 'process').toLowerCase();
      let label = `Phase ${idx + 1}: Step`;
      let sublabel = 'Operational step or task details';

      if (typeStr.includes('decision') || typeStr.includes('gateway')) {
        label = `Decision Gateway ${idx + 1}`;
        sublabel = 'Configure condition / branch logic';
      } else if (typeStr.includes('start')) {
        label = `Initial Stage ${idx + 1}`;
        sublabel = 'Entry point or trigger';
      } else if (typeStr.includes('end')) {
        label = `Terminal State ${idx + 1}`;
        sublabel = 'Outcome / completed milestone';
      } else if (typeStr.includes('store') || typeStr.includes('db') || typeStr.includes('data')) {
        label = `Data Sink / Store ${idx + 1}`;
        sublabel = 'Repository or event sink';
      }

      return {
        ...node,
        badge: String(idx + 1).padStart(2, '0'),
        label,
        sublabel,
      };
    });
  }

  if (Array.isArray(cloned.edges)) {
    cloned.edges = cloned.edges.map((edge) => {
      const lbl = edge.label ? String(edge.label).trim().toLowerCase() : '';
      let newLabel = edge.label;
      if (lbl && ['yes', 'no', 'true', 'false', 'pass', 'fail', 'success', 'error'].includes(lbl)) {
        newLabel = lbl.charAt(0).toUpperCase() + lbl.slice(1);
      } else if (lbl) {
        newLabel = 'Next';
      }
      return {
        ...edge,
        label: newLabel,
      };
    });
  }

  return cloned;
}

/**
 * Adaptively scales a template diagram to an exact target node count.
 * - If targetCount > template.nodes.length: duplicates the styling pattern and geometry
 *   seamlessly continuing the trajectory with sequential connectors.
 * - If targetCount < template.nodes.length: cleanly retains the first targetCount nodes
 *   and ensures valid edge connections.
 */
export function scaleTemplateToStepCount(
  template: DiagramSpec,
  targetCount: number
): DiagramSpec {
  const cloned: DiagramSpec = JSON.parse(JSON.stringify(template));
  const tplNodes = cloned.nodes || [];
  if (tplNodes.length === 0 || targetCount <= 0) return cloned;

  // Calculate trajectory delta
  let dx = 290;
  let dy = 0;
  if (tplNodes.length >= 2) {
    const x0 = tplNodes[0].x ?? 100;
    const x1 = tplNodes[1].x ?? 390;
    const y0 = tplNodes[0].y ?? 200;
    const y1 = tplNodes[1].y ?? 200;
    dx = x1 - x0 || 290;
    dy = y1 - y0;
  }

  const newNodes: NodeSpec[] = [];
  for (let i = 0; i < targetCount; i++) {
    if (i < tplNodes.length) {
      newNodes.push({
        ...tplNodes[i],
        id: `node_step_${i + 1}`,
        order: i + 1,
        label: tplNodes[i].label || `Phase ${i + 1}: Step`,
      });
    } else {
      // Replicate the styling archetype of earlier nodes
      const archetype = tplNodes[i % tplNodes.length];
      const lastNode = newNodes[newNodes.length - 1];
      const posX = (lastNode.x ?? 100) + dx;
      const posY = (lastNode.y ?? 200) + dy;

      newNodes.push({
        id: `node_step_${i + 1}`,
        type: archetype.type || 'process',
        label: `Phase ${i + 1}: Step`,
        sublabel: 'Operational step or task details',
        badge: String(i + 1).padStart(2, '0'),
        order: i + 1,
        icon: archetype.icon || 'Layers',
        x: posX,
        y: posY,
        width: archetype.width || 230,
        height: archetype.height || 110,
        customStyle: {
          ...(archetype.customStyle || {}),
          ...(((archetype as any).shape || archetype.customStyle?.shape) ? { shape: (archetype as any).shape || archetype.customStyle?.shape } : {}),
        },
      });
    }
  }

  // Generate clean sequential edges
  const tplEdges = cloned.edges || [];
  const defaultEdgeStyle = tplEdges[0]?.customStyle || {
    routing: 'curved',
    strokeWidth: 2,
    strokeStyle: 'solid',
    arrowMarker: 'arrow',
    color: '#06b6d4',
  };

  const newEdges: EdgeSpec[] = [];
  for (let i = 0; i < newNodes.length - 1; i++) {
    const src = newNodes[i];
    const tgt = newNodes[i + 1];
    const tplEdge = tplEdges[i] || tplEdges[i % Math.max(1, tplEdges.length)] || {};

    newEdges.push({
      id: `e_${src.id}_${tgt.id}`,
      source: src.id,
      target: tgt.id,
      label: tplEdge.label || 'Next',
      style: tplEdge.style || 'solid',
      customStyle: {
        ...(defaultEdgeStyle as any),
        ...(tplEdge.customStyle || {}),
        routing: (tplEdge as any).routing || tplEdge.customStyle?.routing || 'curved',
        color: src.customStyle?.borderColor || tplEdge.customStyle?.color || defaultEdgeStyle.color,
      },
    });
  }

  return {
    ...cloned,
    nodes: newNodes,
    edges: newEdges,
  };
}

