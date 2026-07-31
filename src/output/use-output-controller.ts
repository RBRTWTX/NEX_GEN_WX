import { useEffect, type Dispatch } from 'react';
import { Window } from '@tauri-apps/api/window';
import type { StudioBranding, StudioScene } from '../types/domain';
import type { StudioAction } from '../state/studio-actions';
import { outputBridge } from './output-bridge';

interface UseOutputControllerOptions {
  scene: StudioScene | null;
  branding: StudioBranding;
  hydrated: boolean;
  dispatch: Dispatch<StudioAction>;
}

export function useOutputController(options: UseOutputControllerOptions): { openOutput: () => Promise<void> } {
  const { scene, branding, hydrated, dispatch } = options;

  useEffect(() => {
    if (!hydrated || !scene) return;
    void outputBridge.publish(scene, branding).then((message) => {
      dispatch({
        type: 'presentation/output-sync-start',
        renderId: message.renderId,
        sceneId: message.scene.id,
      });
    }).catch((error) => {
      dispatch({ type: 'presentation/output-error', detail: `Output synchronization failed: ${String(error)}` });
    });
  }, [branding, dispatch, hydrated, scene]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void outputBridge.subscribeControls((message) => {
      if (message.kind === 'sync-request') {
        void outputBridge.republishLatest();
        return;
      }
      dispatch({
        type: 'presentation/output-ack',
        renderId: message.renderId,
        sceneId: message.sceneId,
        ready: message.ready,
        width: message.width,
        height: message.height,
        detail: message.detail,
      });
    }).then((value) => {
      if (disposed) value();
      else cleanup = value;
    }).catch((error) => {
      if (!disposed) {
        dispatch({ type: 'presentation/output-error', detail: `Output listener failed: ${String(error)}` });
      }
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [dispatch]);

  async function openOutput(): Promise<void> {
    if (!scene) {
      dispatch({ type: 'status/set', message: 'The output cannot open until an active scene is ready.', level: 'warning' });
      return;
    }

    try {
      const existing = await Window.getByLabel('output');
      if (!existing) throw new Error('The configured output window is unavailable.');
      await existing.show();
      await existing.setFocus();
      dispatch({ type: 'presentation/set-output-open', value: true });
      const message = await outputBridge.publish(scene, branding);
      dispatch({ type: 'presentation/output-sync-start', renderId: message.renderId, sceneId: message.scene.id });
    } catch {
      window.open(
        `${window.location.origin}${window.location.pathname}?window=output`,
        '_blank',
        'popup,width=1280,height=720',
      );
      dispatch({ type: 'status/set', message: 'Opened browser output preview' });
    }
  }

  return { openOutput };
}
