import type { Keyframe, TrackClip } from "../data";

export interface ClipTransform {
  scale: number;
  rotation: number;
  opacity: number;
  positionX: number;
  positionY: number;
}

export function easingProgress(
  progress: number,
  easing: Keyframe["easing"],
): number {
  const value = Math.min(1, Math.max(0, progress));
  switch (easing) {
    case "easeIn":
      return value * value;
    case "easeOut":
      return 1 - (1 - value) * (1 - value);
    case "easeInOut":
      return value < 0.5
        ? 2 * value * value
        : 1 - Math.pow(-2 * value + 2, 2) / 2;
    case "hold":
      return value >= 1 ? 1 : 0;
    default:
      return value;
  }
}

export function keyframesFor(
  clip: TrackClip,
  property: Keyframe["property"],
): Keyframe[] {
  return (clip.keyframes ?? [])
    .filter((keyframe) => keyframe.property === property)
    .sort((a, b) => a.time - b.time);
}

export function evaluateProperty(
  clip: TrackClip,
  property: Keyframe["property"],
  time: number,
  fallback: number,
): number {
  const frames = keyframesFor(clip, property);
  if (frames.length === 0) {
    return fallback;
  }
  if (time <= frames[0].time) {
    return frames[0].value;
  }
  const last = frames[frames.length - 1];
  if (time >= last.time) {
    return last.value;
  }
  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    if (time >= current.time && time <= next.time) {
      const span = Math.max(0.0001, next.time - current.time);
      const progress = easingProgress((time - current.time) / span, current.easing);
      return current.value + (next.value - current.value) * progress;
    }
  }
  return last.value;
}

export function clipTransformAt(clip: TrackClip, time: number): ClipTransform {
  return {
    scale: evaluateProperty(clip, "scale", time, clip.scale ?? 1),
    rotation: evaluateProperty(clip, "rotation", time, clip.rotation ?? 0),
    opacity: evaluateProperty(clip, "opacity", time, clip.opacity ?? 1),
    positionX: evaluateProperty(clip, "positionX", time, clip.positionX ?? 0),
    positionY: evaluateProperty(clip, "positionY", time, clip.positionY ?? 0),
  };
}

export function hasTransformKeyframes(clip: TrackClip): boolean {
  return (clip.keyframes ?? []).some((keyframe) =>
    ["scale", "rotation", "opacity", "positionX", "positionY"].includes(
      keyframe.property,
    ),
  );
}
