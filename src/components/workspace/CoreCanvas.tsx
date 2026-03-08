import { useRef, useEffect, useCallback } from 'react';
import type { Annotation, ViewMode, Layer, Tool } from '@/types';

interface CoreCanvasProps {
  annotations: Annotation[];
  layers: Layer[];
  activeView: ViewMode;
  activeTool: Tool;
  zoom: number;
  currentDepth: number;
  selectedAnnotation: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onSetDepth: (depth: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSetView: (view: ViewMode) => void;
}

export function CoreCanvas({
  annotations, layers, activeView, activeTool, zoom, currentDepth,
  selectedAnnotation, onSelectAnnotation, onSetDepth,
  onZoomIn, onZoomOut, onResetZoom, onSetView,
}: CoreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleLayers = new Set(layers.filter(l => l.visible).map(l => l.key));

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr * zoom, dpr * zoom);

    const w = rect.width / zoom;
    const h = rect.height / zoom;

    // Background
    ctx.fillStyle = '#13151a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(58,63,75,0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Core strip
    const coreX = 60;
    const coreW = 180;
    const coreH = h - 40;

    // Core shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(coreX + 4, 24, coreW, coreH);

    // Core background gradient
    const coreGrad = ctx.createLinearGradient(0, 20, 0, 20 + coreH);
    const rockColors = ['#6b5b4d', '#8a7b6b', '#5c5047', '#c8b8a8', '#d4a574', '#3a3a3a', '#e0ddd0', '#7a6a5a', '#5c4f42', '#8a7b6b'];
    rockColors.forEach((c, i) => {
      coreGrad.addColorStop(i / (rockColors.length - 1), c);
    });
    ctx.fillStyle = coreGrad;
    ctx.fillRect(coreX, 20, coreW, coreH);

    // Core highlight edge
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(coreX, 20, 3, coreH);

    // Depth ruler
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    const startDepth = 40;
    const depthPerPixel = 0.15;
    for (let y = 20; y < 20 + coreH; y += 40) {
      const depth = startDepth + (y - 20) * depthPerPixel;
      ctx.fillText(`${depth.toFixed(1)}m`, coreX - 8, y + 3);
      ctx.strokeStyle = 'rgba(156,163,175,0.15)';
      ctx.beginPath();
      ctx.moveTo(coreX - 4, y);
      ctx.lineTo(coreX, y);
      ctx.stroke();
    }

    // Draw annotations
    const filteredAnnotations = annotations.filter(a => visibleLayers.has(a.layer));

