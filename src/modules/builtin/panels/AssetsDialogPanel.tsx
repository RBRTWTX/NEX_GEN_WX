export function AssetsDialogPanel() {
  return (
    <div className="asset-toolbox">
      {['T Text', 'H High Pressure', 'L Low Pressure', '☀ Sun', '☁ Cloud', '⚡ Storm', 'Upload PNG'].map((tool) => <button type="button" key={tool}>{tool}</button>)}
      <p className="settings-note">Assets will remain movable and removable on the broadcast canvas.</p>
    </div>
  );
}
