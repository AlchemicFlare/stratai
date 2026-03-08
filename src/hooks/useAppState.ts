import { useState, useCallback } from 'react';
import type { AppState, Tool, ViewMode, LayerKey, Annotation, AISuggestion } from '@/types';
import { INITIAL_LAYERS, MOCK_ANNOTATIONS, MOCK_SUGGESTIONS, MOCK_DRILL_HOLE } from '@/data/mockData';

export function useAppState() {
  const [state, setState] = useState<AppState>({
    activeTool: 'select',
    activeView: 'linear',
    activeLayer: 'lithology',
    aiEnabled: true,
    voiceActive: false,
    syncStatus: 'synced',
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    selectedAnnotation: null,
    annotations: MOCK_ANNOTATIONS,
    layers: INITIAL_LAYERS,
    suggestions: MOCK_SUGGESTIONS,
    currentDepth: 52.4,
    drillHole: MOCK_DRILL_HOLE,
  });

  const setTool = useCallback((tool: Tool) => {
    setState(s => ({ ...s, activeTool: tool }));
  }, []);

  const setView = useCallback((view: ViewMode) => {
    setState(s => ({ ...s, activeView: view }));
  }, []);

  const setActiveLayer = useCallback((layer: LayerKey) => {
    setState(s => ({ ...s, activeLayer: layer }));
  }, []);

  const toggleAI = useCallback(() => {
    setState(s => ({ ...s, aiEnabled: !s.aiEnabled }));
  }, []);

  const toggleVoice = useCallback(() => {
    setState(s => ({ ...s, voiceActive: !s.voiceActive }));
  }, []);

  const toggleLayerVisibility = useCallback((key: LayerKey) => {
    setState(s => ({
      ...s,
      layers: s.layers.map(l => l.key === key ? { ...l, visible: !l.visible } : l),
    }));
  }, []);

  const toggleLayerLock = useCallback((key: LayerKey) => {
    setState(s => ({
      ...s,
      layers: s.layers.map(l => l.key === key ? { ...l, locked: !l.locked } : l),
    }));
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedAnnotation: id }));
  }, []);

  const validateAnnotation = useCallback((id: string) => {
    setState(s => ({
      ...s,
      annotations: s.annotations.map(a => a.id === id ? { ...a, validated: true } : a),
    }));
  }, []);

  const applySuggestion = useCallback((suggestion: AISuggestion) => {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: 'interval',
      layer: suggestion.type.toLowerCase() === 'structure' ? 'structure'
        : suggestion.type.toLowerCase() === 'rqd' ? 'rqd' : 'lithology',
      x: 40, y: 350, width: 200, height: 50,
      depth: parseFloat(suggestion.depth),
      label: suggestion.label,
      confidence: suggestion.confidence,
      color: suggestion.color,
      aiGenerated: true,
      validated: false,
      timestamp: Date.now(),
    };
    setState(s => ({
      ...s,
      annotations: [...s.annotations, newAnnotation],
      suggestions: s.suggestions.filter(sg => sg.id !== suggestion.id),
    }));
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setState(s => ({
      ...s,
      suggestions: s.suggestions.filter(sg => sg.id !== id),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setState(s => ({ ...s, zoom: Math.min(s.zoom + 0.25, 4) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(s => ({ ...s, zoom: Math.max(s.zoom - 0.25, 0.25) }));
  }, []);

  const resetZoom = useCallback(() => {
    setState(s => ({ ...s, zoom: 1, panOffset: { x: 0, y: 0 } }));
  }, []);

  const setCurrentDepth = useCallback((depth: number) => {
    setState(s => ({ ...s, currentDepth: depth }));
  }, []);

  const setSyncStatus = useCallback((status: AppState['syncStatus']) => {
    setState(s => ({ ...s, syncStatus: status }));
  }, []);

  return {
    state,
    actions: {
      setTool, setView, setActiveLayer, toggleAI, toggleVoice,
      toggleLayerVisibility, toggleLayerLock,
      selectAnnotation, validateAnnotation,
      applySuggestion, dismissSuggestion,
      zoomIn, zoomOut, resetZoom,
      setCurrentDepth, setSyncStatus,
    },
  };
}
