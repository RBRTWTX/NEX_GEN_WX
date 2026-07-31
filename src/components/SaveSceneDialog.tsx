import { useState } from 'react';
import type { SceneCategory, StudioScene, TransitionKind } from '../types/domain';
import { FloatingWindow } from './FloatingWindow';

interface SaveSceneDialogProps {
  scene: StudioScene;
  onSave: (name: string, category: SceneCategory, transition: TransitionKind, durationMs: number, advance: 'manual' | 'automatic', holdSeconds: number) => void;
  onClose: () => void;
}

const CATEGORIES: SceneCategory[] = ['Home', 'National', 'Regional', 'Radar', 'Severe', 'Rainfall', 'Satellite', 'Forecast', 'Climate', 'Winter', 'Observations', 'Tropical', 'Models', 'Graphics', 'Custom'];

export function SaveSceneDialog({ scene, onSave, onClose }: SaveSceneDialogProps) {
  const [name, setName] = useState(`${scene.name} Copy`);
  const [category, setCategory] = useState<SceneCategory>(scene.category);
  const [transition, setTransition] = useState<TransitionKind>(scene.transition.type);
  const [durationMs, setDurationMs] = useState(scene.transition.durationMs);
  const [advance, setAdvance] = useState(scene.advance);
  const [holdSeconds, setHoldSeconds] = useState(scene.holdSeconds);

  return (
    <FloatingWindow title="Save Current Scene" eyebrow="SCENE" className="save-scene-window" onClose={onClose} initialPosition={{ x: 560, y: 190 }}>
      <div className="dialog-form">
        <label>Scene name<input type="text" value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.currentTarget.value as SceneCategory)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Advance<select value={advance} onChange={(event) => setAdvance(event.currentTarget.value as 'manual' | 'automatic')}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></label>
        <label>Hold time<div className="input-with-unit"><input type="number" min={1} max={300} value={holdSeconds} onChange={(event) => setHoldSeconds(Number(event.currentTarget.value) || 1)} /><span>seconds</span></div></label>
        <label>Transition<select value={transition} onChange={(event) => setTransition(event.currentTarget.value as TransitionKind)}><option value="fly">Fly</option><option value="ease">Ease</option><option value="dissolve">Dissolve</option><option value="cut">Cut</option></select></label>
        <label>Transition duration<div className="range-output"><input type="range" min={0} max={6000} step={100} value={durationMs} onChange={(event) => setDurationMs(Number(event.currentTarget.value))} /><output>{(durationMs / 1000).toFixed(1)} s</output></div></label>
        <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button type="button" className="accent-button" onClick={() => onSave(name.trim() || `${scene.name} Copy`, category, transition, durationMs, advance, holdSeconds)}>Save Scene</button></div>
      </div>
    </FloatingWindow>
  );
}
