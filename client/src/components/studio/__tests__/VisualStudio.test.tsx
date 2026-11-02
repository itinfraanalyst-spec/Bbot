import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DiagramCanvas } from '../DiagramCanvas';
import { InteractiveCanvas } from '../InteractiveCanvas';
import { VisualStudioPage } from '../../../pages/VisualStudioPage';
import type { DiagramSpec } from '../types';

describe('DiagramCanvas component', () => {
  const sampleDiagram: DiagramSpec = {
    version: '1.0',
    diagramType: 'process_flow',
    title: 'User Registration Pipeline',
    summary: 'Steps from form submission to account activation.',
    theme: 'modern',
    nodes: [
      { id: 'node_1', label: 'Submit Form', sublabel: 'POST /auth/register', type: 'start' },
      { id: 'node_2', label: 'Validate Email', sublabel: 'Send verification token', type: 'process' },
      { id: 'node_3', label: 'Account Active', sublabel: 'Ready to login', type: 'end' },
    ],
    edges: [
      { id: 'e1', source: 'node_1', target: 'node_2', label: 'Token Issued' },
      { id: 'e2', source: 'node_2', target: 'node_3', label: 'Verified' },
    ],
  };

  it('renders all flow stages and title correctly', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    expect(screen.getByText('User Registration Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Submit Form')).toBeInTheDocument();
    expect(screen.getByText('Validate Email')).toBeInTheDocument();
    expect(screen.getByText('Account Active')).toBeInTheDocument();
    expect(screen.queryByText('3 Stages')).not.toBeInTheDocument();
  });

  it('allows adding a new node to the diagram', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    const addBtn = screen.getByRole('button', { name: /Add Node/i });
    fireEvent.click(addBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedDiagram: DiagramSpec = handleUpdate.mock.calls[0][0];
    expect(updatedDiagram.nodes.length).toBe(4);
    expect(updatedDiagram.nodes[3].label).toBe('New Stage');
  });

  it('renders interactive chart when diagramType is bar_chart', () => {
    const chartDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'bar_chart',
      title: 'Quarterly Sales Volume',
      summary: 'Q1 to Q3 sales units.',
      theme: 'modern',
      nodes: [],
      edges: [],
      chartData: {
        xAxisKey: 'Quarter',
        dataKeys: ['Sales'],
        rows: [
          { Quarter: 'Q1', Sales: 120 },
          { Quarter: 'Q2', Sales: 180 },
          { Quarter: 'Q3', Sales: 240 },
        ],
        unit: 'K',
      },
    };

    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={chartDiagram} onUpdateDiagram={handleUpdate} />);

    expect(screen.getByText('Quarterly Sales Volume')).toBeInTheDocument();
    expect(screen.queryByText('3 Data Points')).not.toBeInTheDocument();
    expect(screen.getByText('Chart Data Points (Click to edit)')).toBeInTheDocument();
  });

  it('renders specialized creative layout for timeline roadmap', () => {
    const timelineDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'timeline',
      title: 'Q1-Q4 Product Roadmap',
      summary: 'Chronological roadmap milestones.',
      theme: 'modern',
      nodes: [
        { id: 'm1', label: 'Inception Alpha', sublabel: 'Deliverable: Core architecture MVP', badge: 'M1' },
        { id: 'm2', label: 'Beta Release', sublabel: 'Deliverable: Public preview', badge: 'M2' },
      ],
      edges: [{ id: 'e1', source: 'm1', target: 'm2' }],
    };

    render(<DiagramCanvas diagram={timelineDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Chronological Project Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Inception to Delivery')).toBeInTheDocument();
    expect(screen.getByText('Inception Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta Release')).toBeInTheDocument();
  });

  it('renders specialized creative layout for hierarchy tree', () => {
    const hierarchyDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'hierarchy',
      title: 'Company Governance',
      summary: 'Executive and operational structure.',
      theme: 'modern',
      nodes: [
        { id: 'h1', label: 'Chief Executive Officer', sublabel: 'Executive governance', group: 'Executive' },
        { id: 'h2', label: 'VP Engineering', sublabel: 'Platform development', group: 'Management' },
        { id: 'h3', label: 'Core Squad Leads', sublabel: 'Sprint delivery', group: 'Operations' },
      ],
      edges: [{ id: 'e1', source: 'h1', target: 'h2' }],
    };

    render(<DiagramCanvas diagram={hierarchyDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Executive Governance Tier')).toBeInTheDocument();
    expect(screen.getByText('Chief Executive Officer')).toBeInTheDocument();
    expect(screen.getByText('VP Engineering')).toBeInTheDocument();
  });

  it('renders specialized creative layout for mindmap', () => {
    const mindmapDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'mindmap',
      title: 'Cloud Architecture Hub',
      summary: 'Core domain with satellite services.',
      theme: 'modern',
      nodes: [
        { id: 'mm1', label: 'Core Cloud Hub', sublabel: 'Central broker', badge: 'CORE' },
        { id: 'mm2', label: 'Security & Auth', sublabel: 'OAuth & RBAC', badge: 'BRANCH 01' },
        { id: 'mm3', label: 'Analytics Pipeline', sublabel: 'Clickhouse telemetry', badge: 'BRANCH 02' },
      ],
      edges: [{ id: 'e1', source: 'mm1', target: 'mm2' }],
    };

    render(<DiagramCanvas diagram={mindmapDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Central Knowledge Core')).toBeInTheDocument();
    expect(screen.getByText('Core Cloud Hub')).toBeInTheDocument();
    expect(screen.getByText('Security & Auth')).toBeInTheDocument();
    expect(screen.getByText('Analytics Pipeline')).toBeInTheDocument();
  });

  it('renders specialized creative layout for comparison matrix', () => {
    const compDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'comparison',
      title: 'Database Evaluation Matrix',
      summary: 'Comparing relational vs document store.',
      theme: 'modern',
      nodes: [
        { id: 'c1', label: 'PostgreSQL Architecture', sublabel: 'ACID compliance; Rich JSON indexing; High reliability', group: 'Relational' },
        { id: 'c2', label: 'MongoDB Cluster', sublabel: 'Flexible schema; Horizontal sharding; Document model', group: 'NoSQL' },
      ],
      edges: [],
    };

    render(<DiagramCanvas diagram={compDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Comparative Benchmark & Trade-off Matrix')).toBeInTheDocument();
    expect(screen.getByText('Recommended Choice')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Architecture')).toBeInTheDocument();
    expect(screen.getByText('MongoDB Cluster')).toBeInTheDocument();
  });

  it('renders specialized creative layout for circular flywheel loop', () => {
    const loopDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'circular_loop',
      title: 'DevOps Lifecycle Engine',
      summary: 'Continuous delivery and feedback loop.',
      theme: 'modern',
      nodes: [
        { id: 'l1', label: 'Plan & Code', sublabel: 'Feature branches and PRs' },
        { id: 'l2', label: 'Build & Test', sublabel: 'Automated CI regression' },
        { id: 'l3', label: 'Deploy & Monitor', sublabel: 'Canary release and telemetry' },
      ],
      edges: [],
    };

    render(<DiagramCanvas diagram={loopDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Closed-Loop Flywheel & Continuous Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Self-Sustaining Flywheel')).toBeInTheDocument();
    expect(screen.getByText('Plan & Code')).toBeInTheDocument();
    expect(screen.getByText('Build & Test')).toBeInTheDocument();
    expect(screen.getByText('Deploy & Monitor')).toBeInTheDocument();
  });

  it('renders specialized creative layout for executive bento grid', () => {
    const bentoDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'bento_grid',
      title: 'Infrastructure Health Grid',
      summary: 'Core database and satellite service health.',
      theme: 'modern',
      nodes: [
        { id: 'b1', label: 'Core Multi-Region Aurora', sublabel: '99.999% SLA availability and sub-10ms latency' },
        { id: 'b2', label: 'Redis Cluster', sublabel: 'Session cache and rate limiter' },
        { id: 'b3', label: 'Kafka Telemetry', sublabel: 'Event streaming backbone' },
      ],
      edges: [],
    };

    render(<DiagramCanvas diagram={bentoDiagram} onUpdateDiagram={vi.fn()} />);
    expect(screen.getByText('Executive Bento Architecture & High-Impact Summary Grid')).toBeInTheDocument();
    expect(screen.getByText('Primary Strategic Core')).toBeInTheDocument();
    expect(screen.getByText('Core Multi-Region Aurora')).toBeInTheDocument();
    expect(screen.getByText('Redis Cluster')).toBeInTheDocument();
    expect(screen.getByText('Kafka Telemetry')).toBeInTheDocument();
  });

  it('renders bbot Studio AI buttons and opens command palette modal', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    // Check top bar and floating pill
    const copilotButtons = screen.getAllByRole('button', { name: /bbot Studio AI/i });
    expect(copilotButtons.length).toBeGreaterThanOrEqual(1);

    // Open Copilot modal
    fireEvent.click(copilotButtons[0]);

    // Verify modal elements
    expect(screen.getAllByText(/bbot/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Studio Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Transform, expand, restyle, or audit this diagram/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add SLA badges/i)).toBeInTheDocument();
    expect(screen.getByText('Instant Transformations (<15ms)')).toBeInTheDocument();
    expect(screen.getByText('⚡ Add SLA Badges')).toBeInTheDocument();
    expect(screen.getByText('🛡️ Add Security Gate')).toBeInTheDocument();
    expect(screen.getByText('🔄 Add Rollback Branch')).toBeInTheDocument();
  });

  it('switches between Template and Interactive Canvas mode and displays studio tools', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    // Toggle button should exist
    const canvasToggleBtns = screen.getAllByRole('button', { name: /Interactive Canvas/i });
    expect(canvasToggleBtns.length).toBeGreaterThanOrEqual(1);

    // Click toggle to switch to Interactive Canvas
    fireEvent.click(canvasToggleBtns[0]);

    // Canvas tools should be present
    expect(screen.getByRole('button', { name: /Add Box/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Connect$/i })).toBeInTheDocument();
  });

  it('renders InteractiveCanvas directly with custom shapes and inspector', () => {
    const customDiagram: DiagramSpec = {
      ...sampleDiagram,
      viewMode: 'canvas',
      nodes: [
        {
          id: 'n1',
          label: 'Auth Gateway',
          sublabel: 'Edge reverse proxy',
          customStyle: { shape: 'sharp', borderColor: '#06b6d4' },
          x: 100,
          y: 200,
        },
        {
          id: 'n2',
          label: 'Database Store',
          sublabel: 'PostgreSQL primary',
          customStyle: { shape: 'cylinder', borderColor: '#10b981' },
          x: 400,
          y: 200,
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          label: 'Query',
          customStyle: { routing: 'orthogonal', strokeStyle: 'dashed' },
        },
      ],
    };

    render(<InteractiveCanvas diagram={customDiagram} onUpdateDiagram={vi.fn()} />);

    expect(screen.getByText('Auth Gateway')).toBeInTheDocument();
    expect(screen.getByText('Database Store')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Box/i })).toBeInTheDocument();
  });

  it('renders Diamond, Heart, Cuboid, Rectangle, and Terminal shapes and opens the styling inspector', () => {
    const multiShapeDiagram: DiagramSpec = {
      ...sampleDiagram,
      viewMode: 'canvas',
      nodes: [
        {
          id: 'n_diamond',
          label: 'Decision Diamond',
          sublabel: 'Evaluate payload',
          customStyle: { shape: 'diamond', borderColor: '#f59e0b', bgColor: '#f59e0b' },
          x: 50,
          y: 50,
        },
        {
          id: 'n_heart',
          label: 'Health Check ❤️',
          sublabel: 'Service heartbeat',
          customStyle: { shape: 'heart', borderColor: '#f43f5e', bgColor: '#f43f5e' },
          x: 250,
          y: 50,
        },
        {
          id: 'n_cuboid',
          label: '3D Isometric Block',
          sublabel: 'Microservice container',
          customStyle: { shape: 'cuboid', borderColor: '#3b82f6', bgColor: '#1e293b' },
          x: 450,
          y: 50,
        },
        {
          id: 'n_rect',
          label: 'Pure Rectangle',
          sublabel: 'Clean border box',
          customStyle: { shape: 'rectangle', borderColor: '#10b981', bgColor: '#064e3b' },
          x: 650,
          y: 50,
        },
        {
          id: 'n_term',
          label: 'CLI Terminal',
          sublabel: 'curl -X POST /api',
          customStyle: { shape: 'terminal', borderColor: '#8b5cf6' },
          x: 850,
          y: 50,
        },
      ],
      edges: [],
    };

    render(<InteractiveCanvas diagram={multiShapeDiagram} onUpdateDiagram={vi.fn()} />);

    // Verify all shapes render with their labels
    expect(screen.getByText('Decision Diamond')).toBeInTheDocument();
    expect(screen.getByText('Health Check ❤️')).toBeInTheDocument();
    expect(screen.getByText('3D Isometric Block')).toBeInTheDocument();
    expect(screen.getByText('Pure Rectangle')).toBeInTheDocument();
    expect(screen.getByText('CLI Terminal')).toBeInTheDocument();

    // Double-click a node to open Box Inspector
    const diamondNode = screen.getByText('Decision Diamond').closest('[data-node-id="true"]')!;
    fireEvent.doubleClick(diamondNode);

    // Inspector should open with title, shape options, and color picker
    expect(screen.getByText(/Box Inspector & Styling/i)).toBeInTheDocument();
    expect(screen.getByText(/Text Content & Typography/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Colors & Fill/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Diamond Gate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Heart Shape/i)).toBeInTheDocument();
    expect(screen.getByText(/3D Cuboid/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rectangle/i).length).toBeGreaterThan(0);
  });

  it('does not open edit box when clicking or locating boxes, but opens when clicking pen button', () => {
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={vi.fn()} />);
    const stageTitle = screen.getByText('Submit Form');
    fireEvent.click(stageTitle);
    // Inline edit form inputs should NOT be visible on single click
    expect(screen.queryByText(/Pick Semantic Icon/i)).not.toBeInTheDocument();

    // Now click the pen button on the node
    const editPenBtns = screen.getAllByTitle(/Edit Box/i);
    expect(editPenBtns.length).toBeGreaterThan(0);
    fireEvent.click(editPenBtns[0]);
    // Edit form opens!
    expect(screen.getByText(/Pick Semantic Icon/i)).toBeInTheDocument();
  });

  it('opens Template Library popover and applies starter preset', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    const templatesBtn = screen.getByRole('button', { name: /Templates/i });
    fireEvent.click(templatesBtn);

    // Popover opens
    expect(screen.getByText('Template Library')).toBeInTheDocument();
    expect(screen.getByText('Linear SOP Pipeline (4 Stages)')).toBeInTheDocument();
    expect(screen.getByText('Decision Gateway Flow')).toBeInTheDocument();
    expect(screen.getByText('3-Tier Cloud Architecture')).toBeInTheDocument();

    // Click on a preset
    const presetBtn = screen.getByText('3-Tier Cloud Architecture');
    fireEvent.click(presetBtn);

    expect(handleUpdate).toHaveBeenCalled();
  });

  it('opens Style customizer and allows switching node geometries and accent colors', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    const styleBtn = screen.getByRole('button', { name: /Style/i });
    fireEvent.click(styleBtn);

    // Style popover opens
    expect(screen.getByText('Diagram Styling & Geometries')).toBeInTheDocument();
    expect(screen.getByText('Accent & Glow Color')).toBeInTheDocument();
    expect(screen.getByText('Node Geometry Shape')).toBeInTheDocument();
    expect(screen.getByText('Capsule Pill')).toBeInTheDocument();
    expect(screen.getByText('Minimal Box')).toBeInTheDocument();

    // Select a shape
    const pillBtn = screen.getByText('Capsule Pill');
    fireEvent.click(pillBtn);

    expect(handleUpdate).toHaveBeenCalled();
  });

  it('renders Empty Canvas Starter Hero Card with quick presets when nodes list is empty', () => {
    const emptyDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'process_flow',
      title: 'Blank Architecture Workspace',
      summary: 'Clean canvas waiting for design.',
      theme: 'bbot-dark',
      nodes: [],
      edges: [],
    };

    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={emptyDiagram} onUpdateDiagram={handleUpdate} />);

    // Starter card elements should be present
    expect(screen.getByText('Canvas Ready — Start Visualizing')).toBeInTheDocument();
    expect(screen.getByText('Linear SOP Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Decision Gateway Flow')).toBeInTheDocument();
    expect(screen.getByText('3-Tier Cloud Architecture')).toBeInTheDocument();
    expect(screen.getByText('Add First Stage')).toBeInTheDocument();
    expect(screen.getByText('Ask bbot Studio AI')).toBeInTheDocument();

    // Click on starter preset to initialize diagram
    const presetBtn = screen.getByText('Linear SOP Pipeline');
    fireEvent.click(presetBtn);

    expect(handleUpdate).toHaveBeenCalled();
    const updated = handleUpdate.mock.calls[0][0];
    expect(updated.nodes.length).toBe(4);
  });

  it('opens Keyboard Shortcuts Cheatsheet modal via toolbar button and ? key', () => {
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={vi.fn()} />);

    const cheatsheetBtn = screen.getByRole('button', { name: /Keyboard Shortcuts Cheatsheet/i });
    expect(cheatsheetBtn).toBeInTheDocument();

    fireEvent.click(cheatsheetBtn);

    // Modal dialog should appear
    expect(screen.getByText('Keyboard Shortcuts & Hotkeys')).toBeInTheDocument();
    expect(screen.getByText('Canvas View & Navigation')).toBeInTheDocument();
    expect(screen.getByText('Editing & History')).toBeInTheDocument();
    expect(screen.getByText('Studio AI & Presentation')).toBeInTheDocument();
    expect(screen.getByText('Zoom In / Zoom Out')).toBeInTheDocument();
    expect(screen.getByText('Undo last action')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Canvas View & Navigation')).not.toBeInTheDocument();
  });

  it('renders horizontally scrollable toolbar with all studio tools and working portal dropdowns', () => {
    const handleUpdate = vi.fn();
    const { container } = render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    // 1. Toolbar scrollbar container exists
    const scrollContainer = container.querySelector('.toolbar-scrollbar');
    expect(scrollContainer).toBeInTheDocument();

    // 2. Center tools are present
    expect(screen.getByRole('button', { name: /Add Node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Theme:/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();

    // 3. Right-side tools that were previously cut off are accessible
    expect(screen.getAllByRole('button', { name: /bbot Studio AI/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTitle(/Search stages/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Zoom in/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Zoom out/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Present/i })).toBeInTheDocument();
    expect(screen.getByTitle(/Full screen canvas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keyboard Shortcuts Cheatsheet/i })).toBeInTheDocument();

    // 4. Test Export dropdown portal
    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText('Export & Share Visual')).toBeInTheDocument();
    expect(screen.getByText('Copy PNG Image')).toBeInTheDocument();
    expect(screen.getByText('Download PNG')).toBeInTheDocument();
    expect(screen.getByText('Copy Vector SVG')).toBeInTheDocument();
    expect(screen.getByText('Copy Mermaid Markdown')).toBeInTheDocument();

    // 5. Test Theme dropdown portal
    const themeBtn = screen.getByRole('button', { name: /Theme:/i });
    fireEvent.click(themeBtn);
    expect(screen.getByText('Aesthetic Theme')).toBeInTheDocument();
    expect(screen.getByText('Obsidian')).toBeInTheDocument();
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('Cyber')).toBeInTheDocument();
    expect(screen.getByText('Emerald')).toBeInTheDocument();
  });

  it('allows dismissing the floating bbot Studio AI pill with the cross button', () => {
    localStorage.removeItem('bbot_floating_ai_dismissed');
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={vi.fn()} />);

    const dismissPillBtn = screen.getByRole('button', { name: /Dismiss floating AI pill/i });
    expect(dismissPillBtn).toBeInTheDocument();

    fireEvent.click(dismissPillBtn);

    expect(screen.queryByRole('button', { name: /Dismiss floating AI pill/i })).not.toBeInTheDocument();
    expect(localStorage.getItem('bbot_floating_ai_dismissed')).toBe('true');
  });

  it('renders Background customizer button in main toolbar and allows changing canvas background and grid', () => {
    const handleUpdate = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={handleUpdate} />);

    const bgBtn = screen.getByRole('button', { name: /Background/i });
    expect(bgBtn).toBeInTheDocument();

    fireEvent.click(bgBtn);

    expect(screen.getByText('Canvas Background')).toBeInTheDocument();
    expect(screen.getByText('Color Presets')).toBeInTheDocument();
    expect(screen.getByText('Obsidian')).toBeInTheDocument();
    expect(screen.getByText('OLED Black')).toBeInTheDocument();
    expect(screen.getByText('Paper White')).toBeInTheDocument();
    expect(screen.getByText('Grid Style')).toBeInTheDocument();

    fireEvent.click(screen.getByText('OLED Black'));
    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({ canvasBg: '#090a0f' }));
  });

  it('renders Auto-Tidy and Zoom In / Zoom Out controls in DiagramCanvas', () => {
    const onUpdateMock = vi.fn();
    render(<DiagramCanvas diagram={sampleDiagram} onUpdateDiagram={onUpdateMock} />);

    // Auto-Tidy button is present
    const autoTidyBtn = screen.getByRole('button', { name: /Auto-Tidy/i });
    expect(autoTidyBtn).toBeInTheDocument();

    // Click Auto-Tidy
    fireEvent.click(autoTidyBtn);
    expect(screen.getByText(/Canvas Auto-Tidied: Symmetrical Levels/i)).toBeInTheDocument();
    expect(onUpdateMock).toHaveBeenCalled();

    // Zoom Out and Zoom In buttons are present in toolbar
    const zoomOutBtn = screen.getByRole('button', { name: /Zoom Out/i });
    const zoomInBtn = screen.getByRole('button', { name: /Zoom In/i });
    expect(zoomOutBtn).toBeInTheDocument();
    expect(zoomInBtn).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Zoom In
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('115%')).toBeInTheDocument();

    // Zoom Out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders canvas tool mode selector and direct in-place inline text editing in InteractiveCanvas', () => {
    const onUpdateMock = vi.fn();
    render(<InteractiveCanvas diagram={sampleDiagram} onUpdateDiagram={onUpdateMock} />);

    // Tool selector icons should exist on floating toolbar
    expect(screen.getByTitle(/Pointer Tool \(V\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Marquee Selection Tool \(M\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Hand Tool \(H\)/i)).toBeInTheDocument();

    // Double-click node to trigger in-place inline editor overlay
    const nodeEl = screen.getByText('Submit Form').closest('[data-node-id="true"]')!;
    fireEvent.doubleClick(nodeEl);

    // Direct in-place inline editing overlay should appear
    expect(screen.getByText(/Edit Stage/i)).toBeInTheDocument();
    const inputs = screen.getAllByPlaceholderText(/Stage Title\.\.\./i);
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(inputs[0]).toBeInTheDocument();
  });

  it('correctly tracks history, enables undo button upon edits, and restores states on undo and redo', () => {
    let currentDiagram = { ...sampleDiagram };
    const handleUpdate = vi.fn((updated) => {
      currentDiagram = updated;
    });

    const { rerender } = render(<DiagramCanvas diagram={currentDiagram} onUpdateDiagram={handleUpdate} />);

    // Initially both Undo and Redo are disabled
    const undoBtn = screen.getByTitle(/Undo change \(Ctrl\+Z\)/i);
    const redoBtn = screen.getByTitle(/Redo change \(Ctrl\+Y\)/i);
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Trigger an edit: Add Node
    const addNodeBtn = screen.getByRole('button', { name: /Add Node/i });
    fireEvent.click(addNodeBtn);

    expect(handleUpdate).toHaveBeenCalled();
    const diagramWithNewNode = handleUpdate.mock.calls[0][0];
    expect(diagramWithNewNode.nodes.length).toBe(sampleDiagram.nodes.length + 1);

    // Re-render DiagramCanvas with updated diagram
    rerender(<DiagramCanvas diagram={diagramWithNewNode} onUpdateDiagram={handleUpdate} />);

    // Now Undo should be enabled and Redo should remain disabled
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Click Undo
    fireEvent.click(undoBtn);
    expect(handleUpdate).toHaveBeenCalledTimes(2);
    const restoredDiagram = handleUpdate.mock.calls[1][0];
    expect(restoredDiagram.nodes.length).toBe(sampleDiagram.nodes.length);

    // Re-render with restored diagram
    rerender(<DiagramCanvas diagram={restoredDiagram} onUpdateDiagram={handleUpdate} />);

    // Now Redo should be enabled!
    expect(redoBtn).not.toBeDisabled();

    // Click Redo
    fireEvent.click(redoBtn);
    expect(handleUpdate).toHaveBeenCalledTimes(3);
    const redoneDiagram = handleUpdate.mock.calls[2][0];
    expect(redoneDiagram.nodes.length).toBe(sampleDiagram.nodes.length + 1);
  });
});

