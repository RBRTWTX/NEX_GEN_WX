import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { LayerVisibility, StudioScene } from '../types/domain';
import { LayerStack } from './LayerStack';

interface SceneLibraryProps {
  scenes: StudioScene[];
  selectedSceneId: string;
  selectedScene: StudioScene;
  thumbnails: Record<string, string>;
  onSelect: (sceneId: string) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
  onAddGraphic: () => void;
  onSaveScene: () => void;
  onClearWeather: () => void;
  onOverlayChange: (key: keyof LayerVisibility, value: boolean) => void;
}

const FILTERS = ['All', 'Home', 'National', 'Severe', 'Rainfall', 'Forecast', 'Climate', 'Winter', 'Observations', 'Tropical', 'Models', 'Graphics'] as const;
type SceneFilter = typeof FILTERS[number];

function matchesFilter(scene: StudioScene, filter: SceneFilter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Graphics') return scene.kind === 'graphic';
  if (scene.category === filter) return true;
  return scene.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase());
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

export function SceneLibrary(props: SceneLibraryProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SceneFilter>('All');
  const filteredScenes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return props.scenes.filter((scene) => {
      if (!matchesFilter(scene, filter)) return false;
      if (!normalized) return true;
      const search = [scene.name, scene.category, ...scene.tags];
      if (scene.kind === 'map') search.push(scene.product.id, scene.product.category, ...scene.activeModuleIds);
      else search.push(scene.templateId, ...scene.activeModuleIds);
      return search.join(' ').toLowerCase().includes(normalized);
    });
  }, [filter, props.scenes, query]);

  return (
    <aside className="left-panel" aria-label="Scene library">
      <section className="panel-section scenes-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h2>Scenes</h2>
          </div>
          <div className="panel-heading-actions">
            <button type="button" className="small-button" onClick={props.onAddGraphic}>+ Add Graphic</button>
            <button type="button" className="small-button accent" onClick={props.onSaveScene}>+ Save Scene</button>
          </div>
        </div>
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search scenes…"
          aria-label="Search scenes"
        />
        <div className="scene-filter-row" aria-label="Scene filters">
          {FILTERS.map((item) => (
            <button
              type="button"
              className={`chip ${filter === item ? 'active' : ''}`}
              key={item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="scene-grid" aria-live="polite">
          {filteredScenes.map((scene) => {
            const selected = scene.id === props.selectedSceneId;
            return (
              <article
                className={`scene-card ${selected ? 'active' : ''}`}
                key={scene.id}
                role="button"
                tabIndex={0}
                onClick={() => props.onSelect(scene.id)}
                onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    props.onSelect(scene.id);
                  }
                }}
              >
                <div className={`scene-thumbnail ${thumbnailClass(scene)} ${props.thumbnails[scene.id] ? 'has-live-thumbnail' : ''}`}>
                  {props.thumbnails[scene.id] ? (
                    <img src={props.thumbnails[scene.id]} alt="" draggable={false} />
                  ) : (
                    <>
                      <div className="scene-thumb-header"><span>NEX GEN</span><strong>{scene.kind === 'map' ? scene.header.title : scene.name}</strong></div>
                      <div className="scene-thumb-canvas" />
                    </>
                  )}
                  <span className="scene-thumbnail-state">{props.thumbnails[scene.id] ? 'LIVE' : 'PREVIEW'}</span>
                </div>
                <footer className="scene-card-footer">
                  <strong>{scene.name}</strong>
                  <small>{scene.category}</small>
                </footer>
                <div className="scene-actions">
                  <button
                    type="button"
                    title="Duplicate scene"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      props.onDuplicate(scene.id);
                    }}
                  >⧉</button>
                  <button
                    type="button"
                    title="Delete scene"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      props.onDelete(scene.id);
                    }}
                  >×</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel-section current-stack-section">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">ACTIVE</span>
            <h2>Layer Stack</h2>
          </div>
          <button type="button" className="small-button" onClick={props.onClearWeather}>Clear Weather</button>
        </div>
        <LayerStack scene={props.selectedScene} onOverlayChange={props.onOverlayChange} onClearProduct={props.onClearWeather} />
      </section>
    </aside>
  );
}
