import { useEffect, useState, type FormEvent } from 'react';

interface TopBarProps {
  studioName: string;
  projectName: string;
  dataState: 'online' | 'warning' | 'offline';
  mapPosition: string;
  outputStatus: 'closed' | 'syncing' | 'ready' | 'degraded';
  outputDetail: string;
  leftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onSearch: (query: string) => void;
  onHome: () => void;
  onOpenProducts: () => void;
  onOpenShow: () => void;
  onOpenModelLab: () => void;
  onOpenSources: () => void;
  onOpenSettings: () => void;
  onPresent: () => void;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
}

export function TopBar(props: TopBarProps) {
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = query.trim();
    if (value) props.onSearch(value);
  }

  return (
    <header className="app-topbar">
      <div className="app-title-group">
        <button
          type="button"
          className="icon-button menu-button"
          title={props.leftPanelOpen ? 'Hide scene library' : 'Show scene library'}
          aria-label={props.leftPanelOpen ? 'Hide scene library' : 'Show scene library'}
          onClick={props.onToggleLeftPanel}
        >
          ☰
        </button>
        <div>
          <strong>{props.studioName}</strong>
          <span>{props.projectName} ·</span>
        </div>
      </div>

      <div className="topbar-center">
        <form className="global-search-wrap" onSubmit={submit}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search any U.S. city or town…"
            autoComplete="off"
            aria-label="Search any U.S. city or town"
          />
        </form>
        <span className={`status-pill ${props.dataState}`}>
          {props.dataState === 'online' ? 'DATA ONLINE' : props.dataState === 'warning' ? 'DATA DEGRADED' : 'DATA OFFLINE'}
        </span>
        <span className="clock-label">{clock}</span>
        <span className="map-position-label">{props.mapPosition}</span>
      </div>

      <nav className="top-actions" aria-label="Application actions">
        <button type="button" className="top-action" onClick={props.onHome}>Home</button>
        <button type="button" className="top-action" onClick={props.onOpenProducts}>Products</button>
        <button type="button" className="top-action" onClick={props.onOpenShow}>Show</button>
        <button type="button" className="top-action" onClick={props.onOpenModelLab}>Model Lab</button>
        <button type="button" className="top-action" onClick={props.onOpenSources}>Sources</button>
        <button type="button" className="top-action" onClick={props.onOpenSettings}>Settings</button>
        <button
          type="button"
          className={`top-action accent output-${props.outputStatus}`}
          title={props.outputDetail}
          onClick={props.onPresent}
        >{props.outputStatus === 'ready' ? 'Output Ready' : props.outputStatus === 'syncing' ? 'Syncing…' : 'Present'}</button>
      </nav>
    </header>
  );
}