describe('VisualStudioPage component', () => {
  it('renders studio navigation, inputs, and format selector including visual layout options', () => {
    render(
      <BrowserRouter>
        <VisualStudioPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: /TRPW bbot Visual Studio/i })).toBeInTheDocument();
    expect(screen.getByText('Back to Chat')).toBeInTheDocument();
    expect(screen.getByText(/1\. Source Document/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Instructions \/ Topic/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Target Visual Type/i)).toBeInTheDocument();
    expect(screen.getByText('Process Flowchart')).toBeInTheDocument();
    expect(screen.getByText('Decision Flowchart')).toBeInTheDocument();
    expect(screen.getByText('Timeline / Roadmap')).toBeInTheDocument();
    expect(screen.getByText(/Circular Flywheel/i)).toBeInTheDocument();
    expect(screen.getByText(/Executive Bento Grid/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Visual/i })).toBeInTheDocument();
  });

  it('supports collapsible sidebar toggle button and keyboard shortcut', () => {
    render(
      <BrowserRouter>
        <VisualStudioPage />
      </BrowserRouter>
    );

    // Initial state: sidebar is visible, header button has aria-label
    const toggleBtn = screen.getByRole('button', { name: 'Collapse Sidebar for Full Canvas' });
    expect(toggleBtn).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleBtn);

    // After collapse: header button changes aria-label and floating controls button appears
    expect(screen.getByRole('button', { name: 'Show Controls Sidebar' })).toBeInTheDocument();
    const floatingBtn = screen.getByRole('button', { name: 'Expand Controls Sidebar' });
    expect(floatingBtn).toBeInTheDocument();

    // Click to expand again
    fireEvent.click(floatingBtn);
    expect(screen.getByRole('button', { name: 'Collapse Sidebar for Full Canvas' })).toBeInTheDocument();
  });

  it('prompts user with Save Confirmation modal before clearing an active canvas', async () => {
    // Seed localStorage with an active diagram
    const testDiagram: DiagramSpec = {
      version: '1.0',
      diagramType: 'process_flow',
      title: 'Active Workflow Pipeline',
      summary: 'Testing save confirmation prompt',
      theme: 'modern',
      nodes: [
        { id: 'n1', label: 'Step 1', type: 'start' },
        { id: 'n2', label: 'Step 2', type: 'process' },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    localStorage.setItem(
      'bbot_visual_studio_state',
      JSON.stringify({
        prompt: 'Active Workflow Pipeline',
        diagram: testDiagram,
        selectedType: 'process_flow',
      })
    );

    render(
      <BrowserRouter>
        <VisualStudioPage />
      </BrowserRouter>
    );

    // Verify New Canvas button is visible
    const newCanvasBtn = screen.getByRole('button', { name: /New Canvas/i });
    expect(newCanvasBtn).toBeInTheDocument();

    // Click New Canvas
    fireEvent.click(newCanvasBtn);

    // Save Confirmation Modal must appear asking whether to save or not
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Save Visual Before Clearing\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Save Blueprint & Continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Don't Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download JSON/i })).toBeInTheDocument();

    // Clicking "Keep Editing Canvas (Cancel)" cancels without clearing
    const cancelBtn = screen.getByRole('button', { name: /Keep Editing Canvas/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Clicking New Canvas again and choosing "Don't Save" clears the canvas
    fireEvent.click(newCanvasBtn);
    const dontSaveBtn = screen.getByRole('button', { name: /Don't Save/i });
    fireEvent.click(dontSaveBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

