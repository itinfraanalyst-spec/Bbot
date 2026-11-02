/**
 * Auto-sanitizes and repairs common LLM syntax quirks in Mermaid diagram code:
 * 1. Extra angle brackets or malformed pipe labels: `-->|Label|>` -> `-->|Label|`
 * 2. Unquoted node identifiers with spaces: `Order data store(label)` -> `Order_data_store(label)`
 * 3. Quoted node IDs before shape brackets: `"Delivered"("Delivered")` -> `Delivered("Delivered")`
 * 4. Trailing semicolons on lines or statements: `A --> B;` -> `A --> B`
 * 5. Shapes with cylinders, circles, databases: `[("...")]`, `(("..."))` preserved intact
 * 6. Strips markdown bolding, backticks, and ensures standard graph headers.
 */

function sanitizeNodeToken(token: string): string {
  let trimmed = token.trim();
  if (!trimmed) return '';

  // 1. Remove trailing semicolons or commas
  trimmed = trimmed.replace(/[;,]+$/, '').trim();
  if (!trimmed) return '';

  // 2. Detect shape brackets
  // Find the opening of any shape delimiter: [, (, {, >
  const shapeIndex = trimmed.search(/[\[\(\{>]/);
  if (shapeIndex > 0) {
    let rawId = trimmed.slice(0, shapeIndex).trim();
    let bracketPart = trimmed.slice(shapeIndex).trim();

    // Strip quotes and normalize whitespace/special chars in rawId
    rawId = rawId.replace(/["']/g, '').replace(/[\s\t-]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const safeId = rawId || 'node';

    // If rounded node `( ... )` (not `((...))` and not `([...]`):
    // If the inner content has unquoted parentheses, wrap inner content in quotes so Mermaid doesn't close early
    if (/^\([^([][\s\S]*[^)\]]\)$/.test(bracketPart)) {
      const inner = bracketPart.slice(1, -1).trim();
      if (!inner.startsWith('"') && !inner.startsWith("'") && /[()]/.test(inner)) {
        bracketPart = `("${inner.replace(/"/g, "'")}")`;
      }
    }

    return `${safeId}${bracketPart}`;
  }

  // 3. Node without leading ID, but starts with a bracket e.g. ["Product Delivered"] or [Customer]
  if (shapeIndex === 0) {
    const innerText = trimmed.replace(/^[\[\(\{>]+\s*|[\s*\]\)\}]+$/g, '').replace(/["']/g, '').trim();
    const safeId = innerText.replace(/[\s\t-]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'node';
    return `${safeId}${trimmed}`;
  }

  // 4. Token without brackets
  // If it's wrapped in quotes, e.g. "Customer" or "Delivered"
  const strippedQuotes = trimmed.replace(/^["']|["']$/g, '').trim();

  // If already a clean identifier (no spaces and only alphanumeric/underscore)
  if (/^[a-zA-Z0-9_]+$/.test(strippedQuotes)) {
    return strippedQuotes;
  }

  // Multi-word phrase without brackets (e.g. "Sales manager" or "Order data store")
  const safeId = strippedQuotes.replace(/[\s\t-]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const cleanLabel = strippedQuotes.replace(/"/g, "'");
  return `${safeId || 'node'}["${cleanLabel}"]`;
}

export function splitTopLevelArrows(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let bracketDepth = 0;
  let i = 0;

  const arrowPattern = /^(\s*(?:<-->|<==>|<-.->|-->|==>|-\.->|---|->|<--|<-|<-\.-|<===|===|-.-|--)\s*(?:\|[^|\n\r]+\|)?\s*)/;
  const labelArrowPattern = /^(\s*--\s*[^-\n\r]+?-->\s*)/;

  while (i < line.length) {
    const ch = line[i];
    const prevCh = i > 0 ? line[i - 1] : '';

    if (ch === '"' && !inSingleQuote && prevCh !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      i++;
      continue;
    }
    if (ch === "'" && !inDoubleQuote && prevCh !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += ch;
      i++;
      continue;
    }

    if (inDoubleQuote || inSingleQuote) {
      current += ch;
      i++;
      continue;
    }

    if (ch === '[' || ch === '(' || ch === '{') {
      bracketDepth++;
      current += ch;
      i++;
      continue;
    }
    if (ch === ']' || ch === ')' || ch === '}') {
      if (bracketDepth > 0) bracketDepth--;
      current += ch;
      i++;
      continue;
    }

    if (bracketDepth === 0) {
      const rest = line.slice(i);
      const labelMatch = rest.match(labelArrowPattern);
      if (labelMatch) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
        parts.push(labelMatch[1]);
        i += labelMatch[1].length;
        continue;
      }

      const arrowMatch = rest.match(arrowPattern);
      if (arrowMatch) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
        parts.push(arrowMatch[1]);
        i += arrowMatch[1].length;
        continue;
      }
    }

    current += ch;
    i++;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function sanitizeConnectionLine(line: string): string {
  const parts = splitTopLevelArrows(line);

  if (parts.length <= 1) {
    return line;
  }

  // Alternating: Even index = node token, Odd index = arrow token
  return parts
    .map((part, index) => {
      if (index % 2 === 1) {
        // Normalize `-- Label -->` to ` -->|Label| `
        const labelArrowMatch = part.match(/^\s*--\s*([^-\n\r]+?)\s*-->\s*$/);
        if (labelArrowMatch) {
          const label = labelArrowMatch[1].trim();
          return ` -->|${label}| `;
        }
        // Ensure proper spacing around arrows
        const trimmedArrow = part.trim();
        return ` ${trimmedArrow} `;
      }
      return sanitizeNodeToken(part);
    })
    .join('');
}

function repairPseudoPieInsideFlowchart(code: string): string {
  // If the diagram has graph/flowchart header AND contains pseudo-pie blocks like:
  // pie PieA("Apple") \n label "340.0B" \n value "..."
  if (!/(?:graph|flowchart)\b/i.test(code) || !/\bpie\s+[A-Za-z0-9_]/i.test(code)) {
    return code;
  }

  const lines = code.split('\n');
  const repaired: string[] = [];
  let currentPieNode: { id: string; label: string; details: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const pieMatch = line.match(/^pie\s+([A-Za-z0-9_]+)\s*[[({](["']?)(.*?)\2[\])}]/i);
    if (pieMatch) {
      if (currentPieNode) {
        const detailsStr = currentPieNode.details.length > 0 ? `<br/><small>${currentPieNode.details.join(' | ')}</small>` : '';
        repaired.push(`${currentPieNode.id}["🥧 <b>${currentPieNode.label}</b>${detailsStr}"]`);
      }
      currentPieNode = {
        id: pieMatch[1],
        label: pieMatch[3],
        details: [],
      };
      continue;
    }

    if (currentPieNode) {
      const valMatch = line.match(/^(?:label|value|data|val)\s*[:=]?\s*["']?(.*?)["']?[;,]?$/i);
      if (valMatch) {
        currentPieNode.details.push(valMatch[1].replace(/["']/g, ''));
        continue;
      } else {
        const detailsStr = currentPieNode.details.length > 0 ? `<br/><small>${currentPieNode.details.join(' | ')}</small>` : '';
        repaired.push(`${currentPieNode.id}["🥧 <b>${currentPieNode.label}</b>${detailsStr}"]`);
        currentPieNode = null;
      }
    }

    repaired.push(lines[i]);
  }

  if (currentPieNode) {
    const detailsStr = currentPieNode.details.length > 0 ? `<br/><small>${currentPieNode.details.join(' | ')}</small>` : '';
    repaired.push(`${currentPieNode.id}["🥧 <b>${currentPieNode.label}</b>${detailsStr}"]`);
  }

  return repaired.join('\n');
}

export function sanitizeMermaidCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return '';

  let code = rawCode.trim();
  // Strip Markdown fences
  code = code.replace(/^```(?:mermaid)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // If this is a native pie chart, return clean code directly without mutating into flowchart nodes
  if (/^pie\b/i.test(code)) {
    return code;
  }

  // Repair pseudo-pie charts that were mixed into flowchart syntax
  code = repairPseudoPieInsideFlowchart(code);

  // Remove bolding inside text
  code = code.replace(/\*\*(.*?)\*\*/g, '$1');

  // Strip backticks inside code
  code = code.replace(/`([^`\n]+)`/g, "'$1'");

  // Handle semicolons that separate statements on a single line (unless inside quotes)
  const rawLines = code.split('\n');
  const expandedLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if line contains statement-separating semicolons (e.g. A --> B; C --> D;)
    if (/;\s*[a-zA-Z0-9_"']/.test(trimmed)) {
      const splitStmts = trimmed.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      for (const stmt of splitStmts) {
        const cleanStmt = stmt.trim();
        if (cleanStmt) expandedLines.push(cleanStmt);
      }
    } else {
      expandedLines.push(trimmed);
    }
  }

  // Disambiguate duplicate node definitions declared in multiple subgraphs
  // e.g. If both subgraph Frontend and subgraph Gateway declare Success["..."],
  // rename the second one to Gateway_Success so Mermaid doesn't collapse them all into Frontend.
  const disambiguatedLines: string[] = [];
  let curSub: string | null = null;
  const declaredSubMap = new Map<string, string>(); // nodeId -> first subgraph
  const subRenames = new Map<string, Map<string, string>>(); // subId -> (origId -> newId)

  // Pass 1: detect duplicates across subgraphs
  for (const rawLine of expandedLines) {
    let line = rawLine.trim();
    // Normalize subgraph headers
    const subMatch = line.match(/^subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[\s*["']?(.*?)["']?\s*\])?(.*)$/i);
    const numSubMatch = line.match(/^subgraph\s+([0-9]+)\s+([A-Za-z0-9_-]+)(?:\s*\[\s*["']?(.*?)["']?\s*\])?(.*)$/i);
    
    if (subMatch || numSubMatch) {
      curSub = numSubMatch ? `${numSubMatch[2]}_${numSubMatch[1]}` : subMatch![1];
      if (!subRenames.has(curSub)) subRenames.set(curSub, new Map());
      continue;
    }
    if (/^end\b/i.test(line)) {
      curSub = null;
      continue;
    }
    if (curSub && !/(?:-->|--|==>|-\.->|->|<--)/.test(line)) {
      const nodeDefMatch = line.match(/^([A-Za-z0-9_]+)\s*[[({]/);
      if (nodeDefMatch) {
        const rawId = nodeDefMatch[1];
        if (declaredSubMap.has(rawId)) {
          const firstSub = declaredSubMap.get(rawId)!;
          if (firstSub !== curSub) {
            const newId = `${curSub}_${rawId}`;
            subRenames.get(curSub)!.set(rawId, newId);
          }
        } else {
          declaredSubMap.set(rawId, curSub);
        }
      }
    }
  }

  // Pass 2: apply renames within each subgraph
  curSub = null;
  for (const rawLine of expandedLines) {
    let line = rawLine.trim();
    const subMatch = line.match(/^subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[\s*["']?(.*?)["']?\s*\])?(.*)$/i);
    const numSubMatch = line.match(/^subgraph\s+([0-9]+)\s+([A-Za-z0-9_-]+)(?:\s*\[\s*["']?(.*?)["']?\s*\])?(.*)$/i);

    if (numSubMatch) {
      curSub = `${numSubMatch[2]}_${numSubMatch[1]}`;
      const title = (numSubMatch[3] || numSubMatch[2]).trim().replace(/"/g, "'");
      disambiguatedLines.push(`subgraph ${curSub} ["${title}"]${numSubMatch[4] || ''}`);
      continue;
    } else if (subMatch) {
      curSub = subMatch[1];
      const title = (subMatch[2] || curSub).trim().replace(/"/g, "'");
      disambiguatedLines.push(`subgraph ${curSub} ["${title}"]${subMatch[3] || ''}`);
      continue;
    }

    if (/^end\b/i.test(line)) {
      curSub = null;
      disambiguatedLines.push(line);
      continue;
    }

    if (curSub && subRenames.has(curSub)) {
      const renames = subRenames.get(curSub)!;
      for (const [origId, newId] of renames.entries()) {
        const regex = new RegExp(`\\b${origId}\\b`, 'g');
        line = line.replace(regex, newId);
      }
    }

    disambiguatedLines.push(line);
  }

  const sanitizedLines: string[] = [];
  let hasDiagramHeader = false;
  const headerRegex = /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|quadrantChart|xychart|block-beta)\b/i;

  for (let line of disambiguatedLines) {
    // Strip trailing semicolons or commas from each line
    line = line.replace(/[;,]+\s*$/, '').trim();
    if (!line) continue;

    // Check if this line is diagram header
    if (headerRegex.test(line)) {
      hasDiagramHeader = true;
      sanitizedLines.push(line);
      continue;
    }

    // Auto-fix LLM writing `class <name> fill:...` instead of `classDef <name> fill:...`
    if (/^class\s+([A-Za-z0-9_-]+)\s+(?:fill|stroke|color|stroke-width):/i.test(line)) {
      line = line.replace(/^class\b/i, 'classDef');
    }

    // Fix arrow label quirks:
    // 1. -->|Label|> Target  =>  -->|Label| Target
    line = line.replace(/(-->|--|==>|-\.->|->|<--|<-->)\s*\|([^|\n\r]+)\|\s*>/g, '$1|$2| ');
    // 2. ->|Label| Target   =>  -->|Label| Target
    line = line.replace(/(^|\s)->\|([^|\n\r]+)\|/g, '$1-->|$2| ');
    // 3. --|Label|--> Target =>  -->|Label| Target
    line = line.replace(/--\|([^|\n\r]+)\|-->/g, '-->|$1| ');
    // 4. Stray pipe-brackets: |> => |
    line = line.replace(/\|\s*>\s*/g, '| ');

    // Normalize raw markdown bullets inside node labels e.g. <br/>- Text => <br/><small>Text</small>
    line = line.replace(/<br\s*\/?>\s*[-•]\s*(.*?)(["'\])}])/gi, '<br/><small>$1</small>$2');

    // Subgraphs, styles, and directives
    if (/^(?:subgraph|end|style|classDef|class|click|%%)\b/i.test(line)) {
      sanitizedLines.push(line);
      continue;
    }

    // Sanitize node identifiers and connections on lines with arrows
    if (/(?:<-->|<==>|<-.->|-->|==>|-\.->|---|->|<--|<-)/.test(line)) {
      line = sanitizeConnectionLine(line);
    } else {
      // Standalone node definitions
      line = sanitizeNodeToken(line);
    }

    sanitizedLines.push(line);
  }

  let result = sanitizedLines.join('\n');
  if (!hasDiagramHeader) {
    result = `graph TD\n${result}`;
  }

  return result;
}
