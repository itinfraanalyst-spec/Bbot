export type NodeShape =
  | 'card'
  | 'rectangle'
  | 'diamond'
  | 'heart'
  | 'cuboid'
  | 'pill'
  | 'hexagon'
  | 'cylinder'
  | 'glass'
  | 'sticky'
  | 'terminal'
  | 'minimal'
  | 'sharp';

export type EdgeRouting = 'curved' | 'orthogonal' | 'straight' | 'arc';
export type EdgeStrokeStyle = 'solid' | 'dashed' | 'dotted' | 'animated';
export type ArrowMarkerType = 'arrow' | 'triangle' | 'circle' | 'diamond' | 'none' | 'both';

export interface NodeCustomStyle {
  shape?: NodeShape;
  bgColor?: string;
  bgOpacity?: number;
  borderColor?: string;
  textColor?: string;
  subtextColor?: string;
  fontSize?: 'xs' | 'sm' | 'md' | 'lg';
  fontWeight?: 'normal' | 'medium' | 'bold' | 'black';
  textAlign?: 'left' | 'center' | 'right';
  // Granular Subheading / Subtitle styling
  subheadingFontSize?: 'xs' | 'sm' | 'md' | 'lg';
  subheadingFontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  subheadingStyle?: 'normal' | 'italic' | 'uppercase';
  subheadingTextAlign?: 'left' | 'center' | 'right';
  subheadingLines?: 1 | 2 | 3 | 4 | 'all';
  subheadingPill?: boolean;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  borderWidth?: number;
  glowColor?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'glow';
  borderRadius?: number;
}

export interface EdgeCustomStyle {
  routing?: EdgeRouting;
  strokeStyle?: EdgeStrokeStyle;
  strokeWidth?: number;
  color?: string;
  arrowMarker?: ArrowMarkerType;
  animated?: boolean;
}

export interface NodeSpec {
  id: string;
  label: string;
  sublabel?: string;
  type?: 'start' | 'process' | 'decision' | 'end' | 'entity' | 'store' | 'concept' | string;
  group?: string;
  color?: string;
  order?: number;
  icon?: string;
  badge?: string;
  imageUrl?: string;
  // Freeform canvas coordinate & dimension overrides
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  customStyle?: NodeCustomStyle;
}

export interface EdgeSpec {
  id: string;
  source: string;
  target: string;
  label?: string;
  color?: string;
  style?: 'solid' | 'dashed';
  customStyle?: EdgeCustomStyle;
}

export interface ChartDataSpec {
  xAxisKey: string;
  dataKeys: string[];
  rows: Record<string, any>[];
  unit?: string;
}

export interface DiagramSpec {
  version: string;
  diagramType: string;
  title: string;
  summary: string;
  explanation?: string;
  theme: string;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  chartData?: ChartDataSpec;
  sourceReferences?: string[];
  scopeCoverage?: string;
  scopePhases?: string[];
  viewMode?: 'template' | 'canvas';
  canvasLayout?: 'horizontal' | 'vertical' | 'grid' | 'tree' | 'radial' | 'manual';
  canvasBg?: string;
  canvasGridPattern?: 'dots' | 'grid' | 'clean';
  mermaid_code?: string;
}

export interface VisualTypeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'flow' | 'temporal' | 'structure' | 'relationship' | 'comparison' | 'chart';
}

export interface RecommendationResponse {
  recommendedType: string;
  availableTypes: VisualTypeInfo[];
  explanation: string;
  keyEntities: string[];
  suggestedTitle: string;
}
