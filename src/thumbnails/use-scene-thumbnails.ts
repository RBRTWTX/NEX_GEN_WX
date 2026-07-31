import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { StudioBranding, StudioScene } from '../types/domain';
import { sceneRenderSignature } from '../rendering/render-signature';
import { captureStageThumbnail } from './capture-thumbnail';
import {
  loadProjectThumbnails,
  removeStaleThumbnails,
  saveSceneThumbnail,
  thumbnailKey,
  type SceneThumbnailRecord,
} from './scene-thumbnail-store';

interface UseSceneThumbnailsOptions {
  projectId: string;
  scenes: StudioScene[];
  selectedScene: StudioScene;
  branding: StudioBranding;
  stageRef: RefObject<HTMLDivElement | null>;
}

export function useSceneThumbnails(options: UseSceneThumbnailsOptions): Record<string, string> {
  const [records, setRecords] = useState<Record<string, SceneThumbnailRecord>>({});
  const captureEpochRef = useRef(0);
  const fingerprint = useMemo(
    () => sceneRenderSignature(options.selectedScene, options.branding),
    [options.branding, options.selectedScene],
  );

  useEffect(() => {
    let cancelled = false;
    void loadProjectThumbnails(options.projectId).then((items) => {
      if (cancelled) return;
      setRecords(Object.fromEntries(items.map((item) => [item.sceneId, item])));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [options.projectId]);

  useEffect(() => {
    const sceneIds = new Set(options.scenes.map((scene) => scene.id));
    setRecords((value) => Object.fromEntries(
      Object.entries(value).filter(([sceneId]) => sceneIds.has(sceneId)),
    ));
    void removeStaleThumbnails(options.projectId, sceneIds).catch(() => undefined);
  }, [options.projectId, options.scenes]);

  useEffect(() => {
    const existing = records[options.selectedScene.id];
    if (existing?.fingerprint === fingerprint) return undefined;
    const epoch = ++captureEpochRef.current;
    const timer = window.setTimeout(() => {
      const stage = options.stageRef.current;
      if (!stage) return;
      void captureStageThumbnail(stage).then((dataUrl) => {
        if (captureEpochRef.current !== epoch) return;
        const record: SceneThumbnailRecord = {
          key: thumbnailKey(options.projectId, options.selectedScene.id),
          projectId: options.projectId,
          sceneId: options.selectedScene.id,
          fingerprint,
          dataUrl,
          width: 320,
          height: 180,
          updatedAt: new Date().toISOString(),
        };
        setRecords((value) => ({ ...value, [record.sceneId]: record }));
        void saveSceneThumbnail(record).catch(() => undefined);
      }).catch(() => undefined);
    }, options.selectedScene.kind === 'map' ? 1600 : 650);
    return () => window.clearTimeout(timer);
  }, [fingerprint, options.projectId, options.selectedScene.id, options.selectedScene.kind, options.stageRef, records]);

  return useMemo(
    () => Object.fromEntries(Object.entries(records).map(([sceneId, record]) => [sceneId, record.dataUrl])),
    [records],
  );
}
