import { useEffect, useState, type CSSProperties } from 'react';
import type { HeaderState, MapScene } from '../types/domain';
import { EditableSceneText } from '../scene-editing/EditableSceneText';
import { SceneObject } from '../scene-editing/SceneObject';
import { productLegendForScene } from '../legends/product-legend';

interface BroadcastHeaderProps {
  scene: MapScene;
  studioName?: string;
  logoDataUrl?: string | null;
  interactive: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onHeaderChange?: <K extends keyof HeaderState>(key: K, value: HeaderState[K]) => void;
}

function formatHeaderClock(date: Date): string {
  return date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    .replace(' ', '\u00a0');
}

function legendClass(kind: HeaderState['legend']['kind']): string {
  return `legend-ramp legend-${kind}`;
}

export function BroadcastHeader({
  scene,
  studioName = 'NEX GEN WX',
  logoDataUrl,
  interactive,
  menuOpen = false,
  onToggleMenu,
  onHeaderChange,
}: BroadcastHeaderProps) {
  const [clock, setClock] = useState(() => formatHeaderClock(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatHeaderClock(new Date())), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!scene.header.visible) return null;
  const words = studioName.trim().split(/\s+/);
  const firstLine = words.slice(0, Math.max(1, words.length - 1)).join(' ');
  const finalWord = words.at(-1) ?? 'WX';
  const legend = scene.header.legend;
  const productLegend = productLegendForScene(scene);
  const showLegend = legend.visible && legend.kind !== 'none' && productLegend?.mode !== 'none';

  return (
    <SceneObject
      as="header"
      elementId="map.header"
      label="Broadcast header"
      kind="container"
      className={`broadcast-header ${interactive ? 'is-interactive' : ''} ${logoDataUrl ? 'has-custom-logo' : ''}`.trim()}
      style={{
        '--scene-header-opacity': scene.header.opacity,
        '--scene-header-scale': scene.header.scale,
      } as CSSProperties}
    >
      <SceneObject
        as="button"
        elementId="map.header.logo"
        label="Header logo"
        kind="logo"
        type="button"
        className={`header-logo header-menu-trigger ${menuOpen ? 'is-open' : ''}`}
        title={interactive ? 'Open context-sensitive map controls' : undefined}
        aria-label="Open context-sensitive map controls"
        onClick={interactive ? onToggleMenu : undefined}
        tabIndex={interactive ? 0 : -1}
      >
        {logoDataUrl ? (
          <img src={logoDataUrl} className="header-logo-image" alt="Studio logo" />
        ) : (
          <span className="header-logo-fallback" aria-label={studioName}>
            <small>{firstLine}</small>
            <strong>{finalWord}</strong>
          </span>
        )}
        {interactive && <span className="header-menu-glyph" aria-hidden="true">•••</span>}
      </SceneObject>

      <SceneObject elementId="map.header.copy" label="Header copy block" kind="container" className="header-copy">
        <div className="header-title-row">
          <EditableSceneText
            as="h1"
            elementId="map.header.title"
            label="Map header title"
            value={scene.header.title}
            onChange={(value) => onHeaderChange?.('title', value || scene.header.title)}
          />
          <EditableSceneText
            as="span"
            className="header-valid"
            elementId="map.header.valid"
            label="Map valid-time label"
            value={scene.header.validLabel}
            onChange={(value) => onHeaderChange?.('validLabel', value || scene.header.validLabel)}
          />
        </div>
        <div className="header-lower-row">
          <SceneObject
            as="strong"
            className="header-time"
            elementId="map.header.clock"
            label="Map header clock"
            kind="text"
            title="Live clock wording is data-driven; appearance and position are editable"
          >
            {clock}
          </SceneObject>
          <EditableSceneText
            as="span"
            className="header-subtitle"
            elementId="map.header.subtitle"
            label="Map header subtitle"
            value={scene.header.subtitle}
            onChange={(value) => onHeaderChange?.('subtitle', value || scene.header.subtitle)}
          />
          {showLegend && (
            <SceneObject
              elementId="map.header.legend"
              label="Header color legend"
              kind="legend"
              className="header-legend"
              aria-label={productLegend?.mode === 'discrete' ? productLegend.title : 'Product color key'}
            >
              {productLegend?.mode === 'discrete' ? (
                <span className="header-product-legend" title={productLegend.title}>
                  {productLegend.segments.map((segment) => (
                    <span
                      key={productLegend.id + ':' + segment.label}
                      className="header-product-legend__segment"
                      style={{ backgroundColor: segment.color }}
                    >
                      <small>{segment.label}</small>
                    </span>
                  ))}
                </span>
              ) : (
                <>
                  <EditableSceneText
                    as="span"
                    elementId="map.legend.low"
                    label="Legend low label"
                    value={legend.lowLabel}
                    onChange={(value) => onHeaderChange?.('legend', { ...legend, lowLabel: value || legend.lowLabel })}
                  />
                  <SceneObject as="i" elementId="map.legend.ramp" label="Legend color ramp" kind="legend" className={legendClass(legend.kind)} />
                  <EditableSceneText
                    as="span"
                    elementId="map.legend.high"
                    label="Legend high label"
                    value={legend.highLabel}
                    onChange={(value) => onHeaderChange?.('legend', { ...legend, highLabel: value || legend.highLabel })}
                  />
                </>
              )}
            </SceneObject>
          )}
        </div>
      </SceneObject>
    </SceneObject>
  );
}
