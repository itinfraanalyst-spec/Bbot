/**
 * Clean markdown markup (bold, italics, backticks, escaped chars)
 */
export function cleanMarkdownLabel(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .replace(/`+/g, '')
    .replace(/\\/g, '')
    .trim();
}

/**
 * Strict parser for numeric cell values.
 * Returns a number ONLY if the cell represents a standalone quantitative value
 * (e.g., "$1,250", "45%", "-15.4", "10M", "5.2k", "(500)").
 * Returns null if the cell is descriptive text, prose, or a sentence with a casual number.
 */
export function parseNumericCell(raw: string): number | null {
  if (!raw) return null;
  const clean = cleanMarkdownLabel(raw);
  if (!clean) return null;

  // 1. Accounting parentheses format: (1,234.50) -> -1234.50
  const parenMatch = /^\(([0-9,.]+)\)$/.exec(clean);
  if (parenMatch) {
    const n = parseFloat(parenMatch[1].replace(/,/g, ''));
    return isNaN(n) ? null : -n;
  }

  // 2. Strict quantitative pattern:
  // Must be a standalone number with optional currency symbol, commas, decimals, percent, or metric suffix (K/M/B)
  // Rejects sentences like "Approves expenses over $5,000" or "Section 2.1 - 4"
  const strictNumberPattern = /^[+-]?\s*[\$€£¥₹]?\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:[%kKmMbB]|USD|EUR|INR|GBP)?$/i;
  if (!strictNumberPattern.test(clean)) {
    return null;
  }

  // 3. Multiplier suffix handling
  let multiplier = 1;
  const upper = clean.toUpperCase().trim();
  if (upper.endsWith('K')) multiplier = 1e3;
  else if (upper.endsWith('M')) multiplier = 1e6;
  else if (upper.endsWith('B')) multiplier = 1e9;

  const isNegative = clean.startsWith('-') || clean.includes(' -');
  const pureNumStr = clean.replace(/[^0-9.]/g, '');
  if (!pureNumStr) return null;

  const parsed = parseFloat(pureNumStr);
  if (isNaN(parsed)) return null;

  const rawNum = (isNegative ? -parsed : parsed) * multiplier;
  // Clean floating point artifacts (e.g. 8.2 * 1e6 = 8199999.999999999)
  return Math.round(rawNum * 1e6) / 1e6;
}

export interface ParsedChartData {
  xAxisKey: string;
  dataKeys: string[];
  data: Array<Record<string, any>>;
}

/**
 * Parses markdown tables from text and converts them into chart structures ONLY
 * if they are genuinely quantitative data tables with consistent numeric columns.
 */
export function parseMarkdownTable(markdown: string): ParsedChartData[] | null {
  if (!markdown || typeof markdown !== 'string') return null;

  // Regex to match markdown tables
  const tableRegex = /\|(.+)\|(\r?\n\|[-:\s|]+\|\r?\n)((?:\|.+\|\r?\n?)+)/g;
  const matches = [...markdown.matchAll(tableRegex)];
  
  if (matches.length === 0) return null;

  try {
    const chartsData: (ParsedChartData | null)[] = matches.map(match => {
      const headerRow = match[1];
      const dataRows = match[3]
        .trim()
        .split(/\r?\n/)
        .filter(r => r.trim().startsWith('|'));

      // Need at least 2 data rows for a meaningful chart
      if (dataRows.length < 2) return null;

      const rawHeaders = headerRow.split('|').map(h => cleanMarkdownLabel(h)).filter(Boolean);
      if (rawHeaders.length < 2) return null;

      const xAxisKey = rawHeaders[0];
      const potentialDataKeys = rawHeaders.slice(1);

      // Parse rows
      const parsedRows = dataRows.map(row => {
        // Extract cells between pipe delimiters
        const rawCells = row.split('|').map(c => c.trim());
        // Handle leading/trailing empty cells from outer pipes
        const cells = rawCells.filter((_, i, arr) => i > 0 && i < arr.length - 1);
        return cells;
      });

      // For each potential dataKey column, evaluate how many rows are genuinely numeric
      const validDataKeys: string[] = [];
      const columnParsedValues: Record<string, (number | null)[]> = {};

      potentialDataKeys.forEach((key, colIdx) => {
        const values: (number | null)[] = [];
        let numericCount = 0;

        parsedRows.forEach(cells => {
          const rawCell = cells[colIdx + 1] || '';
          const num = parseNumericCell(rawCell);
          values.push(num);
          if (num !== null && !isNaN(num)) {
            numericCount++;
          }
        });

        // Strict validation: At least 75% of rows in this column MUST be valid numbers
        // and there must be at least 2 numeric values
        const numericRatio = values.length > 0 ? numericCount / values.length : 0;
        if (numericRatio >= 0.75 && numericCount >= 2) {
          validDataKeys.push(key);
          columnParsedValues[key] = values;
        }
      });

      // If no columns qualify as genuinely numeric metrics, DO NOT RENDER A CHART!
      // This protects text tables, SOP tables, comparison matrices, etc.
      if (validDataKeys.length === 0) return null;

      // Construct clean chart rows
      const chartRows: Array<Record<string, any>> = [];

      parsedRows.forEach((cells, rowIdx) => {
        const rawLabel = cells[0] || `Item ${rowIdx + 1}`;
        const cleanRowLabel = cleanMarkdownLabel(rawLabel) || `Item ${rowIdx + 1}`;
        
        const rowData: Record<string, any> = {
          [xAxisKey]: cleanRowLabel,
        };

        let hasAtLeastOneNumber = false;

        validDataKeys.forEach(key => {
          const val = columnParsedValues[key]?.[rowIdx];
          if (val !== null && val !== undefined && !isNaN(val)) {
            rowData[key] = val;
            hasAtLeastOneNumber = true;
          } else {
            // Safe fallback for an occasional missing row in a numeric column
            rowData[key] = 0;
          }
        });

        if (hasAtLeastOneNumber) {
          chartRows.push(rowData);
        }
      });

      // Require at least 2 valid chart rows
      if (chartRows.length < 2) return null;

      return {
        xAxisKey,
        dataKeys: validDataKeys,
        data: chartRows,
      };
    });

    const validCharts = chartsData.filter((c): c is ParsedChartData => c !== null);
    return validCharts.length > 0 ? validCharts : null;
  } catch (e) {
    return null;
  }
}
