import type { Tool } from '@/types';

interface ToolbarProps {
  activeTool: Tool;
  aiEnabled: boolean;
  voiceActive: boolean;
  onSelectTool: (tool: Tool) => void;
  onToggleAI: () => void;
  onToggleVoice: () => void;
}

const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: 'select', icon: '↖', label: 'Select' },
  { key: 'point', icon: '•', label: 'Point' },
  { key: 'line', icon: '╱', label: 'Line' },
  { key: 'polygon', icon: '⬡', label: 'Polygon' },
  { key: 'measure', icon: '📏', label: 'Measure' },
  { key: 'eraser', icon: '⌫', label: 'Eraser' },
];

export function Toolbar({ activeTool, aiEnabled, voiceActive, onSelectTool, onToggleAI, onToggleVoice }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* AI Toggle */}
      <button
        onClick={onToggleAI}
        className={`w-full py-2.5 rounded-lg text-[12px] font-semibold tracking-wide uppercase transition-all ${
          aiEnabled
            ? 'bg-gradient-to-r from-[hsl(200,100%,37%)] to-[hsl(190,100%,45%)] text-white ai-glow'
            : 'bg-[hsl(220,15%,15%)] text-[hsl(220,10%,50%)] border border-[hsl(220,15%,20%)]'
        }`}
      >
        {aiEnabled ? '🤖 AI ON' : '🤖 AI OFF'}
      </button>

      {/* Annotation Tools */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)] font-semibold mb-2 px-1">
          Tools
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map(tool => (
            <button
              key={tool.key}
              onClick={() => onSelectTool(tool.key)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[11px] transition-all ${
                activeTool === tool.key
                  ? 'bg-[hsl(200,100%,37%)] text-white shadow-lg shadow-[hsl(200,100%,37%/0.2)]'
                  : 'bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] hover:bg-[hsl(220,15%,17%)] hover:text-[hsl(220,10%,80%)]'
              }`}
              title={tool.label}
            >
              <span className="text-[16px] leading-none">{tool.icon}</span>
              <span className="font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Command */}
      <button
        onClick={onToggleVoice}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 text-[12px] font-semibold transition-all relative overflow-hidden ${
          voiceActive
            ? 'bg-[hsl(20,95%,53%)] text-white'
            : 'bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] border border-[hsl(220,15%,20%)] hover:border-[hsl(20,95%,53%)] hover:text-[hsl(20,95%,60%)]'
        }`}
      >
        {voiceActive && (
          <>
            <span className="absolute inset-0 rounded-lg border-2 border-[hsl(20,95%,53%)] voice-ring" />
            <span className="absolute inset-0 rounded-lg border-2 border-[hsl(20,95%,53%)] voice-ring" style={{ animationDelay: '0.4s' }} />
          </>
        )}
        <span className="relative z-10">🎙️</span>
        <span className="relative z-10">{voiceActive ? 'Listening…' : 'Voice'}</span>
      </button>

      {/* Quick Actions */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)] font-semibold mb-2 px-1">
          Quick Actions
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { icon: '📊', label: 'Calculate RQD' },
            { icon: '📸', label: 'Capture Photo' },
            { icon: '📍', label: 'Log GPS' },
          ].map(action => (
            <button
              key={action.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(220,15%,13%)] text-[hsl(220,10%,55%)] text-[12px] hover:bg-[hsl(220,15%,17%)] hover:text-[hsl(220,10%,80%)] transition-all"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
