import { useSyncExternalStore } from 'react';
import type { TropicalStormSurgeProduct } from './tropical-storm-surge-types';

export type TropicalStormSurgeRuntimeChannel = 'operator' | 'output' | 'export';

export interface TropicalStormSurgeRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  product: TropicalStormSurgeProduct | null;
  featureCount: number;
  updatedAt: string;
}

const snapshots = new Map<string, TropicalStormSurgeRuntimeSnapshot>();
const emptySnapshots = new Map<string, TropicalStormSurgeRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: TropicalStormSurgeRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(
  sceneId: string,
  channel: TropicalStormSurgeRuntimeChannel,
): TropicalStormSurgeRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: TropicalStormSurgeRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    product: null,
    featureCount: 0,
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishTropicalStormSurgeRuntime(
  sceneId: string,
  patch: Partial<TropicalStormSurgeRuntimeSnapshot>,
  channel: TropicalStormSurgeRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  snapshots.set(key, { ...previous, ...patch, sceneId });
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearTropicalStormSurgeRuntime(
  sceneId: string,
  channel: TropicalStormSurgeRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getTropicalStormSurgeRuntimeSnapshot(
  sceneId: string,
  channel: TropicalStormSurgeRuntimeChannel = 'operator',
): TropicalStormSurgeRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeTropicalStormSurgeRuntime(
  sceneId: string,
  listener: () => void,
  channel: TropicalStormSurgeRuntimeChannel = 'operator',
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

export function useTropicalStormSurgeRuntime(
  sceneId: string,
  channel: TropicalStormSurgeRuntimeChannel = 'operator',
): TropicalStormSurgeRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeTropicalStormSurgeRuntime(sceneId, listener, channel),
    () => getTropicalStormSurgeRuntimeSnapshot(sceneId, channel),
    () => getTropicalStormSurgeRuntimeSnapshot(sceneId, channel),
  );
}
