import { useEffect, type Dispatch } from 'react';
import { getCurrentWindow, Window } from '@tauri-apps/api/window';
import type { StudioBranding, StudioScene } from '../types/domain';
import type { StudioAction } from '../state/studio-actions';
import { outputBridge } from './output-bridge';

interface UseOutputControllerOptions {
  scene: StudioScene | null;
  branding: StudioBranding;
  hydrated: boolean;
  dispatch: Dispatch<StudioAction>;
}

export function useOutputController(options: UseOutputControllerOptions): {
  openOutput: () => Promise<void>;
  hideOutput: () => Promise<void>;
} {
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
      if (message.kind === 'visibility') {
        dispatch({ type: 'presentation/set-output-open', value: message.visible });
        if (!message.visible) {
          dispatch({
            type: 'status/set',
            message: message.reason === 'escape'
              ? 'Output hidden with Esc; press Present to reopen.'
              : 'Output hidden; press Present to reopen.',
          });
        }
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

  async function hideOutput(): Promise<void> {
    try {
      const existing = await Window.getByLabel('output');
      if (existing) await existing.hide();
      await outputBridge.reportVisibility(false, 'operator').catch(() => undefined);
      dispatch({ type: 'presentation/set-output-open', value: false });
      dispatch({ type: 'status/set', message: 'Output hidden; press Present to reopen.' });
      await getCurrentWindow().show().catch(() => undefined);
      await getCurrentWindow().setFocus().catch(() => undefined);
    } catch (error) {
      dispatch({
        type: 'status/set',
        message: `Unable to hide output: ${String(error)}`,
        level: 'warning',
      });
    }
  }

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
      await outputBridge.reportVisibility(true, 'operator').catch(() => undefined);
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

  return { openOutput, hideOutput };
}
