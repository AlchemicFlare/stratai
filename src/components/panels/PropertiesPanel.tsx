import type { Annotation } from '@/types';

interface PropertiesPanelProps {
  annotation: Annotation | null;
  onValidate: (id: string) => void;
}

export function PropertiesPanel({ annotation, onValidate }: PropertiesPanelProps) {
  if (!annotation) {
    return (
      <div className="p-4 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] text-center text-[hsl(220,10%,40%)] text-[12px] py-8">
        <span className="text-xl block mb-2">📋</span>
        Select an annotation to view properties
      </div>
    );
  }

  const pct = Math.round(annotation.confidence * 100);

  return (
    <div className="p-4 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold">Properties</span>
        <span className="text-[10px] font-mono text-[hsl(220,10%,40%)]">{annotation.id}</span>
      </div>

      <div className="space-y-3">
        <Field label="Label" value={annotation.label} />
        <Field label="Type" value={annotation.type} />
        <Field label="Layer" value={annotation.layer} />
        <Field label="Depth" value={`${annotation.depth}m${annotation.depthEnd ? ` – ${annotation.depthEnd}m` : ''}`} />

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)] font-semibold block mb-1">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-[hsl(220,15%,18%)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 90 ? '#34d399' : pct >= 75 ? '#38bdf8' : pct >= 60 ? '#fbbf24' : '#f87171',
                }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold">{pct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)] font-semibold">Color</span>
          <div className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: annotation.color }} />
          <span className="text-[11px] font-mono text-[hsl(220,10%,55%)]">{annotation.color}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span>{annotation.aiGenerated ? '🤖' : '👤'}</span>
            <span className="text-[hsl(220,10%,55%)]">{annotation.aiGenerated ? 'AI Generated' : 'Manual'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{annotation.validated ? '✅' : '⏳'}</span>
            <span className="text-[hsl(220,10%,55%)]">{annotation.validated ? 'Validated' : 'Pending'}</span>
          </div>
        </div>

        {!annotation.validated && (
          <button
            onClick={() => onValidate(annotation.id)}
            className="w-full py-2 rounded-lg bg-[hsl(160,85%,42%)] text-white text-[12px] font-semibold hover:bg-[hsl(160,85%,38%)] transition-all mt-1"
          >
            ✓ Validate Annotation
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)] font-semibold block mb-0.5">{label}</span>
      <span className="text-[12px] capitalize">{value}</span>
    </div>
  );
}
