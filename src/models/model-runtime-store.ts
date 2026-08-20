import { useSyncExternalStore } from 'react';
import type { ModelFieldId, ModelId, ModelRun } from './model-types';

export type ModelRuntimeChannel = 'operator' | 'output' | 'export';

export interface ModelRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  model: ModelId;
  field: ModelFieldId;
  run: ModelRun | null;
  availableHours: number[];
  forecastHour: number;
  fieldReady: boolean;
  sampleCount: number;
  unit: string;
  updatedAt: string;
}

const snapshots = new Map<string, ModelRuntimeSnapshot>();
const emptySnapshots = new Map<string, ModelRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: ModelRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(sceneId: string, channel: ModelRuntimeChannel): ModelRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: ModelRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    model: 'hrrr',
    field: 'temperature-2m',
    run: null,
    availableHours: [],
    forecastHour: 0,
    fieldReady: false,
    sampleCount: 0,
    unit: '',
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishModelRuntime(
  sceneId: string,
  patch: Partial<ModelRuntimeSnapshot>,
  channel: ModelRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  const next: ModelRuntimeSnapshot = { ...previous, ...patch, sceneId };
  snapshots.set(key, next);
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearModelRuntime(
  sceneId: string,
  channel: ModelRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getModelRuntimeSnapshot(
  sceneId: string,
  channel: ModelRuntimeChannel = 'operator',
): ModelRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeModelRuntime(
  sceneId: string,
  listener: () => void,
  channel: ModelRuntimeChannel = 'operator',
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

export function useModelRuntime(
  sceneId: string,
  channel: ModelRuntimeChannel = 'operator',
): ModelRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeModelRuntime(sceneId, listener, channel),
    () => getModelRuntimeSnapshot(sceneId, channel),
    () => getModelRuntimeSnapshot(sceneId, channel),
  );
}
