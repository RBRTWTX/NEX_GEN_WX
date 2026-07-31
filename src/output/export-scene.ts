import { toPng } from 'html-to-image';
import { savePng } from '../engine/tauri-commands';
import {
  estimateDataUrlBytes,
  readImageDimensions,
  visibleOperatorNodes,
  waitForStageReady,
} from '../rendering/capture-readiness';

export interface SceneExportResult {
  path: string;
  fileName: string;
  width: number;
  height: number;
  byteLength: number;
  signature: string;
  verified: boolean;
  detail: string;
}

export interface SceneExportOptions {
  signature: string;
  filePrefix?: string;
  expectedWidth?: number;
  expectedHeight?: number;
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9 _-]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'weather_scene';
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Captures and verifies the shared non-interactive SceneStage renderer. */
export async function exportStageAsPng(
  stage: HTMLElement,
  sceneName: string,
  options: SceneExportOptions,
): Promise<SceneExportResult> {
  const operatorOnlyClasses = new Set(['product-chip', 'module-notice', 'map-provider-error']);
  const expectedWidth = options.expectedWidth ?? 1920;
  const expectedHeight = options.expectedHeight ?? 1080;
  const readiness = await waitForStageReady(stage, 12_000);
  document.body.classList.add('export-capture-mode');
  try {
    await document.fonts?.ready;
    await nextPaint();
    const rect = stage.getBoundingClientRect();
    const sourceWidth = Math.max(1, Math.round(rect.width));
    const sourceHeight = Math.max(1, Math.round(rect.height));
    if (sourceWidth !== expectedWidth || sourceHeight !== expectedHeight) {
      throw new Error(`Export surface is ${sourceWidth}×${sourceHeight}; expected ${expectedWidth}×${expectedHeight}.`);
    }
    const visibleOperators = visibleOperatorNodes(stage);
    if (visibleOperators.length) {
      throw new Error(`Export verification found ${visibleOperators.length} operator-only element(s) in the scene output.`);
    }

    const dataUrl = await toPng(stage, {
      cacheBust: true,
      pixelRatio: 1,
      width: expectedWidth,
      height: expectedHeight,
      canvasWidth: expectedWidth,
      canvasHeight: expectedHeight,
      backgroundColor: '#0a0f18',
      filter: (node: HTMLElement) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.dataset.operatorOnly === 'true') return false;
        return ![...operatorOnlyClasses].some((className) => node.classList.contains(className));
      },
    });
    const dimensions = await readImageDimensions(dataUrl);
    const verified = dimensions.width === expectedWidth && dimensions.height === expectedHeight;
    if (!verified) {
      throw new Error(`PNG verification returned ${dimensions.width}×${dimensions.height}; expected ${expectedWidth}×${expectedHeight}.`);
    }

    const prefix = options.filePrefix ? `${safeFileName(options.filePrefix)}_` : '';
    const fileName = `${prefix}${safeFileName(sceneName)}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    let path: string;
    try {
      path = await savePng(dataUrl, fileName);
    } catch {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = fileName;
      anchor.click();
      path = fileName;
    }

    return {
      path,
      fileName,
      width: dimensions.width,
      height: dimensions.height,
      byteLength: estimateDataUrlBytes(dataUrl),
      signature: options.signature,
      verified,
      detail: readiness.ready
        ? `Verified ${dimensions.width}×${dimensions.height} scene export.`
        : `Export completed after readiness timeout: ${readiness.detail}`,
    };
  } finally {
    document.body.classList.remove('export-capture-mode');
  }
}

export function exportProjectAsJson(project: unknown, projectName: string): string {
  const fileName = `${safeFileName(projectName)}_${new Date().toISOString().replace(/[:.]/g, '-')}.nexgenwx.json`;
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return fileName;
}
