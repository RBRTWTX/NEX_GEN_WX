import { useSyncExternalStore } from 'react';
import type { RadarFrame, RadarSite } from './radar-types';

export type RadarRuntimeChannel = 'operator' | 'output' | 'export';

export interface RadarRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  availableSites: RadarSite[];
  resolvedSites: string[];
  frames: RadarFrame[];
  frameIndex: number;
  validTime: string;
  updatedAt: string;
}

const snapshots = new Map<string, RadarRuntimeSnapshot>();
const emptySnapshots = new Map<string, RadarRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: RadarRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(sceneId: string, channel: RadarRuntimeChannel): RadarRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: RadarRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    availableSites: [],
    resolvedSites: [],
    frames: [],
    frameIndex: 0,
    validTime: '',
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishRadarRuntime(
  sceneId: string,
  patch: Partial<RadarRuntimeSnapshot>,
  channel: RadarRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  const next: RadarRuntimeSnapshot = { ...previous, ...patch, sceneId };
  snapshots.set(key, next);
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearRadarRuntime(sceneId: string, channel: RadarRuntimeChannel = 'operator'): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getRadarRuntimeSnapshot(
  sceneId: string,
  channel: RadarRuntimeChannel = 'operator',
): RadarRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeRadarRuntime(
  sceneId: string,
  listener: () => void,
  channel: RadarRuntimeChannel = 'operator',
): () => void {
  const key = runtimeKey(sceneId, channel);
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(key);
  };
}

export function useRadarRuntime(
  sceneId: string,
  channel: RadarRuntimeChannel = 'operator',
): RadarRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeRadarRuntime(sceneId, listener, channel),
    () => getRadarRuntimeSnapshot(sceneId, channel),
    () => getRadarRuntimeSnapshot(sceneId, channel),
  );
}
