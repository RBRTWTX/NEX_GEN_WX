import { useMemo, useState } from 'react';
import legacyGraphics from '../../reference/legacy-r3/default-graphics.json';
import { FloatingWindow } from './FloatingWindow';

interface GraphicTemplate {
  id: string;
  name: string;
  graphic: {
    templateId: string;
    settings?: Record<string, unknown>;
  };
}

interface GraphicSceneBuilderProps {
  onCreate: (templateId: string, name: string, settings?: Record<string, unknown>) => void;
  onClose: () => void;
}

export function GraphicSceneBuilder({ onCreate, onClose }: GraphicSceneBuilderProps) {
  const [query, setQuery] = useState('');
  const templates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = legacyGraphics as GraphicTemplate[];
    return normalized ? list.filter((item) => `${item.name} ${item.graphic.templateId}`.toLowerCase().includes(normalized)) : list;
  }, [query]);

  return (
    <FloatingWindow title="Add Graphic Scene" eyebrow="GRAPHICS" className="graphic-builder-window" onClose={onClose} initialPosition={{ x: 520, y: 180 }}>
      <div className="graphic-builder-toolbar">
        <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search graphic templates…" />
        <span>Choose a template. It will be added to the scene library and can be edited from Settings.</span>
      </div>
      <div className="graphic-template-grid">
        {templates.map((template) => (
          <button
            type="button"
            key={template.id}
            className={`graphic-template-card graphic-${template.graphic.templateId}`}
            onClick={() => onCreate(template.graphic.templateId, template.name, template.graphic.settings)}
          >
            <span className="graphic-template-preview">
              <small>WEATHER FORECAST</small>
              <strong>{template.name}</strong>
            </span>
            <b>{template.name}</b>
          </button>
        ))}
      </div>
    </FloatingWindow>
  );
}
