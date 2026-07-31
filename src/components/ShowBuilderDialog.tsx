import { useEffect, useMemo, useState } from 'react';
import type { StudioScene, StudioShow, TransitionKind } from '../types/domain';

interface ShowBuilderDialogProps {
  scenes: StudioScene[];
  shows: StudioShow[];
  selectedShowId: string | null;
  activeSceneId: string;
  playing: boolean;
  playbackShowId: string | null;
  playbackIndex: number;
  onSelectShow: (showId: string) => void;
  onCreateShow: (name: string) => void;
  onDeleteShow: (showId: string) => void;
  onUpdateShow: (showId: string, update: Partial<Omit<StudioShow, 'id' | 'sceneIds'>>) => void;
  onAddScene: (showId: string, sceneId: string) => void;
  onRemoveScene: (showId: string, sceneId: string, index: number) => void;
  onMoveScene: (showId: string, index: number, direction: -1 | 1) => void;
  onClearShow: (showId: string) => void;
  onSelectScene: (sceneId: string) => void;
  onSetTransition: (sceneId: string, transition: TransitionKind, durationMs: number) => void;
  onSetHoldSeconds: (sceneId: string, holdSeconds: number) => void;
  onSetAdvance: (sceneId: string, advance: 'manual' | 'automatic') => void;
  onDuplicateScene: (sceneId: string) => void;
  onStartShow: (show: StudioShow) => void;
  onAdvanceShow: (direction: -1 | 1) => void;
  onStopShow: () => void;
  onClose: () => void;
}

function thumbnailClass(scene: StudioScene): string {
  if (scene.kind === 'graphic') return `graphic graphic-${scene.templateId}`;
  const category = scene.product.category.toLowerCase();
  if (scene.activeModuleIds.includes('tropical')) return 'tropical';
  if (category.includes('temperature')) return 'temperature';
  if (category.includes('satellite')) return 'satellite';
  if (category.includes('rain')) return 'rainfall';
  if (category.includes('outlook')) return 'outlooks';
  return 'radar';
}

