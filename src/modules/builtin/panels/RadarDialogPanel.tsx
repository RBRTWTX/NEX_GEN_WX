import type { ModuleDialogPanelProps } from '../../../types/module';

export function RadarDialogPanel({ scene }: ModuleDialogPanelProps) {
  if (scene.kind !== 'map') return <p className="settings-note">Radar controls are available on map scenes.</p>;
  return (
    <div className="tool-panel-grid">
      <section><h3>Radar Product</h3><label>Mode<select defaultValue="reflectivity"><option value="reflectivity">Reflectivity</option><option value="velocity">Velocity</option><option value="rainfall">Rainfall</option></select></label><label>Site<select defaultValue="auto"><option value="auto">Automatic best site</option><option value="kewx">KEWX</option><option value="kgrk">KGRK</option><option value="kdfx">KDFX</option></select></label></section>
      <section><h3>Playback</h3><label className="setting-check"><input type="checkbox" disabled /><span>Animate sweep</span></label><label className="setting-check"><input type="checkbox" disabled /><span>Multi-site blend</span></label><p className="settings-note">The R3 control placement is preserved. Live radar rendering remains assigned to the radar data module.</p></section>
      <section className="tool-status-card"><span>ACTIVE SCENE</span><strong>{scene.product.id.replace(/-/g, ' ')}</strong><small>Opacity {Math.round(scene.product.opacity * 100)}%</small></section>
    </div>
  );
}
