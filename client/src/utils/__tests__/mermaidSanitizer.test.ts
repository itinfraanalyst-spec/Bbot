import { describe, expect, it } from 'vitest';
import { sanitizeMermaidCode } from '../mermaidSanitizer';

describe('sanitizeMermaidCode', () => {
  it('repairs the exact LLM syntax error reported by user', () => {
    const raw = `\`\`\`mermaid
graph TD
    Customer([Customer]) -->|Place Order|> Order data store(Order clothes)
    Inventory([(Current Stock)]) -->|Update Stock|> Order data store
    Order data store(Order clothes) -->|Generate Report|> Sales manager
    Sales manager -->|Approve Sale|> Supplier(Supplier)
    Supplier -->|Shipment|> Inventory
\`\`\``;

    const sanitized = sanitizeMermaidCode(raw);
    // 1. Should strip the trailing '>' after pipe '|'
    expect(sanitized).not.toContain('|>');
    expect(sanitized).toContain('-->|Place Order|');
    expect(sanitized).toContain('-->|Update Stock|');

    // 2. Should convert multi-word ID 'Order data store' into a safe identifier
    expect(sanitized).toContain('Order_data_store(Order clothes)');

    // 3. Should convert unbracketed 'Sales manager' target into a safe node definition
    expect(sanitized).toContain('Sales_manager["Sales manager"]');

    // 4. Header remains graph TD
    expect(sanitized).toContain('graph TD');
  });

  it('prepends graph TD when header is missing', () => {
    const raw = 'A --> B';
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized.startsWith('graph TD')).toBe(true);
  });

  it('removes markdown bolding inside labels', () => {
    const raw = 'graph TD\n    A[**Customer**] --> B';
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('A[Customer]');
  });

  it('correctly handles the user API workflow diagram with semicolons and quoted nodes', () => {
    const raw = `graph TD;
    Customer["Customer"] -->|Request| OrderClothes(("Order clothes"));
    OrderClothes --> Inventory[("Inventory")];
    Inventory --> FulfillmentStore[("Fulfillment Store")];
    FulfillmentStore --> DeliveryService[("Delivery Service")];
    DeliveryService --> "Delivered"("Product Delivered");`;

    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).not.toContain(';');
    expect(sanitized).toContain('Customer["Customer"] -->|Request| OrderClothes(("Order clothes"))');
    expect(sanitized).toContain('OrderClothes --> Inventory[("Inventory")]');
    expect(sanitized).toContain('Inventory --> FulfillmentStore[("Fulfillment Store")]');
    expect(sanitized).toContain('FulfillmentStore --> DeliveryService[("Delivery Service")]');
    expect(sanitized).toContain('DeliveryService --> Delivered("Product Delivered")');
  });

  it('splits multi-statement lines with semicolons', () => {
    const raw = 'graph TD\n    A[Start] --> B[Mid]; B --> C[End];';
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('A[Start] --> B[Mid]');
    expect(sanitized).toContain('B --> C[End]');
    expect(sanitized).not.toContain(';');
  });

  it('preserves bidirectional arrows like <--> without corrupting node identifiers', () => {
    const raw = 'flowchart TD\n    CoreAPI <-->|5. Session Lookup| Cache';
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('CoreAPI <-->|5. Session Lookup| Cache');
    expect(sanitized).not.toContain('CoreAPI_["CoreAPI <"]');
  });

  it('repairs pseudo-pie charts written inside flowcharts into valid error-free nodes', () => {
    const raw = `graph TD;
    AppleRevenue["Apple Quarterly Total Revenue: 340.0B"];
    pie PieA("Apple")
        label "340.0B"
        value "Q1: 24.7% / Q2: 22.4%"`;

    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).not.toContain('pie PieA');
    expect(sanitized).toContain('PieA["🥧 <b>Apple</b>');
    expect(sanitized).toContain('340.0B');
  });

  it('preserves text containing arrows or hyphens inside node labels without splitting', () => {
    const raw = 'graph TD\n    User["👤 Client -> Form Submit -- Action"] -->|1. Post| Server["🚀 Core API"]';
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('User["👤 Client -> Form Submit -- Action"]');
    expect(sanitized).toContain('Server["🚀 Core API"]');
    expect(sanitized).toContain('-->|1. Post|');
  });

  it('auto-converts invalid class style definitions to classDef', () => {
    const raw = `flowchart TD
    User --> API
    class coreEngine fill:#6366f118,stroke:#4f46e5,stroke-width:2px,color:#4f46e5;
    class storageTier fill:#10b98118,stroke:#059669,stroke-width:2px,color:#059669;`;
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('classDef coreEngine fill:#6366f118,stroke:#4f46e5,stroke-width:2px,color:#4f46e5');
    expect(sanitized).toContain('classDef storageTier fill:#10b98118,stroke:#059669,stroke-width:2px,color:#059669');
  });

  it('disambiguates duplicate node IDs across subgraphs', () => {
    const raw = `flowchart TD
    subgraph Frontend ["Frontend UI"]
      User(["User"])
      Success["Paid Successfully"]
      Fail["Error in UI"]
    end
    subgraph Gateway ["Payment Gateway"]
      AuthCheck{"Valid Token?"}
      Success["Validated User"]
      Fail["Invalid Token"]
    end`;
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('Success["Paid Successfully"]');
    expect(sanitized).toContain('Gateway_Success["Validated User"]');
    expect(sanitized).toContain('Gateway_Fail["Invalid Token"]');
  });

  it('cleans raw markdown bullets inside node labels', () => {
    const raw = `flowchart TD
    A["📈 <b>UPI Request</b><br/>- Initiates Payment via UPI"] --> B`;
    const sanitized = sanitizeMermaidCode(raw);
    expect(sanitized).toContain('<small>Initiates Payment via UPI</small>');
  });
});

