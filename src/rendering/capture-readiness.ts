export interface RenderReadinessResult {
  ready: boolean;
  timedOut: boolean;
  waitedMs: number;
  detail: string;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function nextPaint(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

function imagesReady(stage: HTMLElement): boolean {
  return [...stage.querySelectorAll('img')].every((image) => image.complete && image.naturalWidth > 0);
}

function mapReady(stage: HTMLElement): boolean {
  const maps = [...stage.querySelectorAll<HTMLElement>('.map-stage')];
  if (maps.length === 0) return true;
  return maps.every((map) => map.dataset.renderReady === 'true');
}

function stageHasSize(stage: HTMLElement): boolean {
  const rect = stage.getBoundingClientRect();
  return rect.width >= 2 && rect.height >= 2;
}

export async function waitForStageReady(
  stage: HTMLElement,
  timeoutMs = 8000,
): Promise<RenderReadinessResult> {
  const started = performance.now();
  await document.fonts?.ready;
  await nextPaint();

  while (performance.now() - started < timeoutMs) {
    if (stageHasSize(stage) && imagesReady(stage) && mapReady(stage)) {
      await nextPaint();
      return {
        ready: true,
        timedOut: false,
        waitedMs: Math.round(performance.now() - started),
        detail: 'Scene renderer is ready.',
      };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  const missing: string[] = [];
  if (!stageHasSize(stage)) missing.push('stage size');
  if (!imagesReady(stage)) missing.push('images');
  if (!mapReady(stage)) missing.push('map idle state');
  return {
    ready: false,
    timedOut: true,
    waitedMs: Math.round(performance.now() - started),
    detail: missing.length ? `Timed out waiting for ${missing.join(', ')}.` : 'Timed out waiting for scene rendering.',
  };
}

export function visibleOperatorNodes(stage: HTMLElement): HTMLElement[] {
  return [...stage.querySelectorAll<HTMLElement>('[data-operator-only="true"]')]
    .filter((node) => {
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
}

export async function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('The rendered PNG could not be decoded for verification.'));
    image.src = dataUrl;
  });
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const encoded = dataUrl.slice(comma + 1);
  return Math.max(0, Math.floor(encoded.length * 0.75));
}
