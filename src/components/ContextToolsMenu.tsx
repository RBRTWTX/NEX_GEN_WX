import type { MapScene } from '../types/domain';
import type { ModuleCommand, ModuleToolContribution } from '../types/module';
import { ModelPlaybackTouchControls } from '../models/ModelPlaybackTouchControls';

export function ContextToolsMenu({
  scene,
  open,
  tools,
  onInvoke,
  onModuleStateChange,
  onClose,
}: {
  scene: MapScene;
  open: boolean;
  tools: ModuleToolContribution[];
  onInvoke: (command: ModuleCommand) => void;
  onModuleStateChange?: (moduleId: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className={`hidden-map-menu open ${scene.category === 'Models' ? 'has-model-playback' : ''}`.trim()}
      role="dialog"
      aria-label="Context-sensitive scene tools"
    >
      <div className="quick-menu-row compact-controls">
        {scene.category === 'Models' && (
          <ModelPlaybackTouchControls
            scene={scene}
            onModuleStateChange={onModuleStateChange}
          />
        )}
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
