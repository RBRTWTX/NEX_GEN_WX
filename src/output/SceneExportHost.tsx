import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { StudioBranding, StudioScene } from '../types/domain';
import { SceneStage } from '../components/SceneStage';
import { sceneRenderSignature } from '../rendering/render-signature';
import { exportStageAsPng, type SceneExportResult } from './export-scene';

interface ExportJob {
  id: number;
  scene: StudioScene;
  branding: StudioBranding;
  filePrefix?: string;
}

interface PendingPromise {
  resolve: (value: SceneExportResult) => void;
  reject: (reason?: unknown) => void;
}

export interface SceneExportHostHandle {
  exportScene: (
    scene: StudioScene,
    branding: StudioBranding,
    filePrefix?: string,
  ) => Promise<SceneExportResult>;
}

export const SceneExportHost = forwardRef<SceneExportHostHandle>(function SceneExportHost(_, forwardedRef) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<PendingPromise | null>(null);
  const sequenceRef = useRef(0);

  useImperativeHandle(forwardedRef, () => ({
    exportScene(scene, branding, filePrefix) {
      if (pendingRef.current) return Promise.reject(new Error('Another scene export is already running.'));
      sequenceRef.current += 1;
      return new Promise<SceneExportResult>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        setJob({ id: sequenceRef.current, scene: structuredClone(scene), branding: structuredClone(branding), filePrefix });
      });
    },
  }), []);

  useEffect(() => {
    if (!job) return undefined;
    let cancelled = false;
    void (async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const stage = stageRef.current;
      if (!stage) throw new Error('The canonical export surface did not mount.');
      return exportStageAsPng(stage, job.scene.name, {
        signature: sceneRenderSignature(job.scene, job.branding),
        filePrefix: job.filePrefix,
        expectedWidth: 1920,
        expectedHeight: 1080,
      });
    })().then((result) => {
      if (cancelled) return;
      pendingRef.current?.resolve(result);
      pendingRef.current = null;
      setJob(null);
    }).catch((error) => {
      if (cancelled) return;
      pendingRef.current?.reject(error);
      pendingRef.current = null;
      setJob(null);
    });
    return () => { cancelled = true; };
  }, [job]);

  if (!job) return null;
  return (
    <div className="scene-export-host" data-operator-only="true" aria-hidden="true">
      <div className="scene-export-surface">
        <SceneStage ref={stageRef} scene={job.scene} branding={job.branding} interactive={false} />
      </div>
    </div>
  );
});
