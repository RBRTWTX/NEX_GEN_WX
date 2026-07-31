import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

interface FloatingWindowProps {
  title: string;
  eyebrow?: string;
  className?: string;
  children: ReactNode;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

const VIEWPORT_MARGIN = 8;
const TOP_GUARD = 54;
const BOTTOM_GUARD = 56;

export function FloatingWindow({
  title,
  eyebrow,
  className = '',
  children,
  onClose,
  initialPosition = { x: 420, y: 120 },
}: FloatingWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  function clampPosition(next: { x: number; y: number }): { x: number; y: number } {
    const rect = windowRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 420;
    const height = rect?.height ?? 260;
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const maxY = Math.max(TOP_GUARD, window.innerHeight - height - BOTTOM_GUARD);
    return {
      x: Math.max(VIEWPORT_MARGIN, Math.min(maxX, next.x)),
      y: Math.max(TOP_GUARD, Math.min(maxY, next.y)),
    };
  }

  useEffect(() => {
    const constrain = () => setPosition((current) => clampPosition(current));
    constrain();
    window.addEventListener('resize', constrain);
    return () => window.removeEventListener('resize', constrain);
  }, []);

  function pointerDown(event: PointerEvent<HTMLElement>): void {
    if ((event.target as HTMLElement).closest('button,input,select,textarea')) return;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(clampPosition({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    }));
  }

  function pointerUp(event: PointerEvent<HTMLElement>): void {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section
      ref={windowRef}
      className={`floating-window ${className}`}
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-operator-only="true"
    >
      <header
        className="floating-window__header"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <span className="floating-window__grip" aria-hidden="true">⠿</span>
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title}`}>×</button>
      </header>
      <div className="floating-window__body">{children}</div>
    </section>
  );
}
