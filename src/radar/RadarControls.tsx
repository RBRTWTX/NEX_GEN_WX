import '../styles/radar.css';
import { useMemo, useState, type ChangeEvent } from 'react';
import type { HeaderLegendState, MapScene, ProductSelection } from '../types/domain';
import { useRadarRuntime } from './radar-runtime-store';
import {
  isSiteRadarProduct,
  radarProductForScene,
  radarLegendForProduct,
  radarProductLabel,
  radarStateForScene,
  type RadarProductId,
  type RadarSceneState,
} from './radar-types';

interface RadarControlsProps {
  scene: MapScene;
  compact?: boolean;
  onModuleStateChange: (patch: Partial<RadarSceneState>) => void;
  onProductChange: (patch: Partial<ProductSelection>) => void;
  onHeaderLegendChange?: (legend: HeaderLegendState) => void;
}

const SITE_PRODUCTS: Array<{ id: RadarProductId; label: string }> = [
  { id: 'site-base-reflectivity', label: 'Base Reflectivity' },
  { id: 'site-base-velocity', label: 'Base Velocity' },
  { id: 'site-storm-relative-velocity', label: 'Storm-Relative Velocity' },
  { id: 'site-echo-tops', label: 'Echo Tops' },
];

function nextFrameIndex(current: number, count: number, direction: -1 | 1): number {
  if (count <= 0) return 0;
  return (current + direction + count) % count;
}

function currentFrameLabel(validTime: string, fallback: string): string {
  if (!validTime) return fallback;
  const parsed = Date.parse(validTime);
  if (!Number.isFinite(parsed)) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(parsed));
}

