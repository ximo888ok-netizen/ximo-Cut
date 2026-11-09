import { useEffect, useRef, type CSSProperties } from "react";
import type { ClipMask } from "./data";
import { maskToCss } from "./core/mask";

export interface BackgroundLayer {
  id: string;
  url: string;
  filter?: string;
  mask?: ClipMask | null;
  scale: number;
  rotation: number;
  positionX: number;
  positionY: number;
  start: number;
  sourceIn: number;
  speed: number;
  isImage: boolean;
  volume: number;
  muted: boolean;
  blendMode?: string;
}

function buildTransform(layer: BackgroundLayer): string | undefined {
  const parts: string[] = [];
  if (layer.positionX !== 0 || layer.positionY !== 0) {
    parts.push(`translate(${layer.positionX}%, ${layer.positionY}%)`);
  }
  if (layer.scale !== 1) parts.push(`scale(${layer.scale})`);
  if (layer.rotation !== 0) parts.push(`rotate(${layer.rotation}deg)`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

interface PreviewBackgroundProps {
  layer: BackgroundLayer;
  playing: boolean;
  playhead: number;
  masterVolume: number;
}

export function PreviewBackground({
  layer,
  playing,
  playhead,
  masterVolume,
}: PreviewBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transform = buildTransform(layer);
  const maskStyle = layer.mask ? maskToCss(layer.mask) : undefined;
  const style: CSSProperties = {
    filter: layer.filter,
    transform,
    ...maskStyle,
    ...(layer.blendMode && layer.blendMode !== "normal"
      ? { mixBlendMode: layer.blendMode as CSSProperties["mixBlendMode"] }
      : {}),
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = Math.min(4, Math.max(0.25, layer.speed));
  }, [layer.speed, layer.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = layer.muted ? 0 : Math.min(1, Math.max(0, layer.volume * masterVolume));
    video.muted = layer.muted || layer.volume === 0 || masterVolume === 0;
  }, [layer.volume, layer.muted, masterVolume, layer.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing, layer.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const target = layer.sourceIn + Math.max(0, playhead - layer.start) * layer.speed;
    const clamped = Math.min(target, video.duration - 0.01);
    if (Math.abs(video.currentTime - clamped) > 0.18) {
      video.currentTime = Math.max(0, clamped);
    }
  }, [playhead, layer.sourceIn, layer.start, layer.speed]);

  if (layer.isImage) {
    return (
      <img
        className="preview-video preview-video--background"
        src={layer.url}
        alt=""
        style={style}
      />
    );
  }
  return (
    <video
      ref={videoRef}
      className="preview-video preview-video--background"
      src={layer.url}
      playsInline
      style={style}
    />
  );
}
