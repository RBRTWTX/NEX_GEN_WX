import { fetchSatelliteCatalog as fetchNoaaGeoColorCatalog } from '../engine/tauri-commands';
import type { BBox } from '../types/domain';
import type {
  SatelliteCatalog,
  SatelliteFrame,
  SatelliteProductId,
  SatelliteSource,
} from './satellite-types';

type JsonObject = Record<string, unknown>;

const IEM_CHANNEL: Record<Exclude<SatelliteProductId, 'goes-geocolor'>, string> = {
  'goes-visible': '02',
  'goes-infrared': '13',
  'goes-water-vapor': '09',
};

const IEM_ARCHIVE_PRODUCT: Record<Exclude<SatelliteProductId, 'goes-geocolor'>, 'VIS' | 'IR' | 'WV'> = {
  'goes-visible': 'VIS',
  'goes-infrared': 'IR',
  'goes-water-vapor': 'WV',
};

const IEM_ARCHIVE_INTERVAL_MS = 15 * 60_000;
const NOAA_GEOCOLOR_SERVICE = 'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/'
  + 'MERGEDGC_Last_24hr/ImageServer';

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function formatFrame(epochMs: number, mode: SatelliteFrame['mode']): SatelliteFrame {
  const date = new Date(epochMs);
  return {
    id: `${mode}-${epochMs}`,
    validTime: date.toISOString(),
    label: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date),
    epochMs,
    mode,
  };
}

function latestFrame(): SatelliteFrame {
  const now = Date.now();
  return {
    id: 'latest',
    validTime: new Date(now).toISOString(),
    label: 'Latest',
    epochMs: null,
    mode: 'latest-tile',
  };
}

function generatedArchiveFrames(frameCount: number, now = Date.now()): SatelliteFrame[] {
  const count = Math.max(1, Math.min(24, Math.round(frameCount)));
  const latestSlot = Math.floor(now / IEM_ARCHIVE_INTERVAL_MS) * IEM_ARCHIVE_INTERVAL_MS;
  const historyCount = Math.max(0, count - 1);
  const frames: SatelliteFrame[] = [];
  for (let index = historyCount; index >= 1; index -= 1) {
    frames.push(formatFrame(latestSlot - index * IEM_ARCHIVE_INTERVAL_MS, 'archive-image'));
  }
  frames.push(latestFrame());
  return frames;
}

function collectEpochTimes(value: unknown, key = '', output = new Set<number>()): Set<number> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEpochTimes(item, key, output));
    return output;
  }
  const object = asObject(value);
  if (object) {
    for (const [childKey, child] of Object.entries(object)) {
      collectEpochTimes(child, childKey, output);
    }
    return output;
  }
  const normalizedKey = key.toLowerCase();
  const number = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(number) && number > 1_000_000_000_000 && /start|end|time|date/.test(normalizedKey)) {
    output.add(Math.round(number));
  }
  return output;
}

function rootMetadata(value: unknown): Pick<SatelliteCatalog, 'cacheStatus' | 'cacheWarning'> {
  const object = asObject(value);
  return {
    cacheStatus: typeof object?.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object?.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}

export async function fetchSatelliteFrameCatalog(
  source: SatelliteSource,
  product: SatelliteProductId,
  frameCount: number,
  force = false,
): Promise<SatelliteCatalog> {
  if (product !== 'goes-geocolor') {
    return {
      provider: 'iem-goes',
      source,
      product,
      frames: generatedArchiveFrames(frameCount),
      generatedAt: new Date().toISOString(),
      cacheStatus: 'live',
    };
  }

  const raw = await fetchNoaaGeoColorCatalog(force);
  const object = asObject(raw);
  const query = object?.query ?? raw;
  const times = [...collectEpochTimes(query)].sort((left, right) => left - right);
  const selected = times.slice(-Math.max(1, Math.min(24, Math.round(frameCount))));
  const frames = selected.map((epoch) => formatFrame(epoch, 'noaa-image-service'));
  if (!frames.length) {
    throw new Error('NOAA/NESDIS GeoColor archive returned no usable timestamps.');
  }
  return {
    provider: 'noaa-nesdis-geocolor',
    source,
    product,
    frames,
    generatedAt: new Date().toISOString(),
    ...rootMetadata(raw),
  };
}

export function iemLatestTileUrl(
  source: SatelliteSource,
  product: Exclude<SatelliteProductId, 'goes-geocolor'>,
): string {
  const channel = IEM_CHANNEL[product];
  return 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/'
    + `goes_${source}_conus_ch${channel}/{z}/{x}/{y}.png`;
}

function utcCompactMinute(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getUTCFullYear()}`
    + `${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    + `${String(date.getUTCDate()).padStart(2, '0')}`
    + `${String(date.getUTCHours()).padStart(2, '0')}`
    + `${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function finiteBBox(bbox: BBox): BBox {
  const values = [bbox.west, bbox.south, bbox.east, bbox.north];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Satellite archive image requires finite map bounds.');
  }
  return bbox;
}

export function iemArchiveImageUrl(
  product: Exclude<SatelliteProductId, 'goes-geocolor'>,
  frame: SatelliteFrame,
  bbox: BBox,
  width: number,
  height: number,
): string {
  if (frame.epochMs == null) throw new Error('Archived satellite imagery requires a timestamp.');
  const bounds = finiteBBox(bbox);
  const query = new URLSearchParams();
  query.append('layers[]', 'goes');
  query.set('goes_product', IEM_ARCHIVE_PRODUCT[product]);
  query.set('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  query.set('width', String(Math.max(320, Math.min(1200, Math.round(width)))));
  query.set('height', String(Math.max(240, Math.min(900, Math.round(height)))));
  query.set('ts', utcCompactMinute(frame.epochMs));
  return `https://mesonet.agron.iastate.edu/GIS/radmap.php?${query.toString()}`;
}

export function noaaGeoColorTileUrl(epochMs: number | null): string {
  const time = epochMs == null ? '' : `&time=${Math.round(epochMs)}`;
  return `${NOAA_GEOCOLOR_SERVICE}/exportImage`
    + '?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256'
    + `&format=png32&transparent=true&f=image${time}`;
}