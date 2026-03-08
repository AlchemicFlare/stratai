import type { Annotation, Layer, AISuggestion, DrillHole, CoreBox } from '@/types';

export const ROCK_COLORS: Record<string, string> = {
  granite: '#c8b8a8',
  basalt: '#3a3a3a',
  sandstone: '#d4a574',
  limestone: '#e0ddd0',
  shale: '#5c5047',
  quartzVein: '#f5f0e8',
  diorite: '#8a8a7a',
  gneiss: '#9a8a7a',
  schist: '#6a7a5a',
  tonalite: '#a0a090',
};

export const MUNSELL_PALETTE = [
  '#c8b8a8', '#d4a574', '#8a7b6b', '#5c5047',
  '#3a3a3a', '#e0ddd0', '#6b5b4d', '#a09080',
  '#7a6a5a', '#f5f0e8', '#4a5a3a', '#b0a090',
];

export const INITIAL_LAYERS: Layer[] = [
  { key: 'lithology', label: 'Lithology', color: '#0077be', visible: true, locked: false, count: 12 },
  { key: 'structure', label: 'Structure', color: '#ff6b35', visible: true, locked: false, count: 8 },
  { key: 'alteration', label: 'Alteration', color: '#06d6a0', visible: true, locked: false, count: 5 },
  { key: 'mineralization', label: 'Mineralization', color: '#ffd23f', visible: false, locked: false, count: 3 },
  { key: 'rqd', label: 'RQD Zones', color: '#ee6055', visible: true, locked: true, count: 15 },
];

export const MOCK_ANNOTATIONS: Annotation[] = [
  {
    id: 'ann-001', type: 'interval', layer: 'lithology',
    x: 40, y: 30, width: 200, height: 80,
    depth: 45.2, depthEnd: 52.8,
    label: 'Granite (medium-grained)', confidence: 0.94,
    color: '#c8b8a8', aiGenerated: true, validated: true, timestamp: Date.now() - 3600000,
  },
  {
    id: 'ann-002', type: 'interval', layer: 'lithology',
    x: 40, y: 115, width: 200, height: 60,
    depth: 52.8, depthEnd: 58.1,
    label: 'Sandstone (fine-grained)', confidence: 0.88,
    color: '#d4a574', aiGenerated: true, validated: false, timestamp: Date.now() - 3200000,
  },
  {
    id: 'ann-003', type: 'line', layer: 'structure',
    x: 80, y: 108, depth: 52.0,
    label: 'Fracture (α=35° β=120°)', confidence: 0.76,
    color: '#ff6b35', aiGenerated: false, validated: true, timestamp: Date.now() - 2800000,
  },
  {
    id: 'ann-004', type: 'interval', layer: 'lithology',
    x: 40, y: 180, width: 200, height: 90,
    depth: 58.1, depthEnd: 67.4,
    label: 'Basalt (aphanitic)', confidence: 0.91,
    color: '#3a3a3a', aiGenerated: true, validated: true, timestamp: Date.now() - 2400000,
  },
  {
    id: 'ann-005', type: 'polygon', layer: 'alteration',
    x: 120, y: 200, width: 80, height: 40,
    depth: 60.5, depthEnd: 63.2,
    label: 'Sericitic alteration', confidence: 0.82,
    color: '#06d6a0', aiGenerated: true, validated: false, timestamp: Date.now() - 2000000,
  },
  {
    id: 'ann-006', type: 'point', layer: 'mineralization',
    x: 160, y: 240, depth: 64.8,
    label: 'Pyrite (disseminated)', confidence: 0.71,
    color: '#ffd23f', aiGenerated: true, validated: false, timestamp: Date.now() - 1600000,
  },
  {
    id: 'ann-007', type: 'interval', layer: 'lithology',
    x: 40, y: 275, width: 200, height: 70,
    depth: 67.4, depthEnd: 74.0,
    label: 'Limestone (fossiliferous)', confidence: 0.87,
    color: '#e0ddd0', aiGenerated: false, validated: true, timestamp: Date.now() - 1200000,
  },
  {
    id: 'ann-008', type: 'line', layer: 'structure',
    x: 60, y: 310, depth: 71.0,
    label: 'Quartz vein (3.2cm)', confidence: 0.93,
    color: '#f5f0e8', aiGenerated: true, validated: true, timestamp: Date.now() - 800000,
  },
];

export const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'sug-001', type: 'LITHOLOGY', label: 'Diorite detected',
    description: 'Medium-grained igneous intrusion at 74.0–78.5m. Biotite-hornblende assemblage consistent with calc-alkaline series.',
    confidence: 0.89, depth: '74.0–78.5m', color: '#8a8a7a', icon: '🪨',
  },
  {
    id: 'sug-002', type: 'STRUCTURE', label: 'Shear zone boundary',
    description: 'High-angle brittle-ductile transition at 76.2m. Displacement indicators suggest sinistral movement.',
    confidence: 0.74, depth: '76.2m', color: '#ff6b35', icon: '📐',
  },
  {
    id: 'sug-003', type: 'RQD', label: 'RQD anomaly',
    description: 'Calculated RQD drops to 34% between 75.0–77.0m. Consistent with fractured zone. Auto-RQD confidence: high.',
    confidence: 0.96, depth: '75.0–77.0m', color: '#ee6055', icon: '📊',
  },
];

export const MOCK_DRILL_HOLE: DrillHole = {
  id: 'DH-2026-0042',
  name: 'DH-2026-0042',
  collar: { lat: -31.9505, lng: 115.8605, elevation: 342.5 },
  totalDepth: 450.0,
  azimuth: 135,
  dip: -60,
  status: 'logging',
};

export const MOCK_CORE_BOXES: CoreBox[] = Array.from({ length: 12 }, (_, i) => ({
  id: `box-${String(i + 1).padStart(3, '0')}`,
  holeId: 'DH-2026-0042',
  boxNumber: i + 1,
  depthFrom: 40 + i * 5,
  depthTo: 45 + i * 5,
  rqd: Math.round(60 + Math.random() * 35),
  annotationCount: Math.floor(2 + Math.random() * 6),
}));

export const VOICE_COMMANDS = [
  'add granite point',
  'mark fracture zone',
  'set lithology basalt',
  'calculate RQD',
  'next core box',
  'zoom in',
  'accept suggestion',
  'add quartz vein',
  'mark alteration sericitic',
  'save annotation',
];
