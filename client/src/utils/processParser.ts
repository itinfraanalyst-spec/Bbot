export interface ProcessStep {
  number: number;
  title: string;
  description?: string;
}

/**
 * Safely parses process/workflow text into structured steps.
 * Crash-proof: always wraps in try-catch and returns null on failure.
 */
export function parseProcessFlow(content: string): ProcessStep[] | null {
  try {
    if (!content || typeof content !== 'string') return null;

    const raw = content.trim();
    if (!raw) return null;

    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('graph ') && !line.startsWith('flowchart '));

    if (lines.length === 0) return null;

    // Case 1: Single or few lines with inline arrows (e.g. "Step 1 -> Step 2 -> Step 3")
    if (lines.length === 1 && (lines[0].includes('->') || lines[0].includes('-->') || lines[0].includes('➔'))) {
      const parts = lines[0].split(/(?:-->|->|➔)/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts.map((part, idx) => {
          const clean = part
            .replace(/^[A-Za-z0-9_]+\s*\[(.*?)\]$/, '$1')
            .replace(/^\[(.*?)\]$/, '$1')
            .replace(/^\((.*?)\)$/, '$1')
            .trim();
          const colonMatch = clean.match(/^([^:\n]{2,40}):\s*(.*)$/);
          if (colonMatch) {
            return {
              number: idx + 1,
              title: colonMatch[1].trim(),
              description: colonMatch[2].trim(),
            };
          }
          return {
            number: idx + 1,
            title: clean,
            description: '',
          };
        });
      }
    }

    const steps: ProcessStep[] = [];

    // Case 2: Multi-line steps or Mermaid graph definitions
    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      // Handle standard Step prefixes: Step 1:, 1., 1), [Step 1], etc.
      const prefixMatch = line.match(/^(?:Step\s*\d+[:.]?|\d+[.:)]|\[Step\s*\d+\])\s*(.*)$/i);
      if (prefixMatch) {
        const textToParse = prefixMatch[1].trim();
        let title = textToParse;
        let description = '';

        if (textToParse.includes('->')) {
          const arrowSplit = textToParse.split(/->\s*(.*)/);
          title = arrowSplit[0].trim();
          description = arrowSplit[1]?.trim() || '';
        } else if (textToParse.includes(':')) {
          const colonSplit = textToParse.split(/:\s*(.*)/);
          title = colonSplit[0].trim();
          description = colonSplit[1]?.trim() || '';
        } else if (textToParse.includes(' - ')) {
          const dashSplit = textToParse.split(/\s+-\s+(.*)/);
          title = dashSplit[0].trim();
          description = dashSplit[1]?.trim() || '';
        }

        title = title.replace(/\*\*/g, '').trim();
        description = description.replace(/\*\*/g, '').trim();

        if (title) {
          steps.push({
            number: steps.length + 1,
            title,
            description,
          });
        }
        continue;
      }

      // Handle Mermaid arrow syntax: A[Step 1] --> B[Step 2]
      if (line.includes('-->') || line.includes('->')) {
        const parts = line.split(/(?:-->|->)/).map((s) => s.trim()).filter(Boolean);
        for (const p of parts) {
          const bracketMatch = p.match(/(?:[A-Za-z0-9_]+)?\s*\[(.*?)\]/) || p.match(/(?:[A-Za-z0-9_]+)?\s*\((.*?)\)/);
          const rawTitle = bracketMatch ? bracketMatch[1].trim() : p.replace(/^[A-Za-z0-9_]+\[?/, '').replace(/\]?$/, '').trim();
          const cleanTitle = rawTitle.replace(/\*\*/g, '').trim();
          if (cleanTitle && !steps.some((s) => s.title.toLowerCase() === cleanTitle.toLowerCase())) {
            steps.push({
              number: steps.length + 1,
              title: cleanTitle,
              description: '',
            });
          }
        }
        continue;
      }

      let title = line;
      let description = '';
      if (line.includes('->')) {
        const arrowSplit = line.split(/->\s*(.*)/);
        title = arrowSplit[0].trim();
        description = arrowSplit[1]?.trim() || '';
      } else if (line.includes(':')) {
        const colonSplit = line.split(/:\s*(.*)/);
        title = colonSplit[0].trim();
        description = colonSplit[1]?.trim() || '';
      }
      title = title.replace(/\*\*/g, '').trim();
      description = description.replace(/\*\*/g, '').trim();
      if (title) {
        steps.push({
          number: steps.length + 1,
          title,
          description,
        });
      }
    }

    return steps.length >= 2 ? steps : null;
  } catch {
    return null;
  }
}
