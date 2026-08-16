import { useSyncExternalStore } from 'react';
import type { TropicalOutlookPeriod } from './tropical-outlook-types';

export type TropicalOutlookRuntimeChannel = 'operator' | 'output' | 'export';

export interface TropicalOutlookFeatureCounts {
  locations: number;
  regions: number;
  motion: number;
}

export interface TropicalOutlookRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  period: TropicalOutlookPeriod | null;
  featureCounts: TropicalOutlookFeatureCounts;
  updatedAt: string;
}

const snapshots = new Map<string, TropicalOutlookRuntimeSnapshot>();
const emptySnapshots = new Map<string, TropicalOutlookRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: TropicalOutlookRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(sceneId: string, channel: TropicalOutlookRuntimeChannel): TropicalOutlookRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: TropicalOutlookRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    period: null,
    featureCounts: { locations: 0, regions: 0, motion: 0 },
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishTropicalOutlookRuntime(
  sceneId: string,
  patch: Partial<TropicalOutlookRuntimeSnapshot>,
  channel: TropicalOutlookRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  snapshots.set(key, { ...previous, ...patch, sceneId });
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearTropicalOutlookRuntime(
  sceneId: string,
  channel: TropicalOutlookRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getTropicalOutlookRuntimeSnapshot(
  sceneId: string,
  channel: TropicalOutlookRuntimeChannel = 'operator',
): TropicalOutlookRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeTropicalOutlookRuntime(
  sceneId: string,
  listener: () => void,
  channel: TropicalOutlookRuntimeChannel = 'operator',
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

export function useTropicalOutlookRuntime(
  sceneId: string,
  channel: TropicalOutlookRuntimeChannel = 'operator',
): TropicalOutlookRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeTropicalOutlookRuntime(sceneId, listener, channel),
    () => getTropicalOutlookRuntimeSnapshot(sceneId, channel),
    () => getTropicalOutlookRuntimeSnapshot(sceneId, channel),
  );
}
