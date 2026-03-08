import type { Layer, LayerKey } from '@/types';

interface LayersPanelProps {
  layers: Layer[];
  activeLayer: LayerKey;
  onSelectLayer: (key: LayerKey) => void;
  onToggleVisibility: (key: LayerKey) => void;
  onToggleLock: (key: LayerKey) => void;
}

export function LayersPanel({ layers, activeLayer, onSelectLayer, onToggleVisibility, onToggleLock }: LayersPanelProps) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)] font-semibold mb-2 px-1">
        Layers
      </div>
      <div className="flex flex-col gap-1">
        {layers.map(layer => (
          <div
            key={layer.key}
            onClick={() => onSelectLayer(layer.key)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
              activeLayer === layer.key
                ? 'bg-[hsl(200,100%,37%/0.12)] border border-[hsl(200,100%,37%/0.3)]'
                : 'bg-transparent border border-transparent hover:bg-[hsl(220,15%,13%)]'
            }`}
          >
            <div
              className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
              style={{ backgroundColor: layer.color }}
            />
            <span className="flex-1 text-[12px] font-medium truncate">{layer.label}</span>
            <span className="text-[10px] font-mono text-[hsl(220,10%,45%)] mr-1">{layer.count}</span>
            <button
              onClick={e => { e.stopPropagation(); onToggleVisibility(layer.key); }}
              className={`w-5 h-5 rounded flex items-center justify-center text-[11px] transition-all ${
                layer.visible
                  ? 'text-[hsl(200,100%,55%)]'
                  : 'text-[hsl(220,10%,30%)]'
              } hover:bg-[hsl(220,15%,20%)]`}
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? '👁' : '👁‍🗨'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleLock(layer.key); }}
              className={`w-5 h-5 rounded flex items-center justify-center text-[11px] transition-all ${
                layer.locked
                  ? 'text-[hsl(20,95%,53%)]'
                  : 'text-[hsl(220,10%,30%)]'
              } hover:bg-[hsl(220,15%,20%)]`}
              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {layer.locked ? '🔒' : '🔓'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
