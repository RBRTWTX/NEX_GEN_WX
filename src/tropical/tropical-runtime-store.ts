import { useSyncExternalStore } from 'react';
import type { TropicalStormSummary } from './tropical-types';

export type TropicalRuntimeChannel = 'operator' | 'output' | 'export';

export interface TropicalFeatureCounts {
  points: number;
  track: number;
  cone: number;
  warnings: number;
}

export interface TropicalRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  storms: TropicalStormSummary[];
  selectedStormId: string | null;
  selectedStorm: TropicalStormSummary | null;
  featureCounts: TropicalFeatureCounts;
  updatedAt: string;
}

const snapshots = new Map<string, TropicalRuntimeSnapshot>();
const emptySnapshots = new Map<string, TropicalRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: TropicalRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(sceneId: string, channel: TropicalRuntimeChannel): TropicalRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: TropicalRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    storms: [],
    selectedStormId: null,
    selectedStorm: null,
    featureCounts: { points: 0, track: 0, cone: 0, warnings: 0 },
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishTropicalRuntime(
  sceneId: string,
  patch: Partial<TropicalRuntimeSnapshot>,
  channel: TropicalRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  snapshots.set(key, { ...previous, ...patch, sceneId });
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearTropicalRuntime(
  sceneId: string,
  channel: TropicalRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getTropicalRuntimeSnapshot(
  sceneId: string,
  channel: TropicalRuntimeChannel = 'operator',
): TropicalRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeTropicalRuntime(
  sceneId: string,
  listener: () => void,
  channel: TropicalRuntimeChannel = 'operator',
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

export function useTropicalRuntime(
  sceneId: string,
  channel: TropicalRuntimeChannel = 'operator',
): TropicalRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeTropicalRuntime(sceneId, listener, channel),
    () => getTropicalRuntimeSnapshot(sceneId, channel),
    () => getTropicalRuntimeSnapshot(sceneId, channel),
  );
}
