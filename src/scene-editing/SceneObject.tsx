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

export type SceneObjectEditTrigger = 'left' | 'contextmenu' | 'none';

interface SceneObjectProps {
  elementId: string;
  label: string;
  kind?: SceneObjectKind;
  source?: 'built-in' | 'custom';
  customObjectId?: string;
  editTrigger?: SceneObjectEditTrigger;
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
  editTrigger = 'left',
  as = 'div',
  className = '',
  style,
  children,
  onClick,
  onContextMenu,
  ...rest
}: SceneObjectProps) {
  const editing = useSceneEditing();
  const selected = editing.selectedElementId === elementId;
  const override = editing.elementOverrides[elementId];

  function selectForEditing(event: MouseEvent<HTMLElement>): void {
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

  function click(event: MouseEvent<HTMLElement>): void {
    if (typeof onClick === 'function') {
      (onClick as (event: MouseEvent<HTMLElement>) => void)(event);
    }
    if (!editing.interactive || event.defaultPrevented || editTrigger !== 'left') return;
    selectForEditing(event);
  }

  function contextMenu(event: MouseEvent<HTMLElement>): void {
    if (typeof onContextMenu === 'function') {
      (onContextMenu as (event: MouseEvent<HTMLElement>) => void)(event);
    }
    if (!editing.interactive || event.defaultPrevented || editTrigger !== 'contextmenu') return;
    event.preventDefault();
    selectForEditing(event);
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
      'data-scene-object-edit-trigger': editTrigger,
      'data-operator-editable': editing.interactive ? 'true' : undefined,
      onClick: click,
      onContextMenu: contextMenu,
    },
    children,
  );
}
