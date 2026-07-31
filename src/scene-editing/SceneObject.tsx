import {
  createElement,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { SceneObjectKind } from '../types/domain';
import { useSceneEditing, sceneObjectSelection } from './SceneEditingContext';
import { sceneObjectCss } from './scene-object-style';

interface SceneObjectProps {
  elementId: string;
  label: string;
  kind?: SceneObjectKind;
  source?: 'built-in' | 'custom';
  customObjectId?: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

export function SceneObject({
  elementId,
  label,
  kind = 'container',
  source = 'built-in',
  customObjectId,
  as = 'div',
  className = '',
  style,
  children,
  onClick,
  ...rest
}: SceneObjectProps) {
  const editing = useSceneEditing();
  const selected = editing.selectedElementId === elementId;
  const override = editing.elementOverrides[elementId];

  function select(event: MouseEvent<HTMLElement>): void {
    if (typeof onClick === 'function') {
      (onClick as (event: MouseEvent<HTMLElement>) => void)(event);
    }
    if (!editing.interactive || event.defaultPrevented) return;
    event.stopPropagation();
    editing.selectElement(sceneObjectSelection(
      editing.sceneId,
      elementId,
      label,
      kind,
      source,
      customObjectId,
    ));
  }

  return createElement(
    as,
    {
      ...rest,
      className: `scene-object scene-object--${kind} ${selected ? 'is-selected' : ''} ${className}`.trim(),
      style: { ...style, ...sceneObjectCss(override, editing.interactive) },
      'data-scene-object-id': elementId,
      'data-scene-object-kind': kind,
      'data-scene-object-source': source,
      'data-operator-editable': editing.interactive ? 'true' : undefined,
      onClick: select,
    },
    children,
  );
}