    for (const ann of filteredAnnotations) {
      const isSelected = ann.id === selectedAnnotation;

      if (ann.type === 'interval' && ann.width && ann.height) {
        // Interval zone
        ctx.fillStyle = ann.color + '30';
        ctx.fillRect(coreX + ann.x - 40, ann.y + 20, ann.width, ann.height);
        ctx.strokeStyle = isSelected ? '#00d4ff' : ann.color + '80';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(coreX + ann.x - 40, ann.y + 20, ann.width, ann.height);

        // Label
        ctx.fillStyle = isSelected ? '#ffffff' : '#e8eaed';
        ctx.font = `${isSelected ? 'bold ' : ''}10px "Outfit", sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(ann.label, coreX + ann.x - 36, ann.y + 34);

        // Confidence tag
        if (ann.aiGenerated) {
          const confPct = Math.round(ann.confidence * 100);
          ctx.fillStyle = ann.validated ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)';
          const tagW = 38;
          ctx.fillRect(coreX + ann.x - 40 + ann.width - tagW - 4, ann.y + 24, tagW, 14);
          ctx.fillStyle = ann.validated ? '#34d399' : '#fbbf24';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${confPct}%`, coreX + ann.x - 40 + ann.width - tagW / 2 - 4, ann.y + 34);
        }
      } else if (ann.type === 'line') {
        ctx.strokeStyle = isSelected ? '#00d4ff' : ann.color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(coreX, ann.y + 20);
        ctx.lineTo(coreX + coreW, ann.y + 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = ann.color;
        ctx.font = '9px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ann.label, coreX + coreW + 6, ann.y + 24);
      } else if (ann.type === 'point') {
        ctx.beginPath();
        ctx.arc(coreX + ann.x - 40, ann.y + 20, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = ann.color;
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = ann.color;
        ctx.font = '9px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ann.label, coreX + ann.x - 30, ann.y + 24);
      } else if (ann.type === 'polygon' && ann.width && ann.height) {
        ctx.fillStyle = ann.color + '25';
        ctx.beginPath();
        const px = coreX + ann.x - 40;
        const py = ann.y + 20;
        ctx.moveTo(px + ann.width / 2, py);
        ctx.lineTo(px + ann.width, py + ann.height * 0.4);
        ctx.lineTo(px + ann.width * 0.85, py + ann.height);
        ctx.lineTo(px + ann.width * 0.15, py + ann.height);
        ctx.lineTo(px, py + ann.height * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#00d4ff' : ann.color + '80';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = ann.color;
        ctx.font = '9px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ann.label, px + ann.width / 2, py + ann.height + 12);
      }
    }

    // Current depth indicator
    const depthY = 20 + (currentDepth - startDepth) / depthPerPixel;
    if (depthY >= 20 && depthY <= 20 + coreH) {
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(0, depthY);
      ctx.lineTo(w, depthY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`▸ ${currentDepth.toFixed(1)}m`, coreX + coreW + 8, depthY + 4);
    }

    // Cylindrical hint (right side)
    if (activeView === 'dual' || activeView === 'cylindrical') {
      const cylX = coreX + coreW + 80;
      const cylW = 140;
      const cylH = coreH;

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(cylX, 20, cylW, cylH);

      // Fake cylindrical unwrap gradient
      const cylGrad = ctx.createLinearGradient(cylX, 0, cylX + cylW, 0);
      cylGrad.addColorStop(0, 'rgba(107,91,77,0.7)');
      cylGrad.addColorStop(0.3, 'rgba(138,123,107,0.9)');
      cylGrad.addColorStop(0.5, 'rgba(200,184,168,0.95)');
      cylGrad.addColorStop(0.7, 'rgba(138,123,107,0.9)');
      cylGrad.addColorStop(1, 'rgba(107,91,77,0.7)');
      ctx.fillStyle = cylGrad;
      ctx.fillRect(cylX, 20, cylW, cylH);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('360° Unwrap', cylX + cylW / 2, 16);

      // Sinusoidal structure
      ctx.strokeStyle = '#ff6b35aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= cylW; x += 2) {
        const y = 120 + Math.sin((x / cylW) * Math.PI * 2) * 25;
        x === 0 ? ctx.moveTo(cylX + x, y) : ctx.lineTo(cylX + x, y);
      }
      ctx.stroke();
    }

  }, [annotations, visibleLayers, zoom, currentDepth, selectedAnnotation, activeView]);

  useEffect(() => {
    drawCanvas();
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on annotation
    const clickedAnnotation = [...annotations].reverse().find(ann => {
      if (!visibleLayers.has(ann.layer)) return false;
      if (ann.type === 'interval' && ann.width && ann.height) {
        return x >= 60 + ann.x - 40 && x <= 60 + ann.x - 40 + ann.width
          && y >= ann.y + 20 && y <= ann.y + 20 + ann.height;
      }
      if (ann.type === 'point') {
        return Math.hypot(x - (60 + ann.x - 40), y - (ann.y + 20)) < 8;
      }
      return false;
    });

    onSelectAnnotation(clickedAnnotation?.id ?? null);

    // Update depth based on click position
    const startDepth = 40;
    const depthPerPixel = 0.15;
    const clickDepth = startDepth + (y - 20) * depthPerPixel;
    if (clickDepth >= 40 && clickDepth <= 100) {
      onSetDepth(Math.round(clickDepth * 10) / 10);
    }
  }, [annotations, visibleLayers, zoom, onSelectAnnotation, onSetDepth]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(220,20%,7%)]">
      {/* View tabs + zoom */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220,18%,10%)] border-b border-[hsl(220,15%,20%)]">
        <div className="flex gap-1.5">
          {(['linear', 'cylindrical', 'dual'] as ViewMode[]).map(view => (
            <button
              key={view}
              onClick={() => onSetView(view)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize ${
                activeView === view
                  ? 'bg-[hsl(200,100%,37%)] text-white shadow-md shadow-[hsl(200,100%,37%/0.3)]'
                  : 'text-[hsl(220,10%,50%)] hover:bg-[hsl(220,15%,15%)] hover:text-[hsl(220,10%,75%)]'
              }`}
            >
              {view === 'linear' ? '📊 Linear' : view === 'cylindrical' ? '🔄 360°' : '🪟 Dual'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-[hsl(220,10%,45%)] mr-2">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomOut} className="w-7 h-7 rounded bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] text-sm hover:bg-[hsl(220,15%,17%)] transition-all flex items-center justify-center">−</button>
          <button onClick={onResetZoom} className="w-7 h-7 rounded bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] text-[10px] hover:bg-[hsl(220,15%,17%)] transition-all flex items-center justify-center font-mono">1:1</button>
          <button onClick={onZoomIn} className="w-7 h-7 rounded bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] text-sm hover:bg-[hsl(220,15%,17%)] transition-all flex items-center justify-center">+</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0"
        />

        {/* Tool indicator */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[hsl(220,18%,10%/0.85)] border border-[hsl(220,15%,20%)] text-[10px] font-mono text-[hsl(220,10%,55%)] backdrop-blur-sm capitalize">
          {activeTool} tool
        </div>
      </div>

      {/* Depth scrubber bar */}
      <div className="h-8 bg-[hsl(220,18%,10%)] border-t border-[hsl(220,15%,20%)] flex items-center px-4 gap-2">
        <span className="text-[10px] font-mono text-[hsl(220,10%,45%)]">40.0m</span>
        <div className="flex-1 relative h-1.5 rounded-full bg-[hsl(220,15%,15%)]">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[hsl(200,100%,37%)] to-[hsl(195,100%,45%)]"
            style={{ width: `${((currentDepth - 40) / 60) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[hsl(20,95%,53%)] border-2 border-white shadow-lg"
            style={{ left: `${((currentDepth - 40) / 60) * 100}%`, marginLeft: '-6px' }}
          />
        </div>
        <span className="text-[10px] font-mono text-[hsl(220,10%,45%)]">100.0m</span>
        <span className="text-[11px] font-mono font-semibold text-[hsl(20,95%,55%)] ml-2">{currentDepth.toFixed(1)}m</span>
      </div>
    </div>
  );
}
