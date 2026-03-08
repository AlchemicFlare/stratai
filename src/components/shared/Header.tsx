import type { AppState } from '@/types';

interface HeaderProps {
  drillHole: AppState['drillHole'];
  syncStatus: AppState['syncStatus'];
  onSync: () => void;
}

export function Header({ drillHole, syncStatus, onSync }: HeaderProps) {
  const syncColors: Record<string, string> = {
    synced: 'bg-emerald-400',
    syncing: 'bg-amber-400 breathe',
    offline: 'bg-zinc-500',
    error: 'bg-red-500',
  };
  const syncLabels: Record<string, string> = {
    synced: 'Synced',
    syncing: 'Syncing…',
    offline: 'Offline',
    error: 'Sync Error',
  };

  return (
    <header className="h-[56px] bg-[hsl(220,18%,10%)] border-b border-[hsl(220,15%,20%)] px-5 flex items-center justify-between shrink-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[hsl(200,100%,37%)] to-[hsl(195,100%,45%)] flex items-center justify-center text-white font-bold text-sm tracking-tight">
          sA
        </div>
        <span className="text-[15px] font-bold tracking-tight">
          strat<span className="text-[hsl(200,100%,55%)]">AI</span>
        </span>
        <span className="text-[11px] font-mono text-[hsl(220,10%,50%)] ml-1 hidden sm:inline">v0.1-beta</span>
      </div>

      {/* Project Info */}
      <div className="flex items-center gap-6 text-[13px] text-[hsl(220,10%,60%)]">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-[hsl(220,10%,80%)]">{drillHole.name}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[hsl(200,100%,37%/0.15)] text-[hsl(200,100%,55%)] font-medium uppercase tracking-wide">
            {drillHole.status}
          </span>
        </div>
        <span className="hidden md:inline">Depth: {drillHole.totalDepth}m</span>
        <span className="hidden lg:inline">Az: {drillHole.azimuth}° / Dip: {drillHole.dip}°</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSync}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[hsl(220,15%,20%)] bg-[hsl(220,18%,12%)] hover:border-[hsl(160,85%,42%)] transition-all text-[12px]"
        >
          <div className={`w-2 h-2 rounded-full ${syncColors[syncStatus]}`} />
          <span>{syncLabels[syncStatus]}</span>
        </button>
        <button className="w-8 h-8 rounded-md border border-[hsl(220,15%,20%)] bg-[hsl(220,18%,12%)] flex items-center justify-center text-[hsl(220,10%,60%)] hover:text-white hover:border-[hsl(200,100%,37%)] transition-all text-sm">
          ⚙
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(200,100%,37%)] to-[hsl(20,95%,53%)] flex items-center justify-center text-[11px] text-white font-bold">
          JS
        </div>
      </div>
    </header>
  );
}
