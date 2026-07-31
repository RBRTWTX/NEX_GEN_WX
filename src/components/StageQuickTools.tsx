import type { ModuleCommand, ModuleToolContribution } from '../types/module';

export function StageQuickTools({
  tools,
  onInvoke,
}: {
  tools: ModuleToolContribution[];
  onInvoke: (command: ModuleCommand) => void;
}) {
  return (
    <div className="map-corner-controls" aria-label="Quick scene tools">
      {tools.map((tool) => (
        <button type="button" key={tool.id} className="floating-button" onClick={() => onInvoke(tool.command)}>
          {tool.label}
        </button>
      ))}
    </div>
  );
}
