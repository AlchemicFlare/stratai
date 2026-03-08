import type { Annotation } from '@/types';

interface StatsPanelProps {
  annotations: Annotation[];
  currentDepth: number;
}

export function StatsPanel({ annotations, currentDepth }: StatsPanelProps) {
  const total = annotations.length;
  const validated = annotations.filter(a => a.validated).length;
  const aiCount = annotations.filter(a => a.aiGenerated).length;
  const avgConf = total > 0 ? annotations.reduce((s, a) => s + a.confidence, 0) / total : 0;

  // Simulate RQD
  const rqd = 78 + Math.sin(currentDepth * 0.1) * 15;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)] font-semibold mb-2 px-1">
        Statistics
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label="Annotations" value={String(total)} sub={`${validated} validated`} color="hsl(200,100%,50%)" />
        <StatCard label="AI Generated" value={String(aiCount)} sub={`${Math.round((aiCount / Math.max(total, 1)) * 100)}% of total`} color="hsl(190,100%,50%)" />
        <StatCard label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} sub={avgConf >= 0.85 ? 'Excellent' : 'Good'} color="hsl(160,85%,42%)" />
        <StatCard label="RQD" value={`${Math.round(rqd)}%`} sub={rqd >= 75 ? 'Good quality' : rqd >= 50 ? 'Fair' : 'Poor'} color={rqd >= 75 ? 'hsl(160,85%,42%)' : rqd >= 50 ? 'hsl(46,95%,62%)' : 'hsl(4,75%,50%)'} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)]">
      <div className="text-[9px] uppercase tracking-wider text-[hsl(220,10%,45%)] font-semibold">{label}</div>
      <div className="text-[18px] font-bold font-mono mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[9px] text-[hsl(220,10%,40%)]">{sub}</div>
    </div>
  );
}
