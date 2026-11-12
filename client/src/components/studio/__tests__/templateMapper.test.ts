import { describe, it, expect } from 'vitest';
import {
  parseDatasetText,
  applyTemplateToDataset,
  mapDatasetItemsToTemplate,
  sanitizeDiagramBlueprint,
  scaleTemplateToStepCount,
  SAMPLE_DATASETS,
} from '../templateMapper';
import type { DiagramSpec } from '../types';

describe('templateMapper - Cross-Dataset Template Reuse', () => {
  it('parses plain text stages with titles and descriptions', () => {
    const raw = `1. Ingestion - Collect logs and traces\n2. Validation - Schema verification [Critical]\n3. Export - Send to BigQuery`;
    const items = parseDatasetText(raw);

    expect(items).toHaveLength(3);
    expect(items[0].label).toBe('Ingestion');
    expect(items[0].sublabel).toBe('Collect logs and traces');
    expect(items[1].label).toBe('Validation');
    expect(items[1].badge).toBe('Critical');
  });

  it('parses CSV data format', () => {
    const csv = `Stage,Description,Badge\nBuild,Compile artifacts,CI\nDeploy,Push to cluster,CD`;
    const items = parseDatasetText(csv);

    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Build');
    expect(items[0].sublabel).toBe('Compile artifacts');
    expect(items[0].badge).toBe('CI');
  });

  it('parses JSON array format', () => {
    const json = JSON.stringify([
      { label: 'Step A', sublabel: 'Initial step', badge: 'Start' },
      { label: 'Step B', sublabel: 'Processing', badge: 'Done' },
    ]);
    const items = parseDatasetText(json);

    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Step A');
    expect(items[1].label).toBe('Step B');
  });

  it('applies saved template visual style & dimensions onto an active dataset', () => {
    const template: DiagramSpec = {
      id: 'tpl-1',
      title: 'Diamond Process Blueprint',
      type: 'process_flow',
      summary: 'Template with custom shapes and layout',
      theme: 'emerald',
      nodes: [
        {
          id: 't-1',
          label: 'Old Stage 1',
          shape: 'diamond',
          x: 100,
          y: 200,
          width: 280,
          height: 140,
          customStyle: {
            backgroundColor: '#064e3b',
            borderColor: '#10b981',
            glowEffect: true,
          },
        },
        {
          id: 't-2',
          label: 'Old Stage 2',
          shape: 'hexagon',
          x: 450,
          y: 200,
          width: 260,
          height: 130,
          customStyle: {
            backgroundColor: '#0f172a',
            borderColor: '#38bdf8',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          from: 't-1',
          to: 't-2',
          label: 'Next',
          routing: 'curved',
          animated: true,
        },
      ],
    };

    const currentDataset: DiagramSpec = {
      id: 'active-data',
      title: 'Customer Onboarding Funnel',
      type: 'process_flow',
      summary: 'Real user dataset',
      nodes: [
        { id: 'curr-1', label: 'Signup Form', sublabel: 'Email & OTP', badge: 'Stage 1' },
        { id: 'curr-2', label: 'KYC Document', sublabel: 'Aadhaar / Passport', badge: 'Stage 2' },
      ],
      edges: [
        { id: 'curr-e1', from: 'curr-1', to: 'curr-2' },
      ],
    };

    const transformed = applyTemplateToDataset(template, currentDataset);

    // Labels & content preserved from current dataset
    expect(transformed.nodes[0].label).toBe('Signup Form');
    expect(transformed.nodes[0].sublabel).toBe('Email & OTP');
    expect(transformed.nodes[0].badge).toBe('Stage 1');

    expect(transformed.nodes[1].label).toBe('KYC Document');
    expect(transformed.nodes[1].sublabel).toBe('Aadhaar / Passport');

    // Visual styles & dimensions transferred from template
    expect(transformed.nodes[0].shape).toBe('diamond');
    expect(transformed.nodes[0].width).toBe(280);
    expect(transformed.nodes[0].height).toBe(140);
    expect(transformed.nodes[0].x).toBe(100);
    expect(transformed.nodes[0].y).toBe(200);
    expect(transformed.nodes[0].customStyle?.glowEffect).toBe(true);

    expect(transformed.nodes[1].shape).toBe('hexagon');
    expect(transformed.nodes[1].width).toBe(260);

    // Theme and edge styling transferred
    expect(transformed.theme).toBe('emerald');
    expect(transformed.edges[0].routing).toBe('curved');
    expect(transformed.edges[0].animated).toBe(true);
  });

  it('maps custom dataset items to template blueprint with new nodes and edges', () => {
    const template: DiagramSpec = {
      id: 'tpl-arch',
      title: 'Microservices Pipeline',
      type: 'architecture',
      summary: 'Arch blueprint',
      nodes: [
        { id: 'n1', label: 'Tpl Node 1', shape: 'pill', x: 80, y: 150, width: 220, height: 90 },
      ],
      edges: [],
    };

    const sample = SAMPLE_DATASETS.find((d) => d.id === 'ml_pipeline')!;
    const items = sample.items;
    const result = mapDatasetItemsToTemplate(items, template, 'Production ML Pipeline');

    expect(result.title).toBe('Production ML Pipeline');
    expect(result.nodes.length).toBe(items.length);
    expect(result.nodes[0].label).toBe('Data Ingestion & Sinks');
    expect(result.edges.length).toBe(items.length - 1);
  });

  it('sanitizeDiagramBlueprint strictly strips User A proprietary data while preserving 100% of the design', () => {
    const userAConfidentialDiagram: DiagramSpec = {
      diagramType: 'process_flow',
      title: 'Top Secret User A Pipeline',
      summary: 'Confidential client accounts: Acme Corp',
      nodes: [
        {
          id: 'n1',
          label: 'User A Secret Node 1',
          sublabel: 'Confidential formula X',
          badge: 'PRIVATE-TOKEN',
          type: 'start',
          customStyle: {
            shape: 'hexagon',
            borderColor: '#8b5cf6',
            bgColor: 'rgba(139, 92, 246, 0.15)',
          },
        },
        {
          id: 'n2',
          label: 'User A Secret Node 2',
          sublabel: 'Secret wire transfer $10M',
          type: 'process',
          customStyle: {
            shape: 'card',
            borderColor: '#06b6d4',
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          label: 'Secret Connection',
          customStyle: { routing: 'curved', color: '#8b5cf6' },
        },
      ],
    };

    const sanitized = sanitizeDiagramBlueprint(userAConfidentialDiagram, 'Shared Community Blueprint');

    // 1. Data isolation: No proprietary strings exist
    const jsonStr = JSON.stringify(sanitized);
    expect(jsonStr).not.toContain('Top Secret User A');
    expect(jsonStr).not.toContain('Confidential formula X');
    expect(jsonStr).not.toContain('Secret wire transfer');
    expect(jsonStr).not.toContain('PRIVATE-TOKEN');
    expect(jsonStr).not.toContain('Secret Connection');

    // 2. Design preservation: Shapes, colors, and layout are intact
    expect(sanitized.nodes[0].label).toBe('Initial Stage 1');
    expect(sanitized.nodes[0].customStyle?.shape).toBe('hexagon');
    expect(sanitized.nodes[0].customStyle?.borderColor).toBe('#8b5cf6');

    expect(sanitized.nodes[1].label).toBe('Phase 2: Step');
    expect(sanitized.nodes[1].customStyle?.shape).toBe('card');
    expect(sanitized.nodes[1].customStyle?.borderColor).toBe('#06b6d4');

    expect(sanitized.edges[0].customStyle?.routing).toBe('curved');
  });

  it('scaleTemplateToStepCount automatically scales design when data has more or fewer steps', () => {
    const template: DiagramSpec = {
      diagramType: 'process_flow',
      title: '3-Step Design',
      nodes: [
        { id: 'n1', label: 'Step 1', customStyle: { shape: 'pill', borderColor: '#06b6d4' } },
        { id: 'n2', label: 'Step 2', customStyle: { shape: 'card', borderColor: '#8b5cf6' } },
        { id: 'n3', label: 'Step 3', customStyle: { shape: 'hexagon', borderColor: '#10b981' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    };

    // Scale UP to 5 steps (Data zyada ho)
    const scaledUp = scaleTemplateToStepCount(template, 5);
    expect(scaledUp.nodes).toHaveLength(5);
    expect(scaledUp.edges).toHaveLength(4);
    // 4th and 5th node interpolate archetype design
    expect(scaledUp.nodes[3].customStyle?.shape).toBe('pill');
    expect(scaledUp.nodes[4].customStyle?.shape).toBe('card');

    // Scale DOWN to 2 steps (Data kam ho)
    const scaledDown = scaleTemplateToStepCount(template, 2);
    expect(scaledDown.nodes).toHaveLength(2);
    expect(scaledDown.edges).toHaveLength(1);
    expect(scaledDown.nodes[0].id).toBe('node_step_1');
    expect(scaledDown.nodes[1].id).toBe('node_step_2');
  });

  it('scaleTemplateToStepCount preserves user data when sourceData is provided', () => {
    const template: DiagramSpec = {
      diagramType: 'process_flow',
      title: 'Shared Template Design',
      nodes: [
        { id: 't1', label: 'Tpl Stage 1', customStyle: { shape: 'terminal', borderColor: '#06b6d4' } },
        { id: 't2', label: 'Tpl Stage 2', customStyle: { shape: 'cylinder', borderColor: '#8b5cf6' } },
      ],
      edges: [{ id: 'te1', source: 't1', target: 't2' }],
    };

    const userData: DiagramSpec = {
      diagramType: 'process_flow',
      title: 'User Actual Data',
      nodes: [
        { id: 'u1', label: 'Order Placed', sublabel: '$150 purchase', badge: 'Order#1' },
        { id: 'u2', label: 'Payment Deducted', sublabel: 'Credit card authorized', badge: 'Paid' },
      ],
      edges: [{ id: 'ue1', source: 'u1', target: 'u2' }],
    };

    const scaledWithUserData = scaleTemplateToStepCount(template, 3, userData);
    expect(scaledWithUserData.nodes).toHaveLength(3);
    // 1st and 2nd keep user data but take template design
    expect(scaledWithUserData.nodes[0].label).toBe('Order Placed');
    expect(scaledWithUserData.nodes[0].sublabel).toBe('$150 purchase');
    expect(scaledWithUserData.nodes[0].badge).toBe('Order#1');
    expect(scaledWithUserData.nodes[0].customStyle?.shape).toBe('terminal');
    expect(scaledWithUserData.nodes[0].customStyle?.borderColor).toBe('#06b6d4');

    expect(scaledWithUserData.nodes[1].label).toBe('Payment Deducted');
    expect(scaledWithUserData.nodes[1].customStyle?.shape).toBe('cylinder');

    // 3rd node continues with clean step continuation
    expect(scaledWithUserData.nodes[2].label).toBe('Phase 3: Step');
  });

  it('applyTemplateToDataset creates sequential connectors when source edges are missing', () => {
    const template: DiagramSpec = {
      diagramType: 'process_flow',
      title: 'Flow Template',
      nodes: [
        { id: 't1', label: 'Tpl 1', customStyle: { shape: 'card', borderColor: '#06b6d4' } },
        { id: 't2', label: 'Tpl 2', customStyle: { shape: 'card', borderColor: '#8b5cf6' } },
      ],
      edges: [
        { id: 'te1', source: 't1', target: 't2', customStyle: { routing: 'orthogonal', color: '#06b6d4' } },
      ],
    };

    const rawUserDataset: DiagramSpec = {
      diagramType: 'process_flow',
      title: 'My Steps',
      nodes: [
        { id: 'step_a', label: 'Step A: Init' },
        { id: 'step_b', label: 'Step B: Process' },
        { id: 'step_c', label: 'Step C: Finish' },
      ],
      edges: [],
    };

    const adapted = applyTemplateToDataset(template, rawUserDataset);
    expect(adapted.nodes).toHaveLength(3);
    expect(adapted.nodes[0].label).toBe('Step A: Init');
    expect(adapted.nodes[1].label).toBe('Step B: Process');
    expect(adapted.nodes[2].label).toBe('Step C: Finish');
    // Connectors automatically generated between the user's nodes
    expect(adapted.edges).toHaveLength(2);
    expect(adapted.edges[0].source).toBe('step_a');
    expect(adapted.edges[0].target).toBe('step_b');
    expect(adapted.edges[1].source).toBe('step_b');
    expect(adapted.edges[1].target).toBe('step_c');
    expect(adapted.edges[0].customStyle?.routing).toBe('orthogonal');
  });
});
