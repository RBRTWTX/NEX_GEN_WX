import { useWeatherData } from '../data/weather-data-context';
import { SceneObject } from '../scene-editing/SceneObject';

function formatNumber(value: number | null, suffix = '', digits = 0): string {
  return value == null ? '--' : `${value.toFixed(digits)}${suffix}`;
}

function formatObserved(value: string): string {
  if (!value) return 'Observation time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function compassDirection(degrees: number | null): string {
  if (degrees == null) return '--';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

export function ObservationCallout({ interactive }: { interactive: boolean }) {
  const { selectedObservation, setSelectedObservation } = useWeatherData();
  if (!selectedObservation) return null;
  const wind = selectedObservation.windMph == null
    ? '--'
    : `${compassDirection(selectedObservation.windDirection)} ${Math.round(selectedObservation.windMph)} mph`;
  return (
    <SceneObject as="aside" elementId="map.observation.callout" label="Observation callout" kind="container" className="observation-callout" aria-label={`Observation at ${selectedObservation.station}`}>
      <div className="observation-callout__topline">
        <div>
          <small>SURFACE OBSERVATION</small>
          <strong>{selectedObservation.station}</strong>
        </div>
        {interactive && <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedObservation(null); }} aria-label="Close observation">×</button>}
      </div>
      <time>{formatObserved(selectedObservation.observed)}</time>
      <div className="observation-callout__primary">
        <span>{formatNumber(selectedObservation.tempF, '°')}</span>
        <div>
          <b>Dew point {formatNumber(selectedObservation.dewpointF, '°')}</b>
          <b>Humidity {formatNumber(selectedObservation.relativeHumidity, '%')}</b>
        </div>
      </div>
      <dl className="observation-callout__grid">
        <div><dt>Wind</dt><dd>{wind}</dd></div>
        <div><dt>Gust</dt><dd>{formatNumber(selectedObservation.gustMph, ' mph')}</dd></div>
        <div><dt>Heat index</dt><dd>{formatNumber(selectedObservation.heatIndexF, '°')}</dd></div>
        <div><dt>Wind chill</dt><dd>{formatNumber(selectedObservation.windChillF, '°')}</dd></div>
        <div><dt>Visibility</dt><dd>{formatNumber(selectedObservation.visibilityMi, ' mi', selectedObservation.visibilityMi != null && selectedObservation.visibilityMi < 3 ? 1 : 0)}</dd></div>
        <div><dt>Altimeter</dt><dd>{formatNumber(selectedObservation.altimeterInHg, ' inHg', 2)}</dd></div>
      </dl>
      {(selectedObservation.weather || selectedObservation.flightCategory) && (
        <div className="observation-callout__weather">
          {selectedObservation.flightCategory && <span>{selectedObservation.flightCategory}</span>}
          <p>{selectedObservation.weather || 'No significant weather reported'}</p>
        </div>
      )}
      {selectedObservation.raw && <p className="observation-callout__raw">{selectedObservation.raw}</p>}
    </SceneObject>
  );
}
