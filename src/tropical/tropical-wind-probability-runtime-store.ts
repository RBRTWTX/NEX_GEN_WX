import { useSyncExternalStore } from 'react';
import type { TropicalWindProbabilityThreshold } from './tropical-wind-probability-types';

export type TropicalWindProbabilityRuntimeChannel = 'operator' | 'output' | 'export';

export interface TropicalWindProbabilityRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  thresholdKnots: TropicalWindProbabilityThreshold | null;
  featureCount: number;
  stormCount: number;
  updatedAt: string;
}

const snapshots = new Map<string, TropicalWindProbabilityRuntimeSnapshot>();
const emptySnapshots = new Map<string, TropicalWindProbabilityRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: TropicalWindProbabilityRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(
  sceneId: string,
  channel: TropicalWindProbabilityRuntimeChannel,
): TropicalWindProbabilityRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: TropicalWindProbabilityRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    thresholdKnots: null,
    featureCount: 0,
    stormCount: 0,
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishTropicalWindProbabilityRuntime(
  sceneId: string,
  patch: Partial<TropicalWindProbabilityRuntimeSnapshot>,
  channel: TropicalWindProbabilityRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  snapshots.set(key, { ...previous, ...patch, sceneId });
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearTropicalWindProbabilityRuntime(
  sceneId: string,
  channel: TropicalWindProbabilityRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getTropicalWindProbabilityRuntimeSnapshot(
  sceneId: string,
  channel: TropicalWindProbabilityRuntimeChannel = 'operator',
): TropicalWindProbabilityRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeTropicalWindProbabilityRuntime(
  sceneId: string,
  listener: () => void,
  channel: TropicalWindProbabilityRuntimeChannel = 'operator',
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

export function useTropicalWindProbabilityRuntime(
  sceneId: string,
  channel: TropicalWindProbabilityRuntimeChannel = 'operator',
): TropicalWindProbabilityRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeTropicalWindProbabilityRuntime(sceneId, listener, channel),
    () => getTropicalWindProbabilityRuntimeSnapshot(sceneId, channel),
    () => getTropicalWindProbabilityRuntimeSnapshot(sceneId, channel),
  );
}
