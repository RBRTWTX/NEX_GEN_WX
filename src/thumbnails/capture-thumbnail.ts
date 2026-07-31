import { toJpeg } from 'html-to-image';
import { waitForStageReady } from '../rendering/capture-readiness';

const OPERATOR_CLASSES = new Set(['product-chip', 'module-notice', 'map-provider-error']);

export async function captureStageThumbnail(stage: HTMLElement): Promise<string> {
  await waitForStageReady(stage, 5000);
  document.body.classList.add('thumbnail-capture-mode');
  try {
    return await toJpeg(stage, {
      cacheBust: true,
      quality: 0.82,
      pixelRatio: 1,
      canvasWidth: 320,
      canvasHeight: 180,
      backgroundColor: '#0a0f18',
      filter: (node: HTMLElement) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.dataset.operatorOnly === 'true') return false;
        return ![...OPERATOR_CLASSES].some((className) => node.classList.contains(className));
      },
    });
  } finally {
    document.body.classList.remove('thumbnail-capture-mode');
  }
}
