import type { LayerVisibility, StudioScene } from '../types/domain';
import { modelLayerStackLabel } from '../models/model-display-metadata';

interface LayerStackProps {
  scene: StudioScene;
  onOverlayChange: (key: keyof LayerVisibility, value: boolean) => void;
  onClearProduct?: () => void;
}

const LABELS: Record<keyof LayerVisibility, string> = {
  states: 'States',
  counties: 'Counties',
  roads: 'Roads',
  cities: 'Cities',
  alerts: 'NWS Alerts',
  observations: 'Surface Observations',
  radarSites: 'Radar Sites',
  stormReports: 'Storm Reports',
};

export function LayerStack({ scene, onOverlayChange, onClearProduct }: LayerStackProps) {
  if (scene.kind === 'graphic') {
    return (
      <div className="layer-stack">
        <div className="layer-stack-item is-locked">
          <span className="drag">⠿</span>
          <span>{scene.name}</span>
          <span className="layer-state">●</span>
        </div>
        <div className="layer-stack-item is-locked">
          <span className="drag">⠿</span>
          <span>Graphic Template · {scene.templateId.replace(/-/g, ' ')}</span>
          <span className="layer-state">○</span>
        </div>
      </div>
    );
  }

  const productLabel = scene.category === 'Models'
    ? modelLayerStackLabel(scene)
    : scene.product.id.replace(/-/g, ' ');

  const rows: Array<{ id: string; label: string; overlay?: keyof LayerVisibility; removable?: boolean }> = [
    { id: 'states', label: 'States', overlay: 'states' },
    { id: 'counties', label: 'Counties', overlay: 'counties' },
    { id: 'product', label: productLabel, removable: true },
    ...scene.activeModuleIds
      .filter((id) => !['map', 'cities', 'roads', 'boundaries', 'alerts', 'observations'].includes(id))
      .map((id) => ({ id: `module-${id}`, label: id.replace(/-/g, ' ') })),
    { id: 'cities', label: 'Cities', overlay: 'cities' },
    { id: 'roads', label: 'Roads', overlay: 'roads' },
    { id: 'alerts', label: LABELS.alerts, overlay: 'alerts' },
    { id: 'observations', label: LABELS.observations, overlay: 'observations' },
  ];

  const unique = rows.filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index);

  return (
    <div className="layer-stack">
      {unique.map((row) => {
        const visible = row.overlay ? scene.overlays[row.overlay] : true;
        return (
          <div className={`layer-stack-item ${visible ? '' : 'is-off'}`} key={row.id}>
            <span className="drag" aria-hidden="true">⠿</span>
            <button
              type="button"
              className="layer-name"
              disabled={!row.overlay}
              onClick={() => row.overlay && onOverlayChange(row.overlay, !visible)}
              title={row.overlay ? `Toggle ${row.label}` : row.label}
            >
              {row.label}
            </button>
            {row.removable ? <button type="button" className="layer-remove" title="Clear active weather product" onClick={onClearProduct}>×</button> : (
              <button
                type="button"
                className="layer-state"
                disabled={!row.overlay}
                onClick={() => row.overlay && onOverlayChange(row.overlay, !visible)}
                aria-label={visible ? `Hide ${row.label}` : `Show ${row.label}`}
              >{visible ? '●' : '○'}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
