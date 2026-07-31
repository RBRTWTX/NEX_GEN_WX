import type { ModuleDialogPanelProps } from '../../../types/module';

export function ColorTablesDialogPanel({ scene }: ModuleDialogPanelProps) {
  return (
    <div className="color-table-panel">
      <label>Product<select defaultValue={scene.kind === 'map' ? scene.product.id : 'graphic'}><option>{scene.kind === 'map' ? scene.product.id : 'Graphic scene'}</option></select></label>
      <label>Table<select defaultValue="broadcast"><option value="broadcast">Broadcast Default</option><option value="blue">Blue MRMS</option><option value="custom">Custom</option></select></label>
      <button type="button" className="accent-button">Use this table as default</button>
      <div className="color-table-preview" />
      <div className="color-stop-row"><span>0</span><i /><i /><i /><i /><span>MAX</span></div>
      <p className="settings-note">Custom color stops will connect through the product-rendering module.</p>
    </div>
  );
}
