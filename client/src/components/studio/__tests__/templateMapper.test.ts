import { describe, it, expect } from 'vitest';
import {
  parseDatasetText,
  applyTemplateToDataset,
  mapDatasetItemsToTemplate,
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
});
