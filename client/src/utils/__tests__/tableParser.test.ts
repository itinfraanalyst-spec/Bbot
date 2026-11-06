import { describe, it, expect } from 'vitest';
import { parseMarkdownTable, parseNumericCell, cleanMarkdownLabel } from '../tableParser';

describe('tableParser', () => {
  describe('cleanMarkdownLabel', () => {
    it('strips bold, italics, backticks', () => {
      expect(cleanMarkdownLabel('**CFO / Controller**')).toBe('CFO / Controller');
      expect(cleanMarkdownLabel('*AP/AR Manager*')).toBe('AP/AR Manager');
      expect(cleanMarkdownLabel('`Metric A`')).toBe('Metric A');
    });
  });

  describe('parseNumericCell', () => {
    it('parses valid numeric formats', () => {
      expect(parseNumericCell('$1,000')).toBe(1000);
      expect(parseNumericCell('45%')).toBe(45);
      expect(parseNumericCell('-12.5')).toBe(-12.5);
      expect(parseNumericCell('+200')).toBe(200);
      expect(parseNumericCell('10M')).toBe(10000000);
      expect(parseNumericCell('5k')).toBe(5000);
      expect(parseNumericCell('(500)')).toBe(-500);
      expect(parseNumericCell('0')).toBe(0);
    });

    it('rejects sentences and non-numeric prose containing casual numbers', () => {
      expect(parseNumericCell('Oversees approvals over $5,000')).toBeNull();
      expect(parseNumericCell('Approves up to -5,000 and reviews ledger entries')).toBeNull();
      expect(parseNumericCell('Cannot initiate payments')).toBeNull();
      expect(parseNumericCell('Section 2.1 - 4')).toBeNull();
      expect(parseNumericCell('Requires 2 independent sign-offs')).toBeNull();
    });
  });

  describe('parseMarkdownTable', () => {
    it('DOES NOT create charts for SOP/text tables with descriptive columns (User bug scenario)', () => {
      const sopTable = `
| Role | Primary Responsibilities | Prohibited Actions |
| :--- | :--- | :--- |
| **CFO / Controller** | Oversees financial reporting and approves payments over $5,000. | Cannot initiate payments. |
| **AP/AR Manager** | Approves up to -5,000 and reviews ledger entries. | Cannot approve wire transfers. |
| **Accountant** | Prepares journal entries and reconciles bank statements. | Cannot approve payments. |
| **Treasury Analyst** | Monitors cash flows and liquidity. | Cannot execute unauthorized transfers. |
`;
      const result = parseMarkdownTable(sopTable);
      expect(result).toBeNull();
    });

    it('creates charts for genuine quantitative data tables', () => {
      const financialTable = `
| Quarter | Revenue ($M) | Expenses ($M) |
| :--- | :--- | :--- |
| Q1 2024 | $12.5M       | $8.2M         |
| Q2 2024 | $14.1M       | $9.0M         |
| Q3 2024 | $15.8M       | $9.7M         |
| Q4 2024 | $18.2M       | $11.0M        |
`;
      const result = parseMarkdownTable(financialTable);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      const chart = result![0];
      expect(chart.xAxisKey).toBe('Quarter');
      expect(chart.dataKeys).toEqual(['Revenue ($M)', 'Expenses ($M)']);
      expect(chart.data).toHaveLength(4);
      expect(chart.data[0]['Revenue ($M)']).toBe(12500000);
      expect(chart.data[0]['Expenses ($M)']).toBe(8200000);
    });

    it('excludes text columns from mixed tables and keeps only numeric columns', () => {
      const mixedTable = `
| Department | Headcount | Notes |
| :--- | :--- | :--- |
| Sales      | 45        | High growth |
| R&D        | 120       | Core team |
| Marketing  | 25        | Stable |
`;
      const result = parseMarkdownTable(mixedTable);
      expect(result).not.toBeNull();
      const chart = result![0];
      expect(chart.dataKeys).toEqual(['Headcount']);
      expect(chart.dataKeys).not.toContain('Notes');
    });

    it('returns null for tables with fewer than 2 rows', () => {
      const singleRow = `
| Metric | Value |
| :--- | :--- |
| Users  | 100   |
`;
      expect(parseMarkdownTable(singleRow)).toBeNull();
    });
  });
});
