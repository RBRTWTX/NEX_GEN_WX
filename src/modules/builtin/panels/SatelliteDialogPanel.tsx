export function SatelliteDialogPanel() {
  return (
    <div className="tool-panel-grid">
      <section><h3>Satellite Product</h3><label>Channel<select defaultValue="enhanced"><option value="visible">Visible</option><option value="enhanced">Enhanced Infrared</option><option value="water-vapor">Water Vapor</option><option value="geocolor">GeoColor</option></select></label></section>
      <section><h3>Overlay</h3><label className="setting-check"><input type="checkbox" disabled /><span>Independent overlay</span></label><label className="setting-check"><input type="checkbox" disabled /><span>Loop latest frames</span></label><p className="settings-note">Satellite remains independent of the selected map scene when the data module is connected.</p></section>
    </div>
  );
}
