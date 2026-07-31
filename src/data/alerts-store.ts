import { useCallback, useState } from 'react';
import { fetchActiveAlerts } from '../engine/tauri-commands';
import type { AlertSummary, GeoJsonFeature, GeoJsonFeatureCollection } from '../types/domain';
import type { ProviderId, ProviderState } from './provider-health-store';

export interface AlertsState {
  data: GeoJsonFeatureCollection;
  summaries: AlertSummary[];
  loading: boolean;
  error: string;
  updatedAt: string;
}

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cleanError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^Error:\s*/i, '')
    .replace(/^weather provider request failed:\s*/i, '')
    .replace(/^provider returned an error:\s*/i, '')
    .trim();
}

function summarizeAlert(feature: GeoJsonFeature, index: number): AlertSummary {
  const properties = feature.properties ?? {};
  const id = text(properties.ngwsId) || (feature.id == null ? '' : String(feature.id)) || `nws-alert-${index}`;
  return {
    id,
    event: text(properties.event) || 'Weather Alert',
    headline: text(properties.headline),
    areaDesc: text(properties.areaDesc),
    severity: text(properties.severity) || 'Unknown',
    urgency: text(properties.urgency) || 'Unknown',
    certainty: text(properties.certainty) || 'Unknown',
    sent: text(properties.sent),
    effective: text(properties.effective),
    expires: text(properties.expires),
    description: text(properties.description),
    instruction: text(properties.instruction),
    hasGeometry: Boolean(feature.geometry),
  };
}

export function useAlertsStore(
  reportProviderStatus: (
    id: ProviderId,
    state: ProviderState,
    message?: string,
    cacheStatus?: string,
  ) => void,
  onSelectionValidation: (summaries: AlertSummary[]) => void,
) {
  const [alerts, setAlerts] = useState<AlertsState>({
    data: EMPTY_COLLECTION,
    summaries: [],
    loading: false,
    error: '',
    updatedAt: '',
  });

  const refreshAlerts = useCallback(async (force = false) => {
    setAlerts((current) => ({ ...current, loading: true, error: '' }));
    reportProviderStatus('alerts', 'loading', 'Refreshing active alerts');
    try {
      const data = await fetchActiveAlerts(force);
      const summaries = data.features.map(summarizeAlert).sort((left, right) => left.event.localeCompare(right.event));
      const stale = data.cacheStatus === 'stale';
      const warning = stale ? String(data.cacheWarning ?? 'Live alert request failed; using expired cached data.') : '';
      setAlerts({
        data,
        summaries,
        loading: false,
        error: warning,
        updatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
      });
      reportProviderStatus('alerts', stale ? 'degraded' : 'online', warning, String(data.cacheStatus ?? 'live'));
      onSelectionValidation(summaries);
    } catch (error) {
      const message = cleanError(error);
      setAlerts((current) => ({ ...current, loading: false, error: message }));
      reportProviderStatus('alerts', 'offline', message);
    }
  }, [onSelectionValidation, reportProviderStatus]);

  return { alerts, refreshAlerts };
}