export function RadarControls({
  scene,
  compact = false,
  onModuleStateChange,
  onProductChange,
  onHeaderLegendChange,
}: RadarControlsProps) {
  const state = radarStateForScene(scene);
  const product = radarProductForScene(scene);
  const runtime = useRadarRuntime(scene.id);
  const [customSite, setCustomSite] = useState('');
  const frameCount = runtime.frames.length;
  const runtimeFrame = frameCount ? Math.max(0, Math.min(frameCount - 1, runtime.frameIndex)) : 0;
  const siteOptions = useMemo(() => {
    const values = [...runtime.availableSites];
    if (state.selectedSite !== 'auto' && !values.some((site) => site.id === state.selectedSite)) {
      values.unshift({ id: state.selectedSite, label: state.selectedSite, distanceKm: null });
    }
    return values;
  }, [runtime.availableSites, state.selectedSite]);

  const setMode = (mode: 'national' | 'site') => {
    if (mode === 'national') {
      onModuleStateChange({ mode, animationEnabled: false, blendEnabled: false, frameIndex: -1, playbackStartedAt: 0 });
      onProductChange({ category: 'radar', id: 'mrms-base-reflectivity' });
      onHeaderLegendChange?.(radarLegendForProduct('mrms-base-reflectivity'));
      return;
    }
    onModuleStateChange({ mode, animationEnabled: false, frameIndex: -1, playbackStartedAt: 0 });
    onProductChange({ category: 'radar', id: 'site-base-reflectivity' });
    onHeaderLegendChange?.(radarLegendForProduct('site-base-reflectivity'));
  };

  const setProduct = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.currentTarget.value as RadarProductId;
    onModuleStateChange({
      mode: isSiteRadarProduct(id) ? 'site' : 'national',
      animationEnabled: false,
      blendEnabled: id === 'site-base-reflectivity' ? state.blendEnabled : false,
      frameIndex: -1,
      playbackStartedAt: 0,
    });
    onProductChange({ category: 'radar', id });
    onHeaderLegendChange?.(radarLegendForProduct(id));
  };

  const togglePlayback = () => {
    if (state.animationEnabled) {
      onModuleStateChange({ animationEnabled: false, frameIndex: runtimeFrame, playbackStartedAt: 0 });
      return;
    }
    const startAt = frameCount > 1 && runtimeFrame >= frameCount - 1 ? 0 : runtimeFrame;
    onModuleStateChange({ animationEnabled: true, frameIndex: startAt, playbackStartedAt: Date.now() });
  };

  const stepFrame = (direction: -1 | 1) => {
    onModuleStateChange({
      animationEnabled: false,
      frameIndex: nextFrameIndex(runtimeFrame, frameCount, direction),
      playbackStartedAt: 0,
    });
  };

  const applyCustomSite = () => {
    const normalized = customSite.trim().toUpperCase().replace(/^K(?=[A-Z0-9]{3}$)/, '');
    if (!/^[A-Z0-9]{3,4}$/.test(normalized)) return;
    onModuleStateChange({ selectedSite: normalized, mode: 'site', animationEnabled: false, frameIndex: -1, playbackStartedAt: 0 });
    if (!isSiteRadarProduct(product)) {
      onProductChange({ category: 'radar', id: 'site-base-reflectivity' });
      onHeaderLegendChange?.(radarLegendForProduct('site-base-reflectivity'));
    }
    setCustomSite('');
  };

  const summary = currentFrameLabel(
    runtime.validTime,
    runtime.loading ? 'Loading radar…' : runtime.error ? 'Radar unavailable' : 'Awaiting radar frame',
  );

  if (compact && !state.expandedTools) {
    return (
      <div className="radar-toolbar radar-toolbar--compact" data-operator-only="true" aria-label="Radar playback controls">
        <span className={`radar-health-dot ${runtime.error ? 'offline' : runtime.loading ? 'loading' : 'online'}`} />
        <strong>{radarProductLabel(product)}</strong>
        <button type="button" onClick={() => stepFrame(-1)} disabled={frameCount < 2} title="Previous radar frame">◀</button>
        <button type="button" className={state.animationEnabled ? 'active' : ''} onClick={togglePlayback} disabled={frameCount < 2} title={state.animationEnabled ? 'Pause radar loop' : 'Play radar loop'}>
          {state.animationEnabled ? 'Ⅱ' : '▶'}
        </button>
        <button type="button" onClick={() => stepFrame(1)} disabled={frameCount < 2} title="Next radar frame">▶|</button>
        <span className="radar-frame-label">{summary}</span>
        <button type="button" onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })} title="Refresh radar">↻</button>
        <button type="button" onClick={() => onModuleStateChange({ expandedTools: true })} title="Expand radar controls">▴</button>
      </div>
    );
  }

  return (
    <div className={`radar-controls ${compact ? 'radar-toolbar radar-toolbar--expanded' : ''}`} data-operator-only="true">
      <div className="radar-controls__header">
        <div>
          <span className={`radar-health-dot ${runtime.error ? 'offline' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>{radarProductLabel(product)}</strong>
          <small>{runtime.provider || (isSiteRadarProduct(product) ? 'IEM NEXRAD Level III' : 'NOAA MRMS')}</small>
        </div>
        {compact && <button type="button" onClick={() => onModuleStateChange({ expandedTools: false })} title="Collapse radar controls">▾</button>}
      </div>

      <div className="radar-control-grid">
        <label>
          Coverage
          <select value={isSiteRadarProduct(product) ? 'site' : 'national'} onChange={(event) => setMode(event.currentTarget.value as 'national' | 'site')}>
            <option value="national">Nationwide MRMS</option>
            <option value="site">Single-site NEXRAD</option>
          </select>
        </label>

        <label>
          Product
          <select value={product} onChange={setProduct}>
            <option value="mrms-base-reflectivity">National MRMS Reflectivity</option>
            {SITE_PRODUCTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>

        {isSiteRadarProduct(product) && (
          <label>
            Radar site
            <select
              value={state.selectedSite}
              onChange={(event) => onModuleStateChange({ selectedSite: event.currentTarget.value, animationEnabled: false, frameIndex: -1, playbackStartedAt: 0 })}
            >
              <option value="auto">Automatic best site</option>
              {siteOptions.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}{site.distanceKm == null ? '' : ` · ${Math.round(site.distanceKm)} km`}
                </option>
              ))}
            </select>
          </label>
        )}

        {isSiteRadarProduct(product) && (
          <label>
            Enter site ID
            <span className="radar-site-entry">
              <input value={customSite} maxLength={4} placeholder="EWX" onChange={(event) => setCustomSite(event.currentTarget.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') applyCustomSite(); }} />
              <button type="button" onClick={applyCustomSite} disabled={!/^[A-Z0-9]{3,4}$/.test(customSite.trim().replace(/^K(?=[A-Z0-9]{3}$)/, ''))}>Set</button>
            </span>
          </label>
        )}

        <label>
          Frames
          <input type="range" min="4" max="24" step="1" value={state.frameCount} onChange={(event) => onModuleStateChange({ frameCount: Number(event.currentTarget.value), animationEnabled: false, frameIndex: -1, playbackStartedAt: 0 })} />
          <output>{state.frameCount}</output>
        </label>

        <label>
          Loop speed
          <input type="range" min="250" max="3000" step="50" value={state.playbackRateMs} onChange={(event) => onModuleStateChange({ playbackRateMs: Number(event.currentTarget.value), frameIndex: runtimeFrame, playbackStartedAt: state.animationEnabled ? Date.now() : 0 })} />
          <output>{(state.playbackRateMs / 1000).toFixed(2)} sec</output>
        </label>

        <label>
          Opacity
          <input type="range" min="0" max="1" step="0.01" value={scene.product.opacity} onChange={(event) => onProductChange({ opacity: Number(event.currentTarget.value) })} />
          <output>{Math.round(scene.product.opacity * 100)}%</output>
        </label>

        <label>
          Raster resampling
          <select
            value={scene.product.smoothing === 'sharp' ? 'sharp' : 'balanced'}
            onChange={(event) => onProductChange({ smoothing: event.currentTarget.value as ProductSelection['smoothing'] })}
          >
            <option value="sharp">Sharp (nearest)</option>
            <option value="balanced">Smooth (linear)</option>
          </select>
        </label>
      </div>

      <div className="radar-control-checks">
        <label className="setting-check">
          <input type="checkbox" checked={state.autoRefreshEnabled} onChange={(event) => onModuleStateChange({ autoRefreshEnabled: event.currentTarget.checked })} />
          <span>Refresh automatically</span>
        </label>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={state.blendEnabled}
            disabled={product !== 'site-base-reflectivity'}
            onChange={(event) => onModuleStateChange({ blendEnabled: event.currentTarget.checked, animationEnabled: false, frameIndex: -1, playbackStartedAt: 0 })}
          />
          <span>Composite up to three nearby sites</span>
        </label>
      </div>

      <div className="radar-playback-row">
        <button type="button" onClick={() => stepFrame(-1)} disabled={frameCount < 2}>Previous</button>
        <button type="button" className={state.animationEnabled ? 'active' : ''} onClick={togglePlayback} disabled={frameCount < 2}>{state.animationEnabled ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => stepFrame(1)} disabled={frameCount < 2}>Next</button>
        <button type="button" onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}>Refresh now</button>
        <span>{frameCount ? `${runtimeFrame + 1} / ${frameCount}` : '0 / 0'}</span>
      </div>

      <div className={`radar-status ${runtime.error ? 'radar-status--error' : ''}`}>
        <strong>{summary}</strong>
        {runtime.resolvedSites.length > 0 && <small>Sites: {runtime.resolvedSites.join(', ')}</small>}
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}
