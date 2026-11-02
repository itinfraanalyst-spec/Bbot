import { splitTopLevelArrows } from './mermaidSanitizer';

export interface WorkflowNode {
  id: string;
  label: string;
  shape: 'box' | 'round' | 'diamond' | 'circle' | 'database';
  group?: string;
  details?: string;
  order: number;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowGroup {
  name: string;
  nodeIds: string[];
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  groups: WorkflowGroup[];
  isLinear: boolean;
}

/**
 * Robust, crash-proof parser for Mermaid, Flowchart, Process, and Workflow syntax.
 * NEVER throws syntax errors. Tolerates malformed LLM outputs gracefully.
 */
export function parseWorkflowData(rawCode: string): WorkflowData | null {
  if (!rawCode || typeof rawCode !== 'string') return null;

  const clean = rawCode
    .replace(/^```(?:mermaid|flowchart|process|workflow|steps|pipeline|diagram)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!clean || /^pie\b/i.test(clean)) return null;

  const lines = clean.split('\n');
  const nodesMap = new Map<string, WorkflowNode>();
  const edges: WorkflowEdge[] = [];
  const groupsMap = new Map<string, string[]>();
  let currentGroup: string | null = null;
  let orderCounter = 1;

  function registerNode(
    rawId: string | undefined,
    rawLabel: string | undefined,
    shape: 'box' | 'round' | 'diamond' | 'circle' | 'database' = 'box',
    details?: string
  ): WorkflowNode | null {
    const candidateId = (rawId || rawLabel || '').trim();
    if (!candidateId) return null;

    // Clean id: strip quotes, brackets, and illegal punctuation
    const cleanId = candidateId.replace(/["'{}[\]()]/g, '').trim();
    if (!cleanId || cleanId.toLowerCase() === 'graph' || cleanId.toLowerCase() === 'flowchart') {
      return null;
    }

    let cleanLabel = (rawLabel || cleanId).replace(/["'{}[\]()]/g, '').trim() || cleanId;
    let nodeDetails = details;

    // Split title and subtitle if label contains <br/> or line break
    if (cleanLabel.includes('<br') || cleanLabel.includes('\n')) {
      const parts = cleanLabel.split(/<br\s*\/?>|\n/i);
      cleanLabel = parts[0].trim();
      if (!nodeDetails && parts.length > 1) {
        nodeDetails = parts.slice(1).join(' ').trim();
      }
    }

    // Strip HTML tags (e.g. <b>, </b>, <small>, </small>, etc.)
    cleanLabel = cleanLabel.replace(/<[^>]+>/g, '').trim();
    if (nodeDetails) {
      nodeDetails = nodeDetails.replace(/<[^>]+>/g, '').replace(/^[-\s:•]+/, '').trim();
    }

    if (!nodeDetails) {
      if (cleanLabel.includes(': ')) {
        const [t, d] = cleanLabel.split(/:\s*(.*)/);
        if (t.trim() && d.trim()) {
          cleanLabel = t.trim();
          nodeDetails = d.trim();
        }
      } else if (cleanLabel.includes(' - ')) {
        const [t, d] = cleanLabel.split(/\s+-\s+(.*)/);
        if (t.trim() && d.trim()) {
          cleanLabel = t.trim();
          nodeDetails = d.trim();
        }
      }
    }

    const existing = nodesMap.get(cleanId);

    if (existing) {
      // If declared in a different group with a different label, treat as a distinct stage node
      if (currentGroup && existing.group && currentGroup !== existing.group && rawLabel && cleanLabel !== existing.label) {
        const uniqueId = `${cleanId}_${orderCounter}`;
        const uniqueNode: WorkflowNode = {
          id: uniqueId,
          label: cleanLabel,
          shape,
          group: currentGroup,
          details: nodeDetails,
          order: orderCounter++,
        };
        nodesMap.set(uniqueId, uniqueNode);
        const gList = groupsMap.get(currentGroup) || [];
        if (!gList.includes(uniqueId)) gList.push(uniqueId);
        groupsMap.set(currentGroup, gList);
        return uniqueNode;
      }

      if (rawLabel && (!existing.label || existing.label === existing.id)) {
        existing.label = cleanLabel;
      }
      if (shape !== 'box') existing.shape = shape;
      if (nodeDetails && !existing.details) existing.details = nodeDetails;
      if (currentGroup && !existing.group) {
        existing.group = currentGroup;
        const gList = groupsMap.get(currentGroup) || [];
        if (!gList.includes(cleanId)) gList.push(cleanId);
        groupsMap.set(currentGroup, gList);
      }
      return existing;
    }

    const newNode: WorkflowNode = {
      id: cleanId,
      label: cleanLabel,
      shape,
      group: currentGroup || undefined,
      details: nodeDetails,
      order: orderCounter++,
    };

    nodesMap.set(cleanId, newNode);

    if (currentGroup) {
      const gList = groupsMap.get(currentGroup) || [];
      if (!gList.includes(cleanId)) gList.push(cleanId);
      groupsMap.set(currentGroup, gList);
    }

    return newNode;
  }

  function extractNodeFromToken(token: string): WorkflowNode | null {
    if (!token) return null;
    let t = token.trim().replace(/^[;,]+|[;,]+$/g, '').trim();
    // Strip trailing Mermaid class annotations e.g. Node["Label"]:::client or A:::client
    t = t.replace(/(?:::+[A-Za-z0-9_-]+)$/, '').trim();
    if (!t) return null;

    // Database: [("db")] or [(db)]
    let m = t.match(/^([A-Za-z0-9_ -]+)?\s*\[\(\s*["']?(.*?)["']?\s*\)\]/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'database');

    // Circle: ((label))
    m = t.match(/^([A-Za-z0-9_ -]+)?\s*\(\(\s*["']?(.*?)["']?\s*\)\)/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'circle');

    // Stadium / Pill: ([label])
    m = t.match(/^([A-Za-z0-9_ -]+)?\s*\(\[\s*["']?(.*?)["']?\s*\]\)/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'round');

    // Diamond: {"label"} or {label}
    m = t.match(/^([A-Za-z0-9_ -]+)?\s*\{\s*["']?(.*?)["']?\s*\}/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'diamond');

    // Round: (label)
    m = t.match(/^([A-Za-z0-9_ -]+)?\s*\(\s*["']?(.*?)["']?\s*\)/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'round');

    // Box: [label]
    m = t.match(/^([A-Za-z0-9_ -]+)?\s*\[\s*["']?(.*?)["']?\s*\]/);
    if (m) return registerNode(m[1] || m[2], m[2] || m[1], 'box');

    // Clean word or identifier
    const cleanWord = t.replace(/["']/g, '').trim();
    if (
      cleanWord &&
      !/^(?:graph|flowchart|subgraph|end|style|classDef|class|click|%%)\b/i.test(cleanWord) &&
      !/^(?:TD|TB|BT|RL|LR)$/i.test(cleanWord)
    ) {
      return registerNode(cleanWord, cleanWord, 'box');
    }
    return null;
  }

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.startsWith('//') || line.startsWith('#')) {
      continue;
    }

    // Subgraph / group
    const subMatch = line.match(/^subgraph\s+([^{}\n\r()]+)(.*)$/i);
    if (subMatch) {
      currentGroup = subMatch[1].trim().replace(/["']/g, '');
      if (!groupsMap.has(currentGroup)) {
        groupsMap.set(currentGroup, []);
      }
      const rest = subMatch[2]?.trim();
      if (rest) {
        // Extract any nodes trapped inside the broken subgraph declaration
        const nodeTokens = rest.match(/([A-Za-z0-9_]+\s*[[({].*?[\])}]|(?:\{[^{}]+\})|(?:\[[^[\]]+\])|\b[A-Za-z0-9_]+\b)/g);
        if (nodeTokens) {
          for (const tok of nodeTokens) {
            extractNodeFromToken(tok);
          }
        }
      }
      continue;
    }

    if (/^end\b/i.test(line)) {
      currentGroup = null;
      continue;
    }

    // Skip diagram headers like "graph TD"
    if (/^(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)/i.test(line)) {
      continue;
    }

    // Step prefixes: Step 1:, 1., [Step 1], etc.
    const stepMatch = line.match(/^(?:Step\s*\d+[:.]?|\d+[.:)]|\[Step\s*\d+\])\s*(.*)$/i);
    if (stepMatch) {
      const text = stepMatch[1].trim();
      let title = text;
      let details = '';

      if (text.includes('->')) {
        const [t, d] = text.split(/->\s*(.*)/);
        title = t.trim();
        details = d?.trim() || '';
      } else if (text.includes(':')) {
        const [t, d] = text.split(/:\s*(.*)/);
        title = t.trim();
        details = d?.trim() || '';
      } else if (text.includes(' - ')) {
        const [t, d] = text.split(/\s+-\s+(.*)/);
        title = t.trim();
        details = d?.trim() || '';
      }

      title = title.replace(/\*\*/g, '').trim();
      details = details.replace(/\*\*/g, '').trim();

      const node = registerNode(title, title, 'box', details);
      if (node && nodesMap.size > 1) {
        // Automatically link sequential numbered steps
        const allNodes = Array.from(nodesMap.values());
        const prev = allNodes[allNodes.length - 2];
        if (prev && !edges.some((e) => e.from === prev.id && e.to === node.id)) {
          edges.push({
            from: prev.id,
            to: node.id,
          });
        }
      }
      continue;
    }

    // Arrow connections: -->, ->, ==>, -.->, ➔, etc.
    const parts = splitTopLevelArrows(line);
    if (parts.length > 1) {
      let prevNode: WorkflowNode | null = null;
      let edgeLabel: string | undefined = undefined;

      for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim();
        if (!part) continue;

        // Odd indices are arrow tokens (e.g. -->|Label| or -->)
        if (i % 2 === 1) {
          const arrowLabelMatch = part.match(/\|([^|\n\r]+)\|/);
          if (arrowLabelMatch) {
            edgeLabel = arrowLabelMatch[1].trim();
          }
          continue;
        }

        // Check if part starts with |label| (fallback)
        const labelMatch = part.match(/^\|([^|]+)\|\s*(.*)$/);
        if (labelMatch) {
          edgeLabel = labelMatch[1].trim();
          part = labelMatch[2].trim();
        }

        // Check for colon description: [Node B]: description
        const colonMatch = part.match(/^(.*?):\s*([^:]+)$/);
        if (colonMatch && (colonMatch[1].includes('[') || colonMatch[1].includes('('))) {
          part = colonMatch[1].trim();
          edgeLabel = colonMatch[2].trim();
        }

        const currNode = extractNodeFromToken(part);
        if (currNode) {
          if (prevNode) {
            edges.push({
              from: prevNode.id,
              to: currNode.id,
              label: edgeLabel,
            });
            edgeLabel = undefined;
          }
          prevNode = currNode;
        }
      }
      continue;
    }

    // Check for definition/explanation lines: "- Name: Description" or "1. Name: Description"
    const defMatch = line.match(/^[-*•\d.)\s]*([A-Za-z0-9_ -]{2,50}):\s*([^\n]{5,})$/);
    if (defMatch) {
      const k = defMatch[1].trim();
      const v = defMatch[2].trim();
      const target = Array.from(nodesMap.values()).find(
        (n) => n.id.toLowerCase() === k.toLowerCase() || n.label.toLowerCase() === k.toLowerCase()
      );
      if (target && !target.details) {
        target.details = v;
        continue;
      }
    }

    // Standalone node or statement
    extractNodeFromToken(line);
  }

  const nodes = Array.from(nodesMap.values());
  if (nodes.length === 0) return null;

  // Determine if linear pipeline
  const isLinear =
    edges.length > 0 &&
    edges.length === nodes.length - 1 &&
    new Set(edges.map((e) => e.from)).size === edges.length &&
    new Set(edges.map((e) => e.to)).size === edges.length;

  const groups: WorkflowGroup[] = Array.from(groupsMap.entries())
    .filter(([_, ids]) => ids.length > 0)
    .map(([name, ids]) => ({ name, nodeIds: ids }));

  return {
    nodes,
    edges,
    groups,
    isLinear,
  };
}

/**
 * Converts parsed WorkflowData into a standard Visual Studio DiagramSpec
 * ready for direct interactive canvas rendering and editing.
 */
export function workflowDataToDiagramSpec(
  wf: WorkflowData,
  title?: string,
  rawCode?: string
): any {
  const shapeMap: Record<string, string> = {
    box: 'card',
    round: 'pill',
    diamond: 'diamond',
    circle: 'pill',
    database: 'cylinder',
  };

  const typeMap: Record<string, string> = {
    box: 'process',
    round: 'start',
    diamond: 'decision',
    circle: 'concept',
    database: 'store',
  };

  const nodes = wf.nodes.map((n, idx) => ({
    id: n.id,
    label: n.label,
    sublabel: n.details || undefined,
    badge: String(idx + 1).padStart(2, '0'),
    type: typeMap[n.shape] || 'process',
    order: idx + 1,
    customStyle: {
      shape: shapeMap[n.shape] || 'card',
    },
  }));

  const edges = wf.edges.map((e, idx) => ({
    id: `e_${e.from}_${e.to}_${idx}`,
    source: e.from,
    target: e.to,
    label: e.label || undefined,
    style: 'solid' as const,
  }));

  return {
    version: '2.0',
    diagramType: wf.isLinear ? 'process_flow' : 'timeline',
    title: title || 'System Flowchart & Architecture',
    summary: `Interactive visual workflow with ${nodes.length} stages and ${edges.length} connectors.`,
    theme: 'bbot-dark',
    viewMode: 'canvas',
    nodes,
    edges,
    mermaid_code: rawCode,
  };
}

