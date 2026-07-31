import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useSceneEditing, sceneObjectSelection } from './SceneEditingContext';
import { sceneObjectCss } from './scene-object-style';

interface EditableSceneTextProps {
  elementId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  title?: string;
  source?: 'built-in' | 'custom';
  customObjectId?: string;
  style?: CSSProperties;
}

function plainText(element: HTMLElement): string {
  return (element.innerText ?? element.textContent ?? '').replace(/\r/g, '').trim();
}

export function EditableSceneText({
  elementId,
  label,
  value,
  onChange,
  as = 'span',
  className = '',
  multiline = false,
  title,
  source = 'built-in',
  customObjectId,
  style,
}: EditableSceneTextProps) {
  const editing = useSceneEditing();
  const ref = useRef<HTMLElement | null>(null);
  const selected = editing.selectedElementId === elementId;
  const override = editing.elementOverrides[elementId];

  useEffect(() => {
    const element = ref.current;
    if (!element || document.activeElement === element) return;
    if (element.innerText !== value) element.innerText = value;
  }, [value]);

  function select(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>): void {
    if (!editing.interactive) return;
    event.stopPropagation();
    editing.selectElement(sceneObjectSelection(
      editing.sceneId,
      elementId,
      label,
      'text',
      source,
      customObjectId,
    ));
  }

  function commit(event: FocusEvent<HTMLElement>): void {
    const next = plainText(event.currentTarget);
    if (next !== value) onChange(next);
  }

  function keyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.currentTarget.innerText = value;
      event.currentTarget.blur();
      return;
    }
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return createElement(
    as,
    {
      ref,
      className: `scene-object scene-object--text scene-editable-text ${selected ? 'is-selected' : ''} ${className}`.trim(),
      style: { ...style, ...sceneObjectCss(override, editing.interactive) },
      contentEditable: editing.interactive,
      suppressContentEditableWarning: true,
      spellCheck: false,
      role: editing.interactive ? 'textbox' : undefined,
      tabIndex: editing.interactive ? 0 : undefined,
      title: title ?? (editing.interactive ? `Click to edit ${label}` : undefined),
      'data-scene-object-id': elementId,
      'data-scene-object-kind': 'text',
      'data-scene-object-source': source,
      'data-operator-editable': editing.interactive ? 'true' : undefined,
      onClick: select,
      onFocus: select,
      onBlur: commit,
      onKeyDown: keyDown,
    },
    value,
  );
}
