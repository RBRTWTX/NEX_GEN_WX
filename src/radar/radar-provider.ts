import { fetchRadarMrmsCatalog, fetchRadarSiteCatalog as invokeRadarSiteCatalog, fetchRadarSites } from '../engine/tauri-commands';
import type { RadarCatalog, RadarFrame, RadarProductId, RadarSite } from './radar-types';
import { iemProductCode } from './radar-types';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function rootMetadata(value: unknown): Pick<RadarCatalog, 'cacheStatus' | 'cacheWarning'> {
  const object = asObject(value);
  return {
    cacheStatus: typeof object?.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object?.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}

function formatFrame(epochMs: number, timestamp: string): RadarFrame {
  const date = new Date(epochMs);
  return {
    id: timestamp,
    validTime: date.toISOString(),
    label: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(date),
    timestamp,
    epochMs,
  };
}

function collectEpochTimes(value: unknown, key = '', output = new Set<number>()): Set<number> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEpochTimes(item, key, output));
    return output;
  }
  const object = asObject(value);
  if (object) {
    for (const [childKey, child] of Object.entries(object)) collectEpochTimes(child, childKey, output);
    return output;
  }
  const normalizedKey = key.toLowerCase();
  const number = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(number) && number > 1_000_000_000_000 && /valid|time|date/.test(normalizedKey)) {
    output.add(Math.round(number));
  }
  return output;
}

