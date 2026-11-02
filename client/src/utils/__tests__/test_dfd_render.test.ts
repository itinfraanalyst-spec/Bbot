import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowDiagram } from '../../components/chat/WorkflowDiagram';
import { sanitizeMermaidCode } from '../mermaidSanitizer';

describe('DFD render test', () => {
  const code = `
flowchart TD
    Customer["Customer"]
    ClothesStore["Clothes Store"]
    OrderClothes(("Order<br/>clothes"))
    InventoryStore[("Inventory")]
    OrderStore[("Order")]
    GenerateReports(("Generate<br/>reports"))
    SalesManager["Sales<br/>manager"]
    OrderInventory(("Order<br/>inventory"))
    Supplier["Supplier"]

    Customer -->|Order| OrderClothes
    OrderClothes -->|Bill| Customer
    OrderClothes -->|Order| ClothesStore
    OrderClothes -->|Inventory details| InventoryStore
    OrderClothes -->|Order| OrderStore

    InventoryStore -->|Inventory details| GenerateReports
    OrderStore -->|Orders| GenerateReports
    GenerateReports -->|Reports| SalesManager

    SalesManager -->|Inventory order| OrderInventory
    OrderInventory -->|Inventory order| Supplier
    OrderInventory -->|Inventory details| InventoryStore
  `;

  it('sanitizes DFD code cleanly without dropping nodes', () => {
    const sanitized = sanitizeMermaidCode(code);
    expect(sanitized).toContain('Customer');
    expect(sanitized).toContain('OrderClothes');
    expect(sanitized).toContain('InventoryStore');
    expect(sanitized).toContain('GenerateReports');
  });

  it('renders DFD via native SVG engine without crashing', () => {
    render(React.createElement(WorkflowDiagram, { code }));
    expect(screen.getByText(/DATA FLOW DIAGRAM \(DFD LEVEL-1\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/9\s*Components/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer/i).length).toBeGreaterThan(0);
  });
});

