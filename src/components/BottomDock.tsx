import type { ModuleCommand, ModuleToolContribution } from '../types/module';
import type { MapScene, StudioScene } from '../types/domain';

interface BottomDockProps {
  scene: StudioScene;
  statusMessage: string;
  layerTools: ModuleToolContribution[];
  moduleTools: ModuleToolContribution[];
  onInvoke: (command: ModuleCommand) => void;
  onProductOpacityChange: (value: number) => void;
  onSmoothingChange: (enabled: boolean) => void;
  onSave: () => void;
  onExportProject: () => void;
  onExportPng: () => void;
  onExportShow: () => void;
  exportShowDisabled: boolean;
}

function isToolActive(scene: MapScene, tool: ModuleToolContribution): boolean {
  return tool.command.kind === 'toggle-overlay' && scene.overlays[tool.command.overlay];
}

export function BottomDock(props: BottomDockProps) {
  const mapScene = props.scene.kind === 'map' ? props.scene : null;
  return (
    <footer className="bottom-dock">
      <div className="dock-group">
        <span className="dock-label">LAYERS</span>
        {mapScene ? props.layerTools.map((tool) => (
          <button
            type="button"
            key={tool.id}
            className={`dock-button ${isToolActive(mapScene, tool) ? 'active' : ''}`}
            onClick={() => props.onInvoke(tool.command)}
          >{tool.label}</button>
        )) : <span className="dock-status">Graphic scene</span>}
      </div>

      <div className="dock-divider" />

      <div className="dock-group">
        <span className="dock-label">TOOLS</span>
        {props.moduleTools.map((tool) => (
          <button type="button" className="dock-button" key={tool.id} onClick={() => props.onInvoke(tool.command)}>
            {tool.label}
          </button>
        ))}
      </div>

      <div className="dock-divider" />

      {mapScene && (
        <div className="dock-group dock-weather-controls">
          <label className="inline-control">
            <span>Weather opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(mapScene.product.opacity * 100)}
              onChange={(event) => props.onProductOpacityChange(Number(event.currentTarget.value) / 100)}
            />
            <output>{Math.round(mapScene.product.opacity * 100)}%</output>
          </label>
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={mapScene.product.smoothing === 'smooth'}
              onChange={(event) => props.onSmoothingChange(event.currentTarget.checked)}
            />
            <span>Smoothing</span>
          </label>
        </div>
      )}

      <div className="dock-group grow" title={props.statusMessage}>
        <span className="dock-status">{props.statusMessage}</span>
      </div>

      <div className="dock-group dock-right">
        <button type="button" className="dock-button" onClick={props.onSave}>Save</button>
        <button type="button" className="dock-button" onClick={props.onExportProject}>Export</button>
        <button type="button" className="dock-button" disabled={props.exportShowDisabled} onClick={props.onExportShow}>PNG Show</button>
        <button type="button" className="dock-button accent" onClick={props.onExportPng}>PNG</button>
      </div>
    </footer>
  );
}
