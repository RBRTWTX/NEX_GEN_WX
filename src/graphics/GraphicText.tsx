import type { ElementType } from 'react';
import type { GraphicScene } from '../types/domain';
import { EditableSceneText } from '../scene-editing/EditableSceneText';

interface GraphicTextProps {
  scene: GraphicScene;
  settingKey: string;
  defaultValue: string;
  label: string;
  onSettingChange?: (key: string, value: unknown) => void;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
}

export function graphicSetting(scene: GraphicScene, key: string, fallback: string): string {
  const value = scene.settings[key];
  return value == null || String(value).trim() === '' ? fallback : String(value);
}

export function GraphicText({
  scene,
  settingKey,
  defaultValue,
  label,
  onSettingChange,
  as,
  className,
  multiline,
}: GraphicTextProps) {
  return (
    <EditableSceneText
      as={as}
      className={className}
      multiline={multiline}
      elementId={`graphic.${settingKey}`}
      label={label}
      value={graphicSetting(scene, settingKey, defaultValue)}
      onChange={(value) => onSettingChange?.(settingKey, value)}
    />
  );
}