function collectTimestamps(value: unknown, key = '', output = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const compact = value.match(/(?:^|\D)(20\d{10})(?:\D|$)/)?.[1];
    if (compact) output.add(compact);
    const normalizedKey = key.toLowerCase();
    if (/time|date|valid|scan|timestamp|^ts$/.test(normalizedKey)) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        const date = new Date(parsed);
        const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}`;
        output.add(stamp);
      }
    }
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectTimestamps(item, key, output));
    return output;
  }
  const object = asObject(value);
  if (object) {
    for (const [childKey, child] of Object.entries(object)) collectTimestamps(child, childKey, output);
  }
  return output;
}

function timestampToEpoch(timestamp: string): number {
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  return Date.UTC(year, month - 1, day, hour, minute);
}

function radarIdFromObject(value: JsonObject): string | null {
  for (const key of ['id', 'radar', 'station', 'sid', 'site', 'nexrad']) {
    const candidate = String(value[key] ?? '').trim().toUpperCase().replace(/^K(?=[A-Z]{3}$)/, '');
    if (/^[A-Z0-9]{3,4}$/.test(candidate)) return candidate;
  }
  return null;
}

function collectSites(
  value: unknown,
  output = new Map<string, RadarSite>(),
  parentKey = '',
): Map<string, RadarSite> {
  if (typeof value === 'string') {
    const siteBearingKey = /radar|site|station|nexrad|available|^id$|^sid$/i.test(parentKey);
    if (!siteBearingKey) return output;
    const id = value.trim().toUpperCase().replace(/^K(?=[A-Z]{3}$)/, '');
    if (/^[A-Z0-9]{3,4}$/.test(id) && id !== 'USCOMP' && !output.has(id)) {
      output.set(id, { id, label: id, distanceKm: null });
    }
    return output;
  }
  if (Array.isArray(value)) {
    const itemKey = parentKey || 'radars';
    value.forEach((item) => collectSites(item, output, itemKey));
    return output;
  }
  const object = asObject(value);
  if (!object) return output;
  const id = radarIdFromObject(object);
  if (id && id !== 'USCOMP') {
    const labelValue = object.name ?? object.label ?? object.station_name ?? object.site_name;
    const distanceKmValue = object.distance_km ?? object.distanceKm;
    const distanceMilesValue = object.distance_miles ?? object.distanceMiles;
    const distanceKm = Number(distanceKmValue);
    const distanceMiles = Number(distanceMilesValue);
    const distance = Number.isFinite(distanceKm)
      ? distanceKm
      : Number.isFinite(distanceMiles) ? distanceMiles * 1.609344 : Number.NaN;
    output.set(id, {
      id,
      label: typeof labelValue === 'string' && labelValue.trim() ? `${id} · ${labelValue.trim()}` : id,
      distanceKm: Number.isFinite(distance) ? distance : null,
    });
  }
  for (const [childKey, child] of Object.entries(object)) collectSites(child, output, childKey);
  return output;
}

function utcQueryTime(date: Date): string {
  return date.toISOString().slice(0, 16) + 'Z';
}

export async function fetchMrmsRadarCatalog(frameCount: number, force = false): Promise<RadarCatalog> {
  const raw = await fetchRadarMrmsCatalog(force);
  const object = asObject(raw);
  const query = object?.query ?? raw;
  const metadata = object?.metadata ?? raw;
  let times = [...collectEpochTimes(query)].sort((a, b) => a - b);
  if (!times.length) {
    const extent = asObject(metadata)?.timeInfo;
    const extentValues = asObject(extent)?.timeExtent;
    if (Array.isArray(extentValues) && extentValues.length >= 2) {
      const end = Number(extentValues[1]);
      if (Number.isFinite(end)) times = [end];
    }
  }
  const selected = times.slice(-Math.max(1, Math.min(24, Math.round(frameCount))));
  return {
    provider: 'noaa-mrms', mode: 'national', product: 'mrms-base-reflectivity', sites: [],
    frames: selected.map((epoch) => formatFrame(epoch, String(epoch))),
    generatedAt: new Date().toISOString(),
    ...rootMetadata(raw),
  };
}

export async function fetchAvailableRadarSites(
  latitude: number,
  longitude: number,
  force = false,
): Promise<RadarSite[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('A valid map center is required to select a radar site.');
  }
  const raw = await fetchRadarSites(latitude, longitude, utcQueryTime(new Date()), force);
  const sites = [...collectSites(raw).values()];
  if (!sites.some((site) => site.distanceKm != null)) return sites;
  return sites.sort((left, right) => {
    if (left.distanceKm == null) return 1;
    if (right.distanceKm == null) return -1;
    return left.distanceKm - right.distanceKm;
  });
}

export async function fetchSiteRadarCatalog(
  site: string,
  product: RadarProductId,
  frameCount: number,
  force = false,
): Promise<RadarCatalog> {
  const normalizedSite = site.trim().toUpperCase().replace(/^K(?=[A-Z]{3}$)/, '');
  if (!/^[A-Z0-9]{3,4}$/.test(normalizedSite)) throw new Error('A valid NEXRAD site identifier is required.');
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 60_000);
  const raw = await invokeRadarSiteCatalog(
    normalizedSite,
    iemProductCode(product),
    utcQueryTime(start),
    utcQueryTime(end),
    force,
  );
  const timestamps = [...collectTimestamps(raw)]
    .filter((timestamp) => Number.isFinite(timestampToEpoch(timestamp)))
    .sort()
    .slice(-Math.max(1, Math.min(24, Math.round(frameCount))));
  const frames = timestamps.map((timestamp) => formatFrame(timestampToEpoch(timestamp), timestamp));
  if (!frames.length) {
    frames.push({
      id: `${normalizedSite}-${iemProductCode(product)}-latest`,
      validTime: new Date().toISOString(),
      label: 'Latest',
      timestamp: '0',
      epochMs: null,
    });
  }
  return {
    provider: 'iem-nexrad', mode: 'site', product,
    sites: [{ id: normalizedSite, label: normalizedSite, distanceKm: null }],
    frames,
    generatedAt: new Date().toISOString(),
    ...rootMetadata(raw),
  };
}

export function mrmsTileUrl(epochMs: number | null): string {
  const time = epochMs == null ? '' : `&time=${Math.round(epochMs)}`;
  return 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/'
    + 'radar_base_reflectivity_time/ImageServer/exportImage'
    + '?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256'
    + `&format=png32&transparent=true&f=image${time}`;
}

export function iemRadarTileUrl(site: string, productCode: string, timestamp: string): string {
  const normalizedTimestamp = /^\d{12}$/.test(timestamp) ? timestamp : '0';
  return 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/'
    + `ridge::${site}-${productCode}-${normalizedTimestamp}/{z}/{x}/{y}.png`;
}
