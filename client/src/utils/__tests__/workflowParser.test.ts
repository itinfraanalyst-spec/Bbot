import { describe, expect, it } from 'vitest';
import { parseWorkflowData } from '../workflowParser';

describe('parseWorkflowData', () => {
  it('parses standard Mermaid flowchart arrows and labels', () => {
    const raw = `
graph TD
    Customer[Customer] -->|Order| OrderClothes((Order clothes))
    OrderClothes -->|Bill| Customer
    OrderClothes -->|Order| ClothesStore[Clothes Store]
`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    expect(res?.nodes.length).toBe(3);
    expect(res?.edges.length).toBe(3);
    expect(res?.nodes.find((n) => n.id === 'Customer')?.label).toBe('Customer');
    expect(res?.nodes.find((n) => n.id === 'OrderClothes')?.shape).toBe('circle');
    expect(res?.edges[0].label).toBe('Order');
  });

  it('safely handles broken subgraph syntax without throwing error', () => {
    const raw = `
graph TD
subgraph Design Phase {"Design"}ApiName("
`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    expect(res?.groups.length).toBe(1);
    expect(res?.groups[0].name).toBe('Design Phase');
    expect(res?.nodes.length).toBeGreaterThan(0);
  });

  it('parses linear step sequences', () => {
    const raw = `
Step 1: Planning -> Define system scope
Step 2: Architecture -> Design models
Step 3: Implementation -> Write code
`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    expect(res?.nodes.length).toBe(3);
    expect(res?.edges.length).toBe(2);
    expect(res?.isLinear).toBe(true);
    expect(res?.nodes[0].details).toBe('Define system scope');
  });

  it('parses brackets flow format: [A] --> [B]', () => {
    const raw = `
[User Request] --> [API Gateway]: Validate
[API Gateway] --> [Database]: Query
`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    expect(res?.nodes.length).toBe(3);
    expect(res?.edges[0].label).toBe('Validate');
  });

  it('returns null on empty string', () => {
    expect(parseWorkflowData('')).toBeNull();
  });

  it('strips HTML tags and extracts subtitles from labels', () => {
    const raw = `graph TD
    A["📈 <b>UPI Request</b><br/>- Initiates Payment via UPI"] --> B["✅ <b>Paid Successfully</b>"]`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    const nodeA = res?.nodes.find((n) => n.id === 'A');
    expect(nodeA?.label).toBe('📈 UPI Request');
    expect(nodeA?.details).toBe('Initiates Payment via UPI');
    const nodeB = res?.nodes.find((n) => n.id === 'B');
    expect(nodeB?.label).toBe('✅ Paid Successfully');
  });

  it('preserves distinct nodes when generic IDs are reused across different subgraphs', () => {
    const raw = `flowchart TD
    subgraph Frontend ["Frontend"]
      Success["Paid Successfully"]
    end
    subgraph Gateway ["Gateway"]
      Success["Validated User"]
    end`;
    const res = parseWorkflowData(raw);
    expect(res).not.toBeNull();
    expect(res?.nodes.length).toBe(2);
    expect(res?.groups[0].nodeIds.length).toBe(1);
    expect(res?.groups[1].nodeIds.length).toBe(1);
  });
});
