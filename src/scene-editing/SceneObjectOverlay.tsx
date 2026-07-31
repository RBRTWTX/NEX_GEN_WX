import { useCallback, useEffect, useLayoutEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { SceneElementTransform } from '../types/domain';
import { useSceneEditing } from './SceneEditingContext';
import { normalizedTransform } from './scene-object-style';

interface ObjectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-se' | 'resize-sw' | 'rotate';

function targetElement(stage: HTMLDivElement, elementId: string): HTMLElement | null {
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(elementId) : elementId.replace(/"/g, '\\"');
  return stage.querySelector<HTMLElement>(`[data-scene-object-id="${escaped}"]`);
}

function objectBox(stage: HTMLDivElement, target: HTMLElement): ObjectBox {
  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return {
    left: targetRect.left - stageRect.left,
    top: targetRect.top - stageRect.top,
    width: targetRect.width,
    height: targetRect.height,
  };
}

function applyPreview(target: HTMLElement, transform: Required<ReturnType<typeof normalizedTransform>>): void {
  target.style.translate = `calc(var(--scene-stage-width, 0px) * ${transform.xPercent} / 100) calc(var(--scene-stage-height, 0px) * ${transform.yPercent} / 100)`;
  target.style.rotate = `${transform.rotationDeg}deg`;
  target.style.scale = `${transform.scaleX} ${transform.scaleY}`;
  target.style.zIndex = String(transform.zIndex);
}

function editableTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
}

export function SceneObjectOverlay() {
  const editing = useSceneEditing();
  const [box, setBox] = useState<ObjectBox | null>(null);
  const selectedId = editing.selectedElementId;
  const override = selectedId ? editing.elementOverrides[selectedId] : undefined;
  const transform = normalizedTransform(override?.transform);

  const refresh = useCallback(() => {
    const stage = editing.stageRef.current;
    if (!stage || !selectedId) {
      setBox(null);
      return;
    }
    const target = targetElement(stage, selectedId);
    setBox(target ? objectBox(stage, target) : null);
  }, [editing.stageRef, selectedId]);

  useLayoutEffect(() => {
    refresh();
    const stage = editing.stageRef.current;
    if (!stage || !selectedId) return undefined;
    const target = targetElement(stage, selectedId);
    if (!target) return undefined;
    const observer = new ResizeObserver(refresh);
    observer.observe(stage);
    observer.observe(target);
    const mutationObserver = new MutationObserver(refresh);
    mutationObserver.observe(target, { childList: true, characterData: true, subtree: true, attributes: true });
    window.addEventListener('resize', refresh);
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, [editing.stageRef, refresh, selectedId, override]);

  useEffect(() => {
    if (!editing.interactive || !selectedId) return undefined;
    const listener = (event: KeyboardEvent) => {
      if (editableTarget(event.target)) return;
      if (event.key === 'Escape') {
        editing.clearSelection();
        return;
      }
      const step = event.shiftKey ? 1 : 0.15;
      if (event.key === 'ArrowLeft') editing.updateElementTransform(selectedId, { xPercent: transform.xPercent - step });
      else if (event.key === 'ArrowRight') editing.updateElementTransform(selectedId, { xPercent: transform.xPercent + step });
      else if (event.key === 'ArrowUp') editing.updateElementTransform(selectedId, { yPercent: transform.yPercent - step });
      else if (event.key === 'ArrowDown') editing.updateElementTransform(selectedId, { yPercent: transform.yPercent + step });
      else if (event.key === 'PageUp') editing.updateElementTransform(selectedId, { zIndex: transform.zIndex + 1 });
      else if (event.key === 'PageDown') editing.updateElementTransform(selectedId, { zIndex: transform.zIndex - 1 });
      else if ((event.key === 'Delete' || event.key === 'Backspace')) {
        const object = editing.customObjects.find((item) => `custom.${item.id}` === selectedId);
        if (object) {
          event.preventDefault();
          editing.deleteCustomObject(object.id);
          editing.clearSelection();
        }
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [editing, selectedId, transform]);

  function startDrag(mode: DragMode, event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!selectedId || transform.locked) return;
    const stage = editing.stageRef.current;
    if (!stage) return;
    const target = targetElement(stage, selectedId);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const stageRect = stage.getBoundingClientRect();
    const startBox = target.getBoundingClientRect();
    const start = { ...transform };
    const startX = event.clientX;
    const startY = event.clientY;
    const centerX = startBox.left + startBox.width / 2;
    const centerY = startBox.top + startBox.height / 2;
    const startAngle = Math.atan2(startY - centerY, startX - centerX) * 180 / Math.PI;
    let latest = { ...start };

    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - startX;
      const dy = pointer.clientY - startY;
      if (mode === 'move') {
        latest.xPercent = start.xPercent + (dx / Math.max(1, stageRect.width)) * 100;
        latest.yPercent = start.yPercent + (dy / Math.max(1, stageRect.height)) * 100;
      } else if (mode === 'rotate') {
        const angle = Math.atan2(pointer.clientY - centerY, pointer.clientX - centerX) * 180 / Math.PI;
        latest.rotationDeg = start.rotationDeg + angle - startAngle;
      } else {
        const horizontalSign = mode.endsWith('w') ? -1 : 1;
        const verticalSign = mode.includes('n') ? -1 : 1;
        const nextWidth = Math.max(12, startBox.width + dx * horizontalSign);
        const nextHeight = Math.max(12, startBox.height + dy * verticalSign);
        let scaleX = start.scaleX * nextWidth / Math.max(1, startBox.width);
        let scaleY = start.scaleY * nextHeight / Math.max(1, startBox.height);
        if (pointer.shiftKey) {
          const uniform = Math.max(0.05, Math.max(scaleX, scaleY));
          scaleX = uniform;
          scaleY = uniform;
        }
        latest.scaleX = Math.max(0.05, Math.min(12, scaleX));
        latest.scaleY = Math.max(0.05, Math.min(12, scaleY));
      }
      applyPreview(target, latest);
      requestAnimationFrame(refresh);
    };

    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      editing.updateElementTransform(selectedId, latest);
      requestAnimationFrame(refresh);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
  }

  if (!editing.interactive || !selectedId || !box) return null;

  return (
    <div
      className={`scene-object-overlay ${transform.locked ? 'is-locked' : ''}`}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      data-operator-only="true"
      aria-hidden="true"
    >
      <button type="button" className="scene-object-move-handle" onPointerDown={(event) => startDrag('move', event)}>
        {transform.locked ? 'LOCKED' : 'MOVE'}
      </button>
      {!transform.locked && (
        <>
          <button type="button" className="scene-object-resize-handle handle-nw" onPointerDown={(event) => startDrag('resize-nw', event)} />
          <button type="button" className="scene-object-resize-handle handle-ne" onPointerDown={(event) => startDrag('resize-ne', event)} />
          <button type="button" className="scene-object-resize-handle handle-se" onPointerDown={(event) => startDrag('resize-se', event)} />
          <button type="button" className="scene-object-resize-handle handle-sw" onPointerDown={(event) => startDrag('resize-sw', event)} />
          <button type="button" className="scene-object-rotate-handle" onPointerDown={(event) => startDrag('rotate', event)}>↻</button>
        </>
      )}
    </div>
  );
}
