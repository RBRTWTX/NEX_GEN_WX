import { useEffect, useRef, useState } from 'react';
import { defaultProject } from '../scenes/default-project';
import type { StudioBranding, StudioScene } from '../types/domain';
import { SceneTransitionViewport } from '../rendering/SceneTransitionViewport';
import { waitForStageReady } from '../rendering/capture-readiness';
import { sceneRenderSignature } from '../rendering/render-signature';
import { outputBridge, type SceneMessage } from './output-bridge';

export function OutputApp() {
  const [scene, setScene] = useState<StudioScene>(defaultProject.scenes[0]);
  const [branding, setBranding] = useState<StudioBranding>(defaultProject.branding);
  const [message, setMessage] = useState<SceneMessage | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const latestRenderIdRef = useRef<string | null>(null);
  const previousSceneIdRef = useRef(scene.id);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void outputBridge.subscribe((next) => {
      latestRenderIdRef.current = next.renderId;
      setScene(next.scene);
      setBranding(next.branding);
      setMessage(next);
    }).then((value) => {
      cleanup = value;
      void outputBridge.requestSync();
    });
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    let cancelled = false;
    const changedScene = previousSceneIdRef.current !== message.scene.id;
    previousSceneIdRef.current = message.scene.id;

    void (async () => {
      const transitionWait = changedScene && message.transition.type !== 'cut'
        ? Math.max(0, message.transition.durationMs + 100)
        : 0;
      if (transitionWait) await new Promise((resolve) => window.setTimeout(resolve, transitionWait));
      const stage = stageRef.current;
      if (!stage || cancelled || latestRenderIdRef.current !== message.renderId) return;
      const readiness = await waitForStageReady(stage, 10_000);
      if (cancelled || latestRenderIdRef.current !== message.renderId) return;
      const rect = stage.getBoundingClientRect();
      const signature = sceneRenderSignature(message.scene, message.branding);
      await outputBridge.acknowledge({
        kind: 'ack',
        renderId: message.renderId,
        sceneId: message.scene.id,
        signature,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        ready: readiness.ready && signature === message.signature,
        detail: readiness.ready
          ? `Output verified at ${Math.round(rect.width)}×${Math.round(rect.height)}.`
          : readiness.detail,
        acknowledgedAt: new Date().toISOString(),
      });
    })();

    return () => { cancelled = true; };
  }, [message]);

  return (
    <main className="output-shell">
      <SceneTransitionViewport
        ref={stageRef}
        scene={scene}
        branding={branding}
        interactive={false}
        transitionsEnabled
      />
    </main>
  );
}
