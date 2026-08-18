import { useSyncExternalStore } from 'react';
import type { TropicalArrivalTimeMode } from './tropical-arrival-time-types';

export type TropicalArrivalTimeRuntimeChannel = 'operator' | 'output' | 'export';

export interface TropicalArrivalTimeRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  mode: TropicalArrivalTimeMode | null;
  contourCount: number;
  probabilityAreaCount: number;
  stormCount: number;
  updatedAt: string;
}

const snapshots = new Map<string, TropicalArrivalTimeRuntimeSnapshot>();
const emptySnapshots = new Map<string, TropicalArrivalTimeRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: TropicalArrivalTimeRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(
  sceneId: string,
  channel: TropicalArrivalTimeRuntimeChannel,
): TropicalArrivalTimeRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: TropicalArrivalTimeRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    mode: null,
    contourCount: 0,
    probabilityAreaCount: 0,
    stormCount: 0,
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishTropicalArrivalTimeRuntime(
  sceneId: string,
  patch: Partial<TropicalArrivalTimeRuntimeSnapshot>,
  channel: TropicalArrivalTimeRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  snapshots.set(key, { ...previous, ...patch, sceneId });
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearTropicalArrivalTimeRuntime(
  sceneId: string,
  channel: TropicalArrivalTimeRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getTropicalArrivalTimeRuntimeSnapshot(
  sceneId: string,
  channel: TropicalArrivalTimeRuntimeChannel = 'operator',
): TropicalArrivalTimeRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeTropicalArrivalTimeRuntime(
  sceneId: string,
  listener: () => void,
  channel: TropicalArrivalTimeRuntimeChannel = 'operator',
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

export function useTropicalArrivalTimeRuntime(
  sceneId: string,
  channel: TropicalArrivalTimeRuntimeChannel = 'operator',
): TropicalArrivalTimeRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeTropicalArrivalTimeRuntime(sceneId, listener, channel),
    () => getTropicalArrivalTimeRuntimeSnapshot(sceneId, channel),
    () => getTropicalArrivalTimeRuntimeSnapshot(sceneId, channel),
  );
}
