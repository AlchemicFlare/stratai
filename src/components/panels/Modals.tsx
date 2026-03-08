import { useState, useRef, useCallback } from 'react';

interface ModalShellProps {
  open: boolean;
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ open, title, icon, onClose, children }: ModalShellProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,22%)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-up shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(220,15%,18%)]">
          <span className="text-[14px] font-semibold">{icon && <span className="mr-2">{icon}</span>}{title}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-[hsl(220,15%,18%)] flex items-center justify-center text-[hsl(220,10%,50%)] transition-all">✕</button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-56px)]">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface UploadModalProps { open: boolean; onClose: () => void; onToast: (msg: string, icon?: string) => void; }

export function UploadModal({ open, onClose, onToast }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progresses, setProgresses] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const arr = Array.from(fileList);
    setFiles(arr);
    setProgresses(arr.map(() => 0));
    arr.forEach((_, i) => {
      let p = 0;
      const iv = setInterval(() => {
        p += Math.random() * 30;
        if (p >= 100) { p = 100; clearInterval(iv); }
        setProgresses(prev => { const n = [...prev]; n[i] = p; return n; });
      }, 200);
    });
    onToast(`${arr.length} file(s) selected`, '📤');
  }, [onToast]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }, [handleFiles]);

  return (
    <ModalShell open={open} title="Upload Core Photos" icon="📤" onClose={onClose}>
      <div
        className="border-2 border-dashed border-[hsl(220,15%,22%)] rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(200,100%,37%)] transition-all"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="text-3xl block mb-2">📤</span>
        <span className="text-[14px] font-semibold block">Drop files here or click to browse</span>
        <span className="text-[12px] text-[hsl(220,10%,50%)] block mt-1">JPG, PNG, TIFF • Max 50MB per file</span>
        <span className="text-[11px] text-[hsl(220,10%,40%)] block mt-1">Also accepts: HyLogger CSV, Hyperspectral ENVI, LAS files</span>
      </div>
      <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.tiff,.csv,.las" className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />

      {files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[hsl(220,15%,18%)]">
          <span className="text-[12px] font-semibold mb-2 block">Uploaded Files ({files.length})</span>
          {files.map((f, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] mb-1.5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="truncate">{f.name}</span>
                <span className="text-[hsl(220,10%,45%)]">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="h-1 rounded-full bg-[hsl(220,15%,18%)] overflow-hidden">
                <div className="h-full rounded-full bg-[hsl(160,85%,42%)] transition-all" style={{ width: `${progresses[i] ?? 0}%` }} />
              </div>
            </div>
          ))}
          <button
            onClick={() => { onToast('Processing files with AI…', '🤖'); setTimeout(() => { onClose(); onToast('3 core boxes detected', '✅'); }, 1500); }}
            className="w-full mt-3 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(200,100%,37%)] to-[hsl(195,100%,45%)] text-white text-[12px] font-semibold hover:opacity-90 transition-all"
          >
            ✨ Process with AI Assistant
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════

const EXPORT_FORMATS = [
  { key: 'geojson', icon: '🗺️', label: 'GeoJSON', desc: 'Geospatial format with depth intervals and CRS metadata' },
  { key: 'omf', icon: '🔷', label: 'Open Mining Format (OMF 2.0)', desc: 'For Leapfrog, Surpac, Micromine, Deswik' },
  { key: 'csv', icon: '📊', label: 'CSV (acQuire Compatible)', desc: 'Collar, Survey, Interval tables with standards' },
  { key: 'las', icon: '📈', label: 'LAS 2.0', desc: 'Well log ASCII standard format' },
  { key: 'coco', icon: '🤖', label: 'COCO Annotations', desc: 'ML training dataset with bounding boxes' },
  { key: 'jorc', icon: '📄', label: 'JORC Compliance Report', desc: 'Automated validation report with sign-off' },
];

interface ExportModalProps { open: boolean; onClose: () => void; onToast: (msg: string, icon?: string) => void; }

export function ExportModal({ open, onClose, onToast }: ExportModalProps) {
  return (
    <ModalShell open={open} title="Export Data" icon="💾" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {EXPORT_FORMATS.map(fmt => (
          <button
            key={fmt.key}
            onClick={() => { onToast(`Exporting as ${fmt.label}…`, fmt.icon); setTimeout(() => { onClose(); onToast(`${fmt.label} export ready`, '✅'); }, 1200); }}
            className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] hover:border-[hsl(200,100%,37%/0.4)] transition-all text-left group"
          >
            <span className="text-xl mt-0.5">{fmt.icon}</span>
            <div>
              <span className="text-[12px] font-semibold group-hover:text-[hsl(200,100%,55%)] transition-colors">{fmt.label}</span>
              <span className="text-[10px] text-[hsl(220,10%,45%)] block mt-0.5">{fmt.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH MODAL
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_RESULTS = [
  { depth: '147.5m – 149.8m', match: 92, desc: 'Tonalite with quartz veining' },
  { depth: '152.3m – 153.1m', match: 88, desc: 'Quartz-rich zone with pyrite' },
  { depth: '156.2m – 157.0m', match: 75, desc: 'Altered zone with quartz stringers' },
];

interface SearchModalProps { open: boolean; onClose: () => void; }

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof MOCK_RESULTS>([]);

  const doSearch = (q: string) => { setQuery(q); setResults(MOCK_RESULTS); };

  return (
    <ModalShell open={open} title="Semantic Search" icon="🔍" onClose={onClose}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && doSearch(query)}
        className="w-full px-3 py-2.5 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,20%)] text-[13px] placeholder:text-[hsl(220,10%,35%)] focus:border-[hsl(200,100%,37%)] focus:outline-none transition-all"
        placeholder="Search: 'all zones with >50% quartz' or 'pyrite mineralization'"
      />
      <div className="flex flex-wrap gap-1.5 mt-3">
        {['pyrite zones', 'RQD > 80%', 'chloritic alteration'].map(tag => (
          <button key={tag} onClick={() => doSearch(tag)} className="px-2.5 py-1 rounded-full bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,20%)] text-[10px] text-[hsl(220,10%,55%)] hover:border-[hsl(200,100%,37%/0.4)] transition-all">{tag}</button>
        ))}
      </div>
      {results.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[hsl(220,15%,18%)]">
          <span className="text-[11px] font-semibold mb-2 block">{results.length} Results</span>
          {results.map((r, i) => (
            <div key={i} className="p-3 rounded-xl bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] mb-1.5 cursor-pointer hover:border-[hsl(200,100%,37%/0.3)] transition-all">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-semibold">{r.depth}</span>
                <span className="text-[hsl(160,85%,50%)]">{r.match}% match</span>
              </div>
              <span className="text-[10px] text-[hsl(220,10%,50%)]">{r.desc}</span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE COMMANDS REFERENCE MODAL
// ═══════════════════════════════════════════════════════════════════════════

const VOICE_CATEGORIES = [
  { title: '🛠️ Tool Selection', cmds: [['select tool', 'Selection tool'], ['point tool', 'Point annotation'], ['line tool', 'Line annotation'], ['interval tool', 'Interval annotation']] },
  { title: '📍 Quick Annotations', cmds: [['add point', 'Add point at current depth'], ['add fracture', 'Mark fracture as line'], ['start interval', 'Begin depth interval'], ['end interval', 'Complete interval']] },
  { title: '🪨 Rock Types', cmds: [['rock type [name]', 'Set rock type'], ['tonalite / granite / basalt', 'Quick set rock type'], ['sandstone / shale / limestone', 'Quick set rock type']] },
  { title: '🔢 Measurements', cmds: [['calculate RQD', 'Auto-calculate RQD'], ['RQD [number]', 'Set RQD manually'], ['depth [number]', 'Jump to depth']] },
  { title: '💾 Actions', cmds: [['save', 'Save annotation'], ['next box / previous box', 'Navigate'], ['zoom in / zoom out', 'Adjust zoom'], ['note [text]', 'Add text to notes']] },
];

interface VoiceModalProps { open: boolean; onClose: () => void; }

export function VoiceModal({ open, onClose }: VoiceModalProps) {
  return (
    <ModalShell open={open} title="Voice Commands Reference" icon="🎤" onClose={onClose}>
      <p className="text-[11px] text-[hsl(220,10%,50%)] mb-4">
        Hands-free annotation for field geologists. Press <kbd className="px-1.5 py-0.5 rounded bg-[hsl(220,15%,15%)] border border-[hsl(220,15%,22%)] font-mono text-[9px]">V</kbd> to start listening.
      </p>
      {VOICE_CATEGORIES.map(cat => (
        <div key={cat.title} className="mb-3">
          <span className="text-[10px] font-semibold text-[hsl(200,100%,55%)] uppercase tracking-wide block mb-1.5">{cat.title}</span>
          {cat.cmds.map(([trigger, desc]) => (
            <div key={trigger} className="flex items-center gap-2 py-1">
              <span className="font-mono text-[10px] text-[hsl(160,85%,50%)] bg-[hsl(220,20%,7%)] px-2 py-0.5 rounded min-w-[160px]">"{trigger}"</span>
              <span className="text-[10px] text-[hsl(220,10%,50%)]">{desc}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="mt-3 p-3 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)]">
        <span className="text-[10px] font-semibold text-[hsl(160,85%,50%)] block mb-1">💡 Pro Tips</span>
        <ul className="text-[10px] text-[hsl(220,10%,50%)] space-y-0.5 ml-3 list-disc">
          <li>Commands are case-insensitive</li>
          <li>Works offline in Chrome/Edge</li>
          <li>Natural language supported: "change rock type to granite"</li>
          <li>Combine commands: "add point pyrite grey"</li>
        </ul>
      </div>
    </ModalShell>
  );
}
