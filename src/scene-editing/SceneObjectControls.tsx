import type { SceneElementStyle, SceneElementTransform } from '../types/domain';
import { normalizedTransform } from './scene-object-style';

function numeric(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function ColorControl({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string;
  value?: string;
  fallback: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}) {
  return (
    <label>
      {label}
      <span className="scene-style-color-control">
        <input type="color" value={value ?? fallback} onChange={(event) => onChange(event.currentTarget.value)} />
        {onClear && <button type="button" onClick={onClear}>Clear</button>}
      </span>
    </label>
  );
}

export function SceneObjectTransformControls({
  value,
  onChange,
}: {
  value: SceneElementTransform;
  onChange: (patch: Partial<SceneElementTransform>) => void;
}) {
  const transform = normalizedTransform(value);
  return (
    <fieldset className="scene-object-fieldset">
      <legend>Position and layer</legend>
      <div className="scene-object-number-grid">
        <label>X offset (%)<input type="number" step="0.1" value={transform.xPercent} onChange={(event) => onChange({ xPercent: Number(event.currentTarget.value) })} /></label>
        <label>Y offset (%)<input type="number" step="0.1" value={transform.yPercent} onChange={(event) => onChange({ yPercent: Number(event.currentTarget.value) })} /></label>
        <label>Width scale<input type="number" min="0.05" max="12" step="0.05" value={transform.scaleX} onChange={(event) => onChange({ scaleX: Number(event.currentTarget.value) })} /></label>
        <label>Height scale<input type="number" min="0.05" max="12" step="0.05" value={transform.scaleY} onChange={(event) => onChange({ scaleY: Number(event.currentTarget.value) })} /></label>
        <label>Rotation<input type="number" step="1" value={Math.round(transform.rotationDeg * 10) / 10} onChange={(event) => onChange({ rotationDeg: Number(event.currentTarget.value) })} /></label>
        <label>Layer<input type="number" step="1" value={transform.zIndex} onChange={(event) => onChange({ zIndex: Number(event.currentTarget.value) })} /></label>
      </div>
      <div className="scene-object-layer-actions">
        <button type="button" onClick={() => onChange({ zIndex: transform.zIndex - 1 })}>Send back</button>
        <button type="button" onClick={() => onChange({ zIndex: transform.zIndex + 1 })}>Bring forward</button>
      </div>
      <label className="setting-check"><input type="checkbox" checked={transform.locked} onChange={(event) => onChange({ locked: event.currentTarget.checked })} />Lock position and size</label>
      <label className="setting-check"><input type="checkbox" checked={transform.hidden} onChange={(event) => onChange({ hidden: event.currentTarget.checked })} />Hide in clean output and PNG</label>
    </fieldset>
  );
}

export function SceneObjectAppearanceControls({
  value,
  isText,
  onChange,
}: {
  value: SceneElementStyle;
  isText: boolean;
  onChange: (patch: Partial<SceneElementStyle>) => void;
}) {
  const gradientEnabled = Boolean(value.gradientStartColor && value.gradientEndColor);
  return (
    <fieldset className="scene-object-fieldset">
      <legend>Appearance</legend>
      <div className="scene-style-color-grid">
        {isText && <ColorControl label="Text color" value={value.color} fallback="#ffffff" onChange={(color) => onChange({ color })} onClear={() => onChange({ color: undefined })} />}
        <ColorControl label="Background" value={value.backgroundColor} fallback="#000000" onChange={(backgroundColor) => onChange({ backgroundColor })} onClear={() => onChange({ backgroundColor: undefined })} />
        <ColorControl label="Border" value={value.borderColor} fallback="#ffffff" onChange={(borderColor) => onChange({ borderColor })} onClear={() => onChange({ borderColor: undefined })} />
      </div>
      <label className="setting-check"><input
        type="checkbox"
        checked={gradientEnabled}
        onChange={(event) => onChange(event.currentTarget.checked
          ? {
            gradientStartColor: value.backgroundColor ?? '#132a44',
            gradientEndColor: '#1f74c8',
            gradientAngleDeg: value.gradientAngleDeg ?? 90,
          }
          : { gradientStartColor: undefined, gradientEndColor: undefined, gradientAngleDeg: undefined })}
      />Use two-color gradient</label>
      {gradientEnabled && (
        <div className="scene-style-gradient-controls">
          <ColorControl label="Gradient start" value={value.gradientStartColor} fallback="#132a44" onChange={(gradientStartColor) => onChange({ gradientStartColor })} />
          <ColorControl label="Gradient end" value={value.gradientEndColor} fallback="#1f74c8" onChange={(gradientEndColor) => onChange({ gradientEndColor })} />
          <label>Angle<input type="number" min="-360" max="360" step="1" value={numeric(value.gradientAngleDeg, 90)} onChange={(event) => onChange({ gradientAngleDeg: Number(event.currentTarget.value) })} /></label>
        </div>
      )}
      <div className="scene-object-number-grid">
        <label>Border width<input type="number" min="0" max="30" step="1" value={numeric(value.borderWidthPx, 0)} onChange={(event) => onChange({ borderWidthPx: Number(event.currentTarget.value) })} /></label>
        <label>Corner radius<input type="number" min="0" max="200" step="1" value={numeric(value.borderRadiusPx, 0)} onChange={(event) => onChange({ borderRadiusPx: Number(event.currentTarget.value) })} /></label>
        <label>Padding<input type="number" min="0" max="80" step="1" value={numeric(value.paddingPx, 0)} onChange={(event) => onChange({ paddingPx: Number(event.currentTarget.value) })} /></label>
      </div>
      <label>Opacity<div className="scene-style-range-row"><input type="range" min="0.05" max="1" step="0.05" value={numeric(value.opacity, 1)} onChange={(event) => onChange({ opacity: Number(event.currentTarget.value) })} /><output>{Math.round(numeric(value.opacity, 1) * 100)}%</output></div></label>
      <label className="setting-check"><input type="checkbox" checked={value.boxShadow !== false} onChange={(event) => onChange({ boxShadow: event.currentTarget.checked })} />Broadcast box shadow</label>
    </fieldset>
  );
}

export function SceneObjectTextControls({ value, onChange }: { value: SceneElementStyle; onChange: (patch: Partial<SceneElementStyle>) => void }) {
  return (
    <fieldset className="scene-object-fieldset">
      <legend>Text</legend>
      <label>Font family<select value={value.fontFamily ?? ''} onChange={(event) => onChange({ fontFamily: event.currentTarget.value || undefined })}>
        <option value="">Template default</option><option value="Arial, Helvetica, sans-serif">Arial</option><option value="'Arial Narrow', Arial, sans-serif">Arial Narrow</option><option value="Impact, Haettenschweiler, sans-serif">Impact</option><option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Courier New</option>
      </select></label>
      <label>Font size<div className="scene-style-range-row"><input type="range" min="8" max="220" value={numeric(value.fontSizePx, 36)} onChange={(event) => onChange({ fontSizePx: Number(event.currentTarget.value) })} /><output>{numeric(value.fontSizePx, 36)} px</output></div></label>
      <div className="scene-object-number-grid">
        <label>Font weight<select value={numeric(value.fontWeight, 800)} onChange={(event) => onChange({ fontWeight: Number(event.currentTarget.value) })}><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option></select></label>
        <label>Line height<input type="number" min="0.6" max="3" step="0.05" value={numeric(value.lineHeight, 1)} onChange={(event) => onChange({ lineHeight: Number(event.currentTarget.value) })} /></label>
        <label>Alignment<select value={value.textAlign ?? 'left'} onChange={(event) => onChange({ textAlign: event.currentTarget.value as SceneElementStyle['textAlign'] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        <label>Letter spacing<input type="number" min="-5" max="30" step="0.5" value={numeric(value.letterSpacingPx, 0)} onChange={(event) => onChange({ letterSpacingPx: Number(event.currentTarget.value) })} /></label>
      </div>
      <label className="setting-check"><input type="checkbox" checked={value.textShadow !== false} onChange={(event) => onChange({ textShadow: event.currentTarget.checked })} />Broadcast text shadow</label>
    </fieldset>
  );
}
