import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/shared/Header';
import { Toolbar } from '@/components/panels/Toolbar';
import { LayersPanel } from '@/components/panels/LayersPanel';
import { StatsPanel } from '@/components/panels/StatsPanel';
import { AIPanel } from '@/components/panels/AIPanel';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { CoreCanvas } from '@/components/workspace/CoreCanvas';
import { UploadModal, ExportModal, SearchModal, VoiceModal } from '@/components/panels/Modals';
import { useAppState } from '@/hooks/useAppState';

type ModalKey = 'upload' | 'export' | 'search' | 'voice' | null;

function App() {
  const { state, actions } = useAppState();
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; icon: string }[]>([]);

  const addToast = useCallback((msg: string, icon = '✅') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const handleSync = useCallback(() => {
    actions.setSyncStatus('syncing');
    addToast('Syncing data…', '🔄');
    setTimeout(() => { actions.setSyncStatus('synced'); addToast('Data synced successfully', '✅'); }, 2000);
  }, [actions, addToast]);

  const handleApplySuggestion = useCallback((s: Parameters<typeof actions.applySuggestion>[0]) => {
    actions.applySuggestion(s);
    addToast(`Applied: ${s.label}`, '🤖');
  }, [actions, addToast]);

  const handleDismissSuggestion = useCallback((id: string) => {
    actions.dismissSuggestion(id);
    addToast('Suggestion dismissed', '✕');
  }, [actions, addToast]);

  const handleValidate = useCallback((id: string) => {
    actions.validateAnnotation(id);
    addToast('Annotation validated', '✅');
  }, [actions, addToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 's': actions.setTool('select'); break;
        case 'p': actions.setTool('point'); break;
        case 'l': actions.setTool('line'); break;
        case 'i': actions.setTool('polygon'); break;
        case 'v': actions.toggleVoice(); break;
        case '+': case '=': actions.zoomIn(); break;
        case '-': actions.zoomOut(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);

  const selectedAnnotation = state.annotations.find(a => a.id === state.selectedAnnotation) ?? null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Welcome Overlay ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowWelcome(false)}>
          <div className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,22%)] rounded-2xl p-8 max-w-lg w-full text-center animate-fade-up shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(200,100%,37%)] to-[hsl(195,100%,45%)] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">sA</div>
            <h2 className="text-xl font-bold mb-1">Welcome to strat<span className="text-[hsl(200,100%,55%)]">AI</span></h2>
            <p className="text-[hsl(220,10%,50%)] text-[13px] mb-5">Your AI co-pilot for intelligent drill core annotation.<br/>Click, explore, and interact with all elements.</p>
            <div className="grid grid-cols-2 gap-2 text-left mb-6">
              {[
                { icon: '🤖', title: 'AI Suggestions', desc: 'Real-time lithology & structure detection' },
                { icon: '🎙️', title: 'Voice Commands', desc: '40+ geological voice commands' },
                { icon: '📊', title: 'Auto-RQD', desc: 'Automated rock quality calculation' },
                { icon: '🔄', title: 'Offline-First', desc: 'Full functionality without connectivity' },
              ].map(item => (
                <div key={item.title} className="px-3 py-2.5 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,18%)]">
                  <span className="text-lg">{item.icon}</span>
                  <div className="text-[11px] font-semibold mt-1">{item.title}</div>
                  <div className="text-[10px] text-[hsl(220,10%,45%)]">{item.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowWelcome(false)} className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(200,100%,37%)] to-[hsl(195,100%,45%)] text-white font-semibold text-[13px] hover:opacity-90 transition-all shadow-lg shadow-[hsl(200,100%,37%/0.3)]">
              Start Annotating →
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <Header drillHole={state.drillHole} syncStatus={state.syncStatus} onSync={handleSync} />

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar */}
        <aside className="w-[220px] shrink-0 bg-[hsl(220,18%,10%)] border-r border-[hsl(220,15%,20%)] flex flex-col overflow-y-auto">
          <div className="p-3 flex flex-col gap-4 flex-1">
            <Toolbar
              activeTool={state.activeTool}
              aiEnabled={state.aiEnabled}
              voiceActive={state.voiceActive}
              onSelectTool={actions.setTool}
              onToggleAI={actions.toggleAI}
              onToggleVoice={actions.toggleVoice}
            />
            <div className="border-t border-[hsl(220,15%,18%)] pt-3">
              <LayersPanel layers={state.layers} activeLayer={state.activeLayer} onSelectLayer={actions.setActiveLayer} onToggleVisibility={actions.toggleLayerVisibility} onToggleLock={actions.toggleLayerLock} />
            </div>
            <div className="border-t border-[hsl(220,15%,18%)] pt-3 mt-auto">
              <StatsPanel annotations={state.annotations} currentDepth={state.currentDepth} />
            </div>
          </div>
        </aside>

        {/* Main Canvas */}
        <CoreCanvas
          annotations={state.annotations} layers={state.layers} activeView={state.activeView}
          activeTool={state.activeTool} zoom={state.zoom} currentDepth={state.currentDepth}
          selectedAnnotation={state.selectedAnnotation}
          onSelectAnnotation={actions.selectAnnotation} onSetDepth={actions.setCurrentDepth}
          onZoomIn={actions.zoomIn} onZoomOut={actions.zoomOut} onResetZoom={actions.resetZoom}
          onSetView={actions.setView}
        />

        {/* Right Sidebar */}
        <aside className="w-[300px] shrink-0 bg-[hsl(220,18%,10%)] border-l border-[hsl(220,15%,20%)] flex flex-col overflow-y-auto">
          <div className="p-3 flex flex-col gap-4">
            <AIPanel suggestions={state.suggestions} aiEnabled={state.aiEnabled} onApply={handleApplySuggestion} onDismiss={handleDismissSuggestion} />
            <div className="border-t border-[hsl(220,15%,18%)] pt-3">
              <PropertiesPanel annotation={selectedAnnotation} onValidate={handleValidate} />
            </div>
            <div className="border-t border-[hsl(220,15%,18%)] pt-3">
              <div className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,45%)] font-semibold mb-2 px-1">Export</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[{ label: 'OMF 2.0', icon: '📦' }, { label: 'CSV', icon: '📄' }, { label: 'GeoJSON', icon: '🗺️' }, { label: 'Leapfrog', icon: '🐸' }].map(fmt => (
                  <button key={fmt.label} onClick={() => addToast(`Exported as ${fmt.label}`, fmt.icon)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)] text-[11px] text-[hsl(220,10%,55%)] hover:border-[hsl(200,100%,37%/0.4)] hover:text-[hsl(220,10%,80%)] transition-all">
                    <span>{fmt.icon}</span><span>{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Status Bar ── */}
      <div className="h-6 bg-[hsl(220,18%,8%)] border-t border-[hsl(220,15%,18%)] flex items-center justify-between px-4 text-[10px] font-mono text-[hsl(220,10%,40%)] shrink-0">
        <div className="flex items-center gap-4">
          <span>stratAI v0.1-beta</span><span>•</span>
          <span>{state.drillHole.name}</span><span>•</span>
          <span>Depth: {state.currentDepth.toFixed(1)}m / {state.drillHole.totalDepth}m</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{state.annotations.length} annotations</span><span>•</span>
          <span>Zoom: {Math.round(state.zoom * 100)}%</span><span>•</span>
          <span className="text-[hsl(160,85%,42%)]">● {state.syncStatus === 'synced' ? 'Synced' : state.syncStatus}</span>
        </div>
      </div>

      {/* ── Keyboard Shortcuts Bar ── */}
      <div className="fixed bottom-8 left-3 bg-[hsl(220,18%,10%/0.9)] border border-[hsl(220,15%,20%)] rounded-lg px-3 py-1.5 text-[9px] font-mono text-[hsl(220,10%,40%)] z-50 backdrop-blur-sm flex items-center gap-2">
        <kbd className="px-1 py-0.5 rounded bg-[hsl(220,20%,7%)] border border-[hsl(220,15%,22%)]">S</kbd> Select
        <kbd className="px-1 py-0.5 rounded bg-[hsl(220,20%,7%)] border border-[hsl(220,15%,22%)]">P</kbd> Point
        <kbd className="px-1 py-0.5 rounded bg-[hsl(220,20%,7%)] border border-[hsl(220,15%,22%)]">L</kbd> Line
        <kbd className="px-1 py-0.5 rounded bg-[hsl(220,20%,7%)] border border-[hsl(220,15%,22%)]">V</kbd> Voice
        <kbd className="px-1 py-0.5 rounded bg-[hsl(220,20%,7%)] border border-[hsl(220,15%,22%)]">+/-</kbd> Zoom
      </div>

      {/* ── FABs ── */}
      <div className="fixed bottom-8 right-[316px] flex flex-col gap-2 z-50">
        <button onClick={() => setActiveModal('upload')} className="w-11 h-11 rounded-full bg-[hsl(20,95%,53%)] text-white flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform" title="Upload">📤</button>
        <button onClick={() => setActiveModal('export')} className="w-11 h-11 rounded-full bg-[hsl(160,85%,42%)] text-white flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform" title="Export">💾</button>
        <button onClick={() => setActiveModal('search')} className="w-11 h-11 rounded-full bg-[hsl(200,100%,37%)] text-white flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform" title="Search">🔍</button>
        <button onClick={() => setActiveModal('voice')} className="w-11 h-11 rounded-full bg-[hsl(220,15%,15%)] border border-[hsl(220,15%,22%)] text-[hsl(220,10%,60%)] flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform" title="Voice Reference">🎤</button>
      </div>

      {/* ── Modals ── */}
      <UploadModal open={activeModal === 'upload'} onClose={() => setActiveModal(null)} onToast={addToast} />
      <ExportModal open={activeModal === 'export'} onClose={() => setActiveModal(null)} onToast={addToast} />
      <SearchModal open={activeModal === 'search'} onClose={() => setActiveModal(null)} />
      <VoiceModal open={activeModal === 'voice'} onClose={() => setActiveModal(null)} />

      {/* ── Toasts ── */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[300] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2.5 rounded-xl bg-[hsl(220,18%,12%)] border border-[hsl(220,15%,22%)] text-[12px] shadow-2xl backdrop-blur-md animate-fade-up flex items-center gap-2">
            <span>{t.icon}</span><span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
