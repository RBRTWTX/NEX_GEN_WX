import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useWeatherData } from '../data/weather-data-context';
import type {
  CameraState,
  MapSample,
  MapScene,
} from '../types/domain';
import { MapControllerHost, type MapControllerCallbacks } from './controllers';

interface MapStageProps {
  scene: MapScene;
  interactive: boolean;
  onCameraChange?: (camera: CameraState) => void;
  onAddSample?: (sample: Omit<MapSample, 'id' | 'createdAt'>) => void;
  onRemoveSample?: (sampleId: string) => void;
  onRenderReady?: () => void;
}

export function MapStage({
  scene,
  interactive,
  onCameraChange,
  onAddSample,
  onRemoveSample,
  onRenderReady,
}: MapStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<MapControllerHost | null>(null);
  const onRenderReadyRef = useRef(onRenderReady);
  onRenderReadyRef.current = onRenderReady;
  const {
    alerts,
    selectedAlertId,
    setSelectedAlertId,
    refreshAlerts,
    selectedObservation,
    setSelectedObservation,
    observationRefresh,
    reportProviderStatus,
  } = useWeatherData();

  const callbacks: MapControllerCallbacks = {
    onCameraChange,
    onAddSample,
    onRemoveSample,
    setSelectedAlertId,
    setSelectedObservation,
    refreshAlerts,
    reportProviderStatus,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    container.dataset.renderReady = 'false';
    const host = new MapControllerHost({
      scene,
      interactive,
      callbacks,
      alerts: alerts.data,
      selectedAlertId,
      selectedObservation,
      onRenderReady: () => {
        if (containerRef.current) containerRef.current.dataset.renderReady = 'true';
        onRenderReadyRef.current?.();
      },
    });
    hostRef.current = host;
    host.mount(container);
    return () => {
      host.destroy();
      if (hostRef.current === host) hostRef.current = null;
    };
    // The remaining effects update the mounted host without rebuilding MapLibre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  useEffect(() => {
    hostRef.current?.updateCallbacks(callbacks);
  }, [onCameraChange, onAddSample, onRemoveSample, refreshAlerts, reportProviderStatus, setSelectedAlertId, setSelectedObservation]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.dataset.renderReady = 'false';
    hostRef.current?.updateScene(scene);
  }, [scene]);

  useEffect(() => {
    hostRef.current?.updateAlerts(alerts.data);
  }, [alerts.data]);

  useEffect(() => {
    hostRef.current?.updateSelectedAlert(selectedAlertId);
  }, [selectedAlertId]);

  useEffect(() => {
    hostRef.current?.updateSelectedObservation(selectedObservation);
  }, [selectedObservation]);

  useEffect(() => {
    if (observationRefresh.token === 0) return;
    hostRef.current?.refreshObservations(observationRefresh.force);
  }, [observationRefresh]);

  return (
    <div
      className="map-stage"
      ref={containerRef}
      data-product={scene.product.id}
      data-basemap={scene.baseMap}
      data-render-ready="false"
      aria-label="Interactive weather map"
    />
  );
}
