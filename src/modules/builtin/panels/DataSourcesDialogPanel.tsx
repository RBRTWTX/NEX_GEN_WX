import { useWeatherData } from '../../../data/weather-data-context';

function formatUpdated(value: string): string {
  if (!value) return 'not requested';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : value;
}

export function DataSourcesDialogPanel() {
  const { providers, providerIssues, refreshAlerts, refreshObservations } = useWeatherData();
  return (
    <div className="source-status-panel">
      <header>
        <div><h3>Native Data Engine</h3><p>Provider health is operator-only and never appears in clean output or PNG exports.</p></div>
        <div className="source-status-actions">
          <button type="button" onClick={() => void refreshAlerts(true)}>Refresh alerts</button>
          <button type="button" onClick={() => refreshObservations(true)}>Refresh observations</button>
        </div>
      </header>
      <div className="source-status-list">
        {Object.values(providers).map((provider) => (
          <article key={provider.id} className={`source-status-row state-${provider.state}`}>
            <i aria-hidden="true" />
            <div>
              <strong>{provider.label}</strong>
              <span>{provider.message || (provider.state === 'idle' ? 'Waiting for this layer to be requested' : 'Operating normally')}</span>
              <span className="source-status-meta">Updated: {formatUpdated(provider.updatedAt)}{provider.cacheStatus ? ` · ${provider.cacheStatus}` : ''}</span>
            </div>
            <small>{provider.state.toUpperCase()}</small>
          </article>
        ))}
      </div>
      {providerIssues.length === 0 && <p className="source-status-ok">All requested providers are operating normally.</p>}
    </div>
  );
}
