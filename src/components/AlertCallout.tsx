import { useWeatherData } from '../data/weather-data-context';
import { SceneObject } from '../scene-editing/SceneObject';

export function AlertCallout() {
  const { alerts, selectedAlertId, setSelectedAlertId } = useWeatherData();
  const alert = alerts.summaries.find((item) => item.id === selectedAlertId);
  if (!alert) return null;
  return (
    <SceneObject as="aside" elementId="map.alert.callout" label="Alert callout" kind="container" className="alert-callout">
      <button type="button" className="alert-callout__close" onClick={(event) => { event.stopPropagation(); setSelectedAlertId(null); }} aria-label="Close alert details">×</button>
      <small>{alert.severity} · {alert.urgency}</small>
      <strong>{alert.event}</strong>
      <span>{alert.areaDesc}</span>
      {alert.headline && <p>{alert.headline}</p>}
      {!alert.hasGeometry && <em>This alert has no polygon geometry in the active NWS feed.</em>}
    </SceneObject>
  );
}
