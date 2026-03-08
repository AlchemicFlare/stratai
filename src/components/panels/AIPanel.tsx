import type { AISuggestion } from '@/types';

interface AIPanelProps {
  suggestions: AISuggestion[];
  aiEnabled: boolean;
  onApply: (suggestion: AISuggestion) => void;
  onDismiss: (id: string) => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'bg-emerald-400' : pct >= 75 ? 'bg-[hsl(200,100%,50%)]' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[hsl(220,15%,15%)] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-semibold" style={{ color: pct >= 90 ? '#34d399' : pct >= 75 ? '#38bdf8' : pct >= 60 ? '#fbbf24' : '#f87171' }}>
        {pct}%
      </span>
    </div>
  );
}

export function AIPanel({ suggestions, aiEnabled, onApply, onDismiss }: AIPanelProps) {
  if (!aiEnabled) {
    return (
      <div className="p-4 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)]">
        <div className="text-center text-[hsl(220,10%,40%)] text-[13px] py-6">
          <span className="text-2xl block mb-2">🤖</span>
          AI Co-Pilot is disabled
          <br />
          <span className="text-[11px]">Enable to receive real-time suggestions</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🤖</span>
          <span className="text-[13px] font-semibold">AI Co-Pilot</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(190,100%,50%/0.15)] text-[hsl(190,100%,55%)] font-bold uppercase tracking-wider ai-glow">
            Active
          </span>
        </div>
        <span className="text-[10px] text-[hsl(220,10%,45%)]">{suggestions.length} pending</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {suggestions.map((s, i) => (
          <div
            key={s.id}
            className="p-3 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] hover:border-[hsl(200,100%,37%/0.4)] transition-all animate-slide-in cursor-pointer group"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{s.icon}</span>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[hsl(220,10%,45%)] font-semibold block">{s.type}</span>
                  <span className="text-[12px] font-semibold">{s.label}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[hsl(200,100%,55%)]">{s.depth}</span>
            </div>

            <p className="text-[11px] text-[hsl(220,10%,55%)] leading-relaxed mb-2.5">
              {s.description}
            </p>

            <ConfidenceBar value={s.confidence} />

            <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onApply(s)}
                className="flex-1 py-1.5 rounded-md bg-[hsl(160,85%,42%/0.15)] text-[hsl(160,85%,50%)] text-[11px] font-semibold hover:bg-[hsl(160,85%,42%/0.25)] transition-all"
              >
                ✓ Apply
              </button>
              <button
                onClick={() => onDismiss(s.id)}
                className="flex-1 py-1.5 rounded-md bg-[hsl(4,75%,50%/0.1)] text-[hsl(4,75%,60%)] text-[11px] font-semibold hover:bg-[hsl(4,75%,50%/0.2)] transition-all"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-center text-[hsl(220,10%,40%)] text-[12px] py-6">
            <span className="text-xl block mb-1">✨</span>
            All suggestions reviewed
          </div>
        )}
      </div>
    </div>
  );
}
