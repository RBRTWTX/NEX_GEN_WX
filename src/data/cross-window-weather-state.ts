import { useCallback, useEffect, useState } from 'react';
import type { ObservationSummary } from '../types/domain';

export interface ObservationRefreshState {
  token: number;
  force: boolean;
}

const SELECTED_ALERT_KEY = 'nex-gen-wx-selected-alert-id';
const SELECTED_ALERT_EVENT = 'nex-gen-wx-selected-alert-change';
const SELECTED_OBSERVATION_KEY = 'nex-gen-wx-selected-observation';
const SELECTED_OBSERVATION_EVENT = 'nex-gen-wx-selected-observation-change';
const OBSERVATION_REFRESH_KEY = 'nex-gen-wx-observation-refresh';
const OBSERVATION_REFRESH_EVENT = 'nex-gen-wx-observation-refresh-change';

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Cross-window state still works in the current window when storage is unavailable.
  }
}

function dispatchWindowEvent(name: string, detail: unknown): void {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch { /* current state is already updated */ }
}

function readStoredObservation(): ObservationSummary | null {
  try {
    const value = readStorage(SELECTED_OBSERVATION_KEY);
    return value ? JSON.parse(value) as ObservationSummary : null;
  } catch { return null; }
}

function readObservationRefresh(): ObservationRefreshState {
  try {
    const stored = readStorage(OBSERVATION_REFRESH_KEY);
    if (!stored) return { token: 0, force: false };
    const value = JSON.parse(stored) as Partial<ObservationRefreshState>;
    return { token: Number.isFinite(Number(value.token)) ? Number(value.token) : 0, force: Boolean(value.force) };
  } catch { return { token: 0, force: false }; }
}

export function useCrossWindowWeatherState() {
  const [selectedAlertId, setSelectedAlertIdState] = useState<string | null>(() => readStorage(SELECTED_ALERT_KEY));
  const [selectedObservation, setSelectedObservationState] = useState<ObservationSummary | null>(readStoredObservation);
  const [observationRefresh, setObservationRefresh] = useState<ObservationRefreshState>(readObservationRefresh);

  const setSelectedAlertId = useCallback((id: string | null) => {
    setSelectedAlertIdState(id);
    writeStorage(SELECTED_ALERT_KEY, id);
    dispatchWindowEvent(SELECTED_ALERT_EVENT, id);
  }, []);

  const setSelectedObservation = useCallback((observation: ObservationSummary | null) => {
    setSelectedObservationState(observation);
    writeStorage(SELECTED_OBSERVATION_KEY, observation ? JSON.stringify(observation) : null);
    dispatchWindowEvent(SELECTED_OBSERVATION_EVENT, observation);
  }, []);

  const refreshObservations = useCallback((force = false) => {
    const value = { token: Date.now(), force };
    setObservationRefresh(value);
    writeStorage(OBSERVATION_REFRESH_KEY, JSON.stringify(value));
    dispatchWindowEvent(OBSERVATION_REFRESH_EVENT, value);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SELECTED_ALERT_KEY) setSelectedAlertIdState(event.newValue);
      if (event.key === SELECTED_OBSERVATION_KEY) setSelectedObservationState(readStoredObservation());
      if (event.key === OBSERVATION_REFRESH_KEY) setObservationRefresh(readObservationRefresh());
    };
    const onAlertChange = (event: Event) => setSelectedAlertIdState((event as CustomEvent<string | null>).detail ?? null);
    const onObservationChange = (event: Event) => setSelectedObservationState((event as CustomEvent<ObservationSummary | null>).detail ?? null);
    const onObservationRefresh = (event: Event) => setObservationRefresh(
      (event as CustomEvent<ObservationRefreshState>).detail ?? { token: Date.now(), force: false },
    );
    window.addEventListener('storage', onStorage);
    window.addEventListener(SELECTED_ALERT_EVENT, onAlertChange);
    window.addEventListener(SELECTED_OBSERVATION_EVENT, onObservationChange);
    window.addEventListener(OBSERVATION_REFRESH_EVENT, onObservationRefresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SELECTED_ALERT_EVENT, onAlertChange);
      window.removeEventListener(SELECTED_OBSERVATION_EVENT, onObservationChange);
      window.removeEventListener(OBSERVATION_REFRESH_EVENT, onObservationRefresh);
    };
  }, []);

  return {
    selectedAlertId,
    setSelectedAlertId,
    selectedObservation,
    setSelectedObservation,
    observationRefresh,
    refreshObservations,
  };
}