export function ShowBuilderDialog(props: ShowBuilderDialogProps) {
  const selectedShow = props.shows.find((show) => show.id === props.selectedShowId) ?? props.shows[0] ?? null;
  const sceneMap = useMemo(() => new Map(props.scenes.map((scene) => [scene.id, scene])), [props.scenes]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!selectedShow?.sceneIds.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) => Math.min(current, selectedShow.sceneIds.length - 1));
  }, [selectedShow]);

  const selectedSceneId = selectedShow?.sceneIds[selectedIndex] ?? null;
  const selectedScene = selectedSceneId ? sceneMap.get(selectedSceneId) ?? null : null;
  const isOnAirShow = props.playing && props.playbackShowId === selectedShow?.id;

  function createShow(): void {
    const number = props.shows.length + 1;
    props.onCreateShow(`Weather Show ${number}`);
  }

  function playLoop(): void {
    if (!selectedShow) return;
    props.onUpdateShow(selectedShow.id, { loop: true });
    props.onStartShow({ ...selectedShow, loop: true });
  }

  return (
    <section className={`scene-rundown-panel ${minimized ? 'minimized' : ''}`} aria-label="Scene Builder">
      <header className="rundown-header">
        <div className="rundown-title">
          <span className="eyebrow">PLAYOUT</span>
          <strong>Scene Builder</strong>
          <span>{selectedScene?.name ?? 'Select a slide'}</span>
        </div>

        <div className="rundown-show-controls">
          <select
            aria-label="Active show"
            value={selectedShow?.id ?? ''}
            onChange={(event) => props.onSelectShow(event.currentTarget.value)}
            disabled={!props.shows.length}
          >
            {props.shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
          </select>
          <button type="button" title="Create show" onClick={createShow}>+</button>
          <button type="button" title="Delete show" disabled={!selectedShow} onClick={() => selectedShow && props.onDeleteShow(selectedShow.id)}>×</button>
          {selectedShow && (
            <label>Default
              <input
                type="number"
                min={1}
                max={600}
                value={selectedShow.defaultHoldSeconds}
                onChange={(event) => props.onUpdateShow(selectedShow.id, { defaultHoldSeconds: Number(event.currentTarget.value) || 15 })}
              />s
            </label>
          )}
        </div>

        <div className="rundown-header-actions">
          <button type="button" disabled={!selectedShow} onClick={() => selectedShow && props.onAddScene(selectedShow.id, props.activeSceneId)}>+ Active Scene</button>
          <button type="button" onClick={() => setLibraryOpen((value) => !value)}>Scene Library</button>
          <button type="button" disabled={!selectedShow?.sceneIds.length} onClick={() => selectedShow && props.onClearShow(selectedShow.id)}>Clear</button>
          <button type="button" title={minimized ? 'Expand scene builder' : 'Minimize scene builder'} onClick={() => setMinimized((value) => !value)}>{minimized ? '▴' : '▾'}</button>
          <button type="button" title="Close scene builder" onClick={props.onClose}>×</button>
        </div>
      </header>

      <div className="rundown-body">
        <div className="rundown-strip-wrap">
          {libraryOpen && selectedShow && (
            <div className="rundown-library-popover">
              <header><strong>Scene Library</strong><button type="button" onClick={() => setLibraryOpen(false)}>Done</button></header>
              <div>
                {props.scenes.map((scene) => (
                  <button type="button" key={scene.id} onClick={() => props.onAddScene(selectedShow.id, scene.id)}>
                    <span>{scene.kind === 'map' ? 'MAP' : 'GFX'}</span>
                    <strong>{scene.name}</strong>
                    <small>{scene.category}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedShow?.sceneIds.length && <div className="rundown-empty">Add saved scenes from the library or add the active scene.</div>}
          <div className="rundown-strip">
            {selectedShow?.sceneIds.map((sceneId, index) => {
              const scene = sceneMap.get(sceneId);
              if (!scene) return null;
              const onAir = isOnAirShow && props.playbackIndex === index;
              return (
                <article
                  className={`rundown-card ${selectedIndex === index ? 'selected' : ''} ${onAir ? 'on-air' : ''}`}
                  key={`${sceneId}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedIndex(index);
                    props.onSelectScene(sceneId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedIndex(index);
                      props.onSelectScene(sceneId);
                    }
                  }}
                >
                  <div className={`rundown-card-thumb scene-thumbnail ${thumbnailClass(scene)}`}>
                    <span className="rundown-number">{String(index + 1).padStart(2, '0')}</span>
                    <div className="scene-thumb-header"><span>NEX GEN</span><strong>{scene.kind === 'map' ? scene.header.title : scene.name}</strong></div>
                    <div className="scene-thumb-canvas" />
                    <span className="rundown-transition">{scene.transition.type.toUpperCase()}</span>
                  </div>
                  <div className="rundown-card-copy">
                    <strong>{scene.name}</strong>
                    <small>{scene.advance === 'automatic' ? `${scene.holdSeconds}s automatic` : `${scene.holdSeconds}s manual`}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rundown-settings">
          <label>Transition
            <select
              value={selectedScene?.transition.type ?? 'fly'}
              disabled={!selectedScene}
              onChange={(event) => selectedScene && props.onSetTransition(selectedScene.id, event.currentTarget.value as TransitionKind, selectedScene.transition.durationMs)}
            >
              <option value="fly">Fly</option><option value="ease">Ease</option><option value="dissolve">Dissolve</option><option value="cut">Cut</option>
            </select>
          </label>
          <label>Duration
            <input
              type="range"
              min={0}
              max={8000}
              step={100}
              disabled={!selectedScene}
              value={selectedScene?.transition.durationMs ?? 1800}
              onChange={(event) => selectedScene && props.onSetTransition(selectedScene.id, selectedScene.transition.type, Number(event.currentTarget.value))}
            />
            <output>{((selectedScene?.transition.durationMs ?? 1800) / 1000).toFixed(1)} s</output>
          </label>
          <label>Hold
            <input
              type="number"
              min={1}
              max={600}
              disabled={!selectedScene}
              value={selectedScene?.holdSeconds ?? 10}
              onChange={(event) => selectedScene && props.onSetHoldSeconds(selectedScene.id, Number(event.currentTarget.value) || 1)}
            />
          </label>
          <label>Advance
            <select
              disabled={!selectedScene}
              value={selectedScene?.advance ?? 'manual'}
              onChange={(event) => selectedScene && props.onSetAdvance(selectedScene.id, event.currentTarget.value as 'manual' | 'automatic')}
            >
              <option value="manual">Manual</option><option value="automatic">Automatic</option>
            </select>
          </label>
          <label className="toggle-control compact-toggle"><input type="checkbox" checked readOnly /><span>Camera animation</span></label>
          <div className="rundown-edit-actions">
            <button type="button" disabled={!selectedScene}>Update Scene</button>
            <button type="button" disabled={!selectedScene} onClick={() => selectedScene && props.onDuplicateScene(selectedScene.id)}>Duplicate</button>
            <button type="button" disabled={!selectedShow || !selectedSceneId} onClick={() => selectedShow && selectedSceneId && props.onRemoveScene(selectedShow.id, selectedSceneId, selectedIndex)}>Remove</button>
          </div>
          <div className="rundown-edit-actions">
            <button type="button" disabled={!selectedShow || selectedIndex === 0} onClick={() => selectedShow && props.onMoveScene(selectedShow.id, selectedIndex, -1)}>Move Left</button>
            <button type="button" disabled={!selectedShow || selectedIndex >= (selectedShow?.sceneIds.length ?? 1) - 1} onClick={() => selectedShow && props.onMoveScene(selectedShow.id, selectedIndex, 1)}>Move Right</button>
          </div>
        </aside>
      </div>

      <footer className="rundown-transport">
        <button type="button" disabled={!selectedShow?.sceneIds.length} onClick={() => { setSelectedIndex(0); if (selectedShow?.sceneIds[0]) props.onSelectScene(selectedShow.sceneIds[0]); }}>|◀</button>
        <button type="button" disabled={!selectedShow?.sceneIds.length} onClick={() => props.onAdvanceShow(-1)}>◀</button>
        <button type="button" className="accent-button" disabled={!selectedShow?.sceneIds.length} onClick={() => selectedShow && props.onStartShow(selectedShow)}>▶ Play</button>
        <button type="button" className="loop-button" disabled={!selectedShow?.sceneIds.length} onClick={playLoop}>↻ 24/7 Loop</button>
        <button type="button" disabled={!selectedShow?.sceneIds.length} onClick={() => props.onAdvanceShow(1)}>▶</button>
        <button type="button" disabled={!props.playing} onClick={props.onStopShow}>■</button>
        {selectedShow && <label className="toggle-control compact-toggle"><input type="checkbox" checked={selectedShow.loop} onChange={(event) => props.onUpdateShow(selectedShow.id, { loop: event.currentTarget.checked })} /><span>Loop</span></label>}
      </footer>
    </section>
  );
}
