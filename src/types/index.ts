export type Tool = 'select' | 'point' | 'line' | 'polygon' | 'measure' | 'voice' | 'eraser';
export type ViewMode = 'linear' | 'cylindrical' | 'dual';
export type LayerKey = 'lithology' | 'structure' | 'alteration' | 'mineralization' | 'rqd';

export interface Annotation {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'interval';
  layer: LayerKey;
  x: number;
  y: number;
  width?: number;
  height?: number;
  depth: number;
  depthEnd?: number;
  label: string;
  confidence: number;
  color: string;
  aiGenerated: boolean;
  validated: boolean;
  timestamp: number;
}

export interface Layer {
  key: LayerKey;
  label: string;
  color: string;
  visible: boolean;
  locked: boolean;
  count: number;
}

export interface AISuggestion {
  id: string;
  type: string;
  label: string;
  description: string;
  confidence: number;
  depth: string;
  color: string;
  icon: string;
}

export interface DrillHole {
  id: string;
  name: string;
  collar: { lat: number; lng: number; elevation: number };
  totalDepth: number;
  azimuth: number;
  dip: number;
  status: 'logging' | 'complete' | 'qc-review';
}

export interface CoreBox {
  id: string;
  holeId: string;
  boxNumber: number;
  depthFrom: number;
  depthTo: number;
  imageUrl?: string;
  rqd?: number;
  annotationCount: number;
}

export interface AppState {
  activeTool: Tool;
  activeView: ViewMode;
  activeLayer: LayerKey;
  aiEnabled: boolean;
  voiceActive: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  zoom: number;
  panOffset: { x: number; y: number };
  selectedAnnotation: string | null;
  annotations: Annotation[];
  layers: Layer[];
  suggestions: AISuggestion[];
  currentDepth: number;
  drillHole: DrillHole;
}
