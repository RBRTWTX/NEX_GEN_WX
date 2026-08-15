import { useSyncExternalStore } from 'react';
import type {
  SatelliteFrame,
  SatelliteProductId,
  SatelliteSource,
} from './satellite-types';

export type SatelliteRuntimeChannel = 'operator' | 'output' | 'export';

export interface SatelliteRuntimeSnapshot {
  sceneId: string;
  loading: boolean;
  error: string;
  provider: string;
  source: SatelliteSource;
  product: SatelliteProductId;
  frames: SatelliteFrame[];
  frameIndex: number;
  validTime: string;
  updatedAt: string;
}

const snapshots = new Map<string, SatelliteRuntimeSnapshot>();
const emptySnapshots = new Map<string, SatelliteRuntimeSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function runtimeKey(sceneId: string, channel: SatelliteRuntimeChannel): string {
  return `${channel}:${sceneId}`;
}

function emptySnapshot(sceneId: string, channel: SatelliteRuntimeChannel): SatelliteRuntimeSnapshot {
  const key = runtimeKey(sceneId, channel);
  const existing = emptySnapshots.get(key);
  if (existing) return existing;
  const snapshot: SatelliteRuntimeSnapshot = {
    sceneId,
    loading: false,
    error: '',
    provider: '',
    source: 'east',
    product: 'goes-infrared',
    frames: [],
    frameIndex: 0,
    validTime: '',
    updatedAt: '',
  };
  emptySnapshots.set(key, snapshot);
  return snapshot;
}

export function publishSatelliteRuntime(
  sceneId: string,
  patch: Partial<SatelliteRuntimeSnapshot>,
  channel: SatelliteRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const previous = snapshots.get(key) ?? emptySnapshot(sceneId, channel);
  const next: SatelliteRuntimeSnapshot = { ...previous, ...patch, sceneId };
  snapshots.set(key, next);
  listeners.get(key)?.forEach((listener) => listener());
}

export function clearSatelliteRuntime(
  sceneId: string,
  channel: SatelliteRuntimeChannel = 'operator',
): void {
  const key = runtimeKey(sceneId, channel);
  const changed = snapshots.delete(key);
  if (changed) listeners.get(key)?.forEach((listener) => listener());
}

export function getSatelliteRuntimeSnapshot(
  sceneId: string,
  channel: SatelliteRuntimeChannel = 'operator',
): SatelliteRuntimeSnapshot {
  return snapshots.get(runtimeKey(sceneId, channel)) ?? emptySnapshot(sceneId, channel);
}

export function subscribeSatelliteRuntime(
  sceneId: string,
  listener: () => void,
  channel: SatelliteRuntimeChannel = 'operator',
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

export function useSatelliteRuntime(
  sceneId: string,
  channel: SatelliteRuntimeChannel = 'operator',
): SatelliteRuntimeSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeSatelliteRuntime(sceneId, listener, channel),
    () => getSatelliteRuntimeSnapshot(sceneId, channel),
    () => getSatelliteRuntimeSnapshot(sceneId, channel),
  );
}