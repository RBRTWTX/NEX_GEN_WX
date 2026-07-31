import { useMemo, useState } from 'react';
import { useWeatherData } from '../data/weather-data-context';

export function AlertsPanel() {
  const { alerts, selectedAlertId, setSelectedAlertId, refreshAlerts } = useWeatherData();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return alerts.summaries;
    return alerts.summaries.filter((alert) =>
      `${alert.event} ${alert.areaDesc} ${alert.headline}`.toLowerCase().includes(needle),
    );
  }, [alerts.summaries, query]);

  return (
    <section className="module-card module-card--alerts">
      <div className="module-card__heading"><strong>Active alert list</strong><span>{alerts.summaries.length}</span></div>
      <div className="alert-list-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter alerts" />
        <button type="button" onClick={() => void refreshAlerts(true)} disabled={alerts.loading}>{alerts.loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {alerts.error && <p className="data-error">{alerts.error}</p>}
      <div className="alert-list">
        {filtered.slice(0, 80).map((alert) => (
          <button
            type="button"
            key={alert.id}
            className={alert.id === selectedAlertId ? 'is-selected' : ''}
            onClick={() => setSelectedAlertId(alert.id)}
          >
            <strong>{alert.event}</strong>
            <span>{alert.areaDesc}</span>
            <small>{alert.severity}{alert.hasGeometry ? '' : ' · no polygon'}</small>
          </button>
        ))}
        {!alerts.loading && filtered.length === 0 && <p>No matching active alerts.</p>}
      </div>
    </section>
  );
}
