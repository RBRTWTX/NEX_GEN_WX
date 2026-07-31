import type { MapScene } from '../types/domain';
import type { ModuleCommand, ModuleToolContribution } from '../types/module';

export function ContextToolsMenu({
  scene,
  open,
  tools,
  onInvoke,
  onClose,
}: {
  scene: MapScene;
  open: boolean;
  tools: ModuleToolContribution[];
  onInvoke: (command: ModuleCommand) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="hidden-map-menu open" role="dialog" aria-label="Context-sensitive scene tools">
      <div className="quick-menu-row compact-controls">
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.id}
            title={tool.label}
            disabled={tool.command.kind === 'clear-samples' && scene.samples.length === 0}
            onClick={() => onInvoke(tool.command)}
          >{tool.label}</button>
        ))}
        <button type="button" title="Close controls" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
