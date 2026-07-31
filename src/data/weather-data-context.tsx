import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { AlertSummary, ObservationSummary } from '../types/domain';
import { useModuleRegistry } from '../modules/module-context';
import { useAlertsStore, type AlertsState } from './alerts-store';
import { useCrossWindowWeatherState, type ObservationRefreshState } from './cross-window-weather-state';
import {
  useProviderHealthStore,
  type ProviderHealth,
  type ProviderId,
  type ProviderState,
} from './provider-health-store';

export type { ProviderHealth, ProviderId, ProviderState } from './provider-health-store';
export { summarizeObservation } from './observation-summary';

interface WeatherDataContextValue {
  alerts: AlertsState;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  refreshAlerts: (force?: boolean) => Promise<void>;
  selectedObservation: ObservationSummary | null;
  setSelectedObservation: (observation: ObservationSummary | null) => void;
  observationRefresh: ObservationRefreshState;
  refreshObservations: (force?: boolean) => void;
  providers: Record<ProviderId, ProviderHealth>;
  providerIssues: ProviderHealth[];
  overallState: 'online' | 'warning' | 'offline';
  reportProviderStatus: (
    id: ProviderId,
    state: ProviderState,
    message?: string,
    cacheStatus?: string,
  ) => void;
}

const WeatherDataContext = createContext<WeatherDataContextValue | null>(null);

export function WeatherDataProvider({ children }: { children: ReactNode }) {
  const registry = useModuleRegistry();
  const providerDefinitions = useMemo(() => registry.getProviders(), [registry]);
  const providerStore = useProviderHealthStore(providerDefinitions);
  const crossWindow = useCrossWindowWeatherState();

  const validateAlertSelection = useCallback((summaries: AlertSummary[]) => {
    if (crossWindow.selectedAlertId && !summaries.some((alert) => alert.id === crossWindow.selectedAlertId)) {
      crossWindow.setSelectedAlertId(null);
    }
  }, [crossWindow.selectedAlertId, crossWindow.setSelectedAlertId]);

  const { alerts, refreshAlerts } = useAlertsStore(
    providerStore.reportProviderStatus,
    validateAlertSelection,
  );

  useEffect(() => {
    void refreshAlerts(false);
    const timer = window.setInterval(() => void refreshAlerts(false), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshAlerts]);

  useEffect(() => {
    const isOutputWindow = new URLSearchParams(window.location.search).get('window') === 'output';
    if (isOutputWindow) return undefined;
    const timer = window.setInterval(() => crossWindow.refreshObservations(false), 60_000);
    return () => window.clearInterval(timer);
  }, [crossWindow.refreshObservations]);

  const value = useMemo<WeatherDataContextValue>(() => ({
    alerts,
    selectedAlertId: crossWindow.selectedAlertId,
    setSelectedAlertId: crossWindow.setSelectedAlertId,
    refreshAlerts,
    selectedObservation: crossWindow.selectedObservation,
    setSelectedObservation: crossWindow.setSelectedObservation,
    observationRefresh: crossWindow.observationRefresh,
    refreshObservations: crossWindow.refreshObservations,
    providers: providerStore.providers,
    providerIssues: providerStore.providerIssues,
    overallState: providerStore.overallState,
    reportProviderStatus: providerStore.reportProviderStatus,
  }), [
    alerts,
    crossWindow.observationRefresh,
    crossWindow.refreshObservations,
    crossWindow.selectedAlertId,
    crossWindow.selectedObservation,
    crossWindow.setSelectedAlertId,
    crossWindow.setSelectedObservation,
    providerStore.overallState,
    providerStore.providerIssues,
    providerStore.providers,
    providerStore.reportProviderStatus,
    refreshAlerts,
  ]);

  return <WeatherDataContext.Provider value={value}>{children}</WeatherDataContext.Provider>;
}

export function useWeatherData(): WeatherDataContextValue {
  const value = useContext(WeatherDataContext);
  if (!value) throw new Error('useWeatherData must be used inside WeatherDataProvider');
  return value;
}
