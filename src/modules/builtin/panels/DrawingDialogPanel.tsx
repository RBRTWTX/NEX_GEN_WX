export function DrawingDialogPanel() {
  return (
    <div className="draw-tool-grid">
      {['Select', 'Line', 'Arrow', 'Box', 'Circle', 'Cold Front', 'Warm Front', 'Stationary', 'Text', 'Weather Icon', 'Delete', 'Clear'].map((tool) => <button type="button" key={tool}>{tool}</button>)}
      <p className="settings-note">This compact R3 palette is registered by the drawing module. Canvas editing remains a later implementation phase.</p>
    </div>
  );
}
