import { useCallback, useMemo, useState } from 'react';
import type { ModuleProviderContribution } from '../types/module';

export type ProviderId = string;
export type ProviderState = 'idle' | 'loading' | 'online' | 'degraded' | 'offline';

export interface ProviderHealth {
  id: ProviderId;
  label: string;
  state: ProviderState;
  message: string;
  updatedAt: string;
  cacheStatus?: string;
}

function createProviderHealth(definitions: ModuleProviderContribution[]): Record<ProviderId, ProviderHealth> {
  return Object.fromEntries(definitions.map(({ id, label }) => [id, {
    id,
    label,
    state: 'idle' as const,
    message: '',
    updatedAt: '',
  }])) as Record<ProviderId, ProviderHealth>;
}

export function useProviderHealthStore(definitions: ModuleProviderContribution[]) {
  const [providers, setProviders] = useState<Record<ProviderId, ProviderHealth>>(
    () => createProviderHealth(definitions),
  );

  const reportProviderStatus = useCallback((
    id: ProviderId,
    state: ProviderState,
    message = '',
    cacheStatus?: string,
  ) => {
    setProviders((current) => {
      const previous = current[id] ?? {
        id,
        label: definitions.find((definition) => definition.id === id)?.label ?? id,
        state: 'idle' as const,
        message: '',
        updatedAt: '',
      };
      const normalizedMessage = message.trim();
      if (previous.state === state && previous.message === normalizedMessage && previous.cacheStatus === cacheStatus) {
        return current;
      }
      return {
        ...current,
        [id]: {
          ...previous,
          state,
          message: normalizedMessage,
          cacheStatus,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, [definitions]);

  const providerIssues = useMemo(
    () => Object.values(providers).filter((provider) => provider.state === 'degraded' || provider.state === 'offline'),
    [providers],
  );
  const overallState = useMemo<'online' | 'warning' | 'offline'>(() => {
    if (providers.basemap?.state === 'offline') return 'offline';
    if (providerIssues.length > 0) return 'warning';
    return 'online';
  }, [providerIssues.length, providers.basemap?.state]);

  return { providers, providerIssues, overallState, reportProviderStatus };
}
