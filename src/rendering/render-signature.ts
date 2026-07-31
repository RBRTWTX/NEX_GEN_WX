import type { StudioBranding, StudioScene } from '../types/domain';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

/** Small deterministic hash suitable for cache keys and render verification. */
export function hashText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function sceneRenderSignature(scene: StudioScene, branding: StudioBranding): string {
  return hashText(stableStringify({ scene, branding }));
}
