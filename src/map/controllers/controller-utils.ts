import type { BBox, GeoJsonFeatureCollection } from '../../types/domain';
import type { ProviderId } from '../../data/weather-data-context';
import type { MapControllerContext } from './controller-types';

export function dynamicDataKey(bbox: BBox, zoom: number, extra = ''): string {
  return [
    bbox.west,
    bbox.south,
    bbox.east,
    bbox.north,
    Math.floor(zoom * 2) / 2,
    extra,
  ].join('|');
}

export function cleanProviderError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/^Error:\s*/i, '')
    .replace(/^weather provider request failed:\s*/i, '')
    .replace(/^provider returned an error:\s*/i, '')
    .trim();
}

export function isTransientMapLibreSignalRace(
  message: string,
  styleReady: boolean,
  remoteStylePending: boolean,
): boolean {
  return styleReady
    && !remoteStylePending
    && message.includes("Cannot read properties of undefined (reading 'signal')");
}

export function reportProviderFailure(
  context: MapControllerContext,
  provider: ProviderId,
  error: unknown,
): void {
  context.callbacks.reportProviderStatus(provider, 'offline', cleanProviderError(error));
}

export function reportProviderFreshness(
  context: MapControllerContext,
  provider: ProviderId,
  data: GeoJsonFeatureCollection,
): void {
  const warning = typeof data.cacheWarning === 'string' ? data.cacheWarning.trim() : '';
  if (data.cacheStatus === 'stale' || warning) {
    context.callbacks.reportProviderStatus(
      provider,
      'degraded',
      warning || 'Using expired cached data',
      String(data.cacheStatus ?? 'partial'),
    );
    return;
  }
  context.callbacks.reportProviderStatus(provider, 'online', '', String(data.cacheStatus ?? 'live'));
}

export function isRequestCurrent(
  context: MapControllerContext,
  styleGeneration: number,
  requestEpoch: number,
  currentEpoch: number,
): boolean {
  return context.isStyleReady()
    && context.styleGeneration === styleGeneration
    && requestEpoch === currentEpoch;
}
