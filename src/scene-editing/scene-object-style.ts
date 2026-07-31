import type { CSSProperties } from 'react';
import type { SceneElementOverride, SceneElementStyle, SceneElementTransform } from '../types/domain';

export const DEFAULT_SCENE_ELEMENT_TRANSFORM: Required<Pick<
  SceneElementTransform,
  'xPercent' | 'yPercent' | 'scaleX' | 'scaleY' | 'rotationDeg' | 'zIndex' | 'locked' | 'hidden'
>> = {
  xPercent: 0,
  yPercent: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDeg: 0,
  zIndex: 0,
  locked: false,
  hidden: false,
};

export function normalizedTransform(transform: SceneElementTransform | undefined) {
  return { ...DEFAULT_SCENE_ELEMENT_TRANSFORM, ...(transform ?? {}) };
}

export function sceneObjectCss(
  override: SceneElementOverride | undefined,
  interactive: boolean,
): CSSProperties {
  const style = override?.style ?? {};
  const transform = normalizedTransform(override?.transform);
  const hiddenOpacity = transform.hidden && interactive ? 0.18 : undefined;
  const gradient = style.gradientStartColor && style.gradientEndColor
    ? `linear-gradient(${style.gradientAngleDeg ?? 90}deg, ${style.gradientStartColor}, ${style.gradientEndColor})`
    : undefined;
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    backgroundImage: gradient ?? (style.backgroundColor ? 'none' : undefined),
    fontFamily: style.fontFamily,
    fontSize: style.fontSizePx == null ? undefined : `${style.fontSizePx}px`,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    textAlign: style.textAlign,
    opacity: hiddenOpacity ?? style.opacity,
    letterSpacing: style.letterSpacingPx == null ? undefined : `${style.letterSpacingPx}px`,
    textShadow: style.textShadow === false ? 'none' : style.textShadow === true ? '0 2px 4px rgba(0,0,0,.85)' : undefined,
    borderColor: style.borderColor,
    borderStyle: style.borderWidthPx && style.borderWidthPx > 0 ? 'solid' : undefined,
    borderWidth: style.borderWidthPx == null ? undefined : `${style.borderWidthPx}px`,
    borderRadius: style.borderRadiusPx == null ? undefined : `${style.borderRadiusPx}px`,
    padding: style.paddingPx == null ? undefined : `${style.paddingPx}px`,
    boxShadow: style.boxShadow === false ? 'none' : style.boxShadow === true ? '0 8px 24px rgba(0,0,0,.45)' : undefined,
    visibility: transform.hidden && !interactive ? 'hidden' : undefined,
    zIndex: transform.zIndex || undefined,
    translate: `calc(var(--scene-stage-width, 0px) * ${transform.xPercent} / 100) calc(var(--scene-stage-height, 0px) * ${transform.yPercent} / 100)`,
    rotate: `${transform.rotationDeg}deg`,
    scale: `${transform.scaleX} ${transform.scaleY}`,
    transformOrigin: 'center center',
  } as CSSProperties;
}

export function compactSceneElementStyle(style: SceneElementStyle): SceneElementStyle {
  return Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)) as SceneElementStyle;
}

export function compactSceneElementTransform(transform: SceneElementTransform): SceneElementTransform {
  const normalized = normalizedTransform(transform);
  const result: SceneElementTransform = {};
  if (normalized.xPercent !== 0) result.xPercent = normalized.xPercent;
  if (normalized.yPercent !== 0) result.yPercent = normalized.yPercent;
  if (normalized.scaleX !== 1) result.scaleX = normalized.scaleX;
  if (normalized.scaleY !== 1) result.scaleY = normalized.scaleY;
  if (normalized.rotationDeg !== 0) result.rotationDeg = normalized.rotationDeg;
  if (normalized.zIndex !== 0) result.zIndex = normalized.zIndex;
  if (normalized.locked) result.locked = true;
  if (normalized.hidden) result.hidden = true;
  return result;
}
