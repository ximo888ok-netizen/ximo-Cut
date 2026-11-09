import { useEffect, useRef } from "react";

export interface PreviewAudioLayer {
  id: string;
  url: string;
  start: number;
  sourceIn: number;
  speed: number;
  volume: number;
  duck: boolean;
}

interface PreviewAudioLayersProps {
  layers: PreviewAudioLayer[];
  playing: boolean;
  playhead: number;
  masterVolume: number;
  ducked: boolean;
}

export function PreviewAudioLayers({
  layers,
  playing,
  playhead,
  masterVolume,
  ducked,
}: PreviewAudioLayersProps) {
  return (
    <div hidden>
      {layers.map((layer) => (
        <PreviewAudioLayer
          key={layer.id}
          layer={layer}
          playing={playing}
          playhead={playhead}
          masterVolume={masterVolume}
          ducked={ducked}
        />
      ))}
    </div>
  );
}

function PreviewAudioLayer({
  layer,
  playing,
  playhead,
  masterVolume,
  ducked,
}: {
  layer: PreviewAudioLayer;
  playing: boolean;
  playhead: number;
  masterVolume: number;
  ducked: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    const duckFactor = ducked && layer.duck ? 0.35 : 1;
    audio.volume = Math.min(1, Math.max(0, layer.volume * duckFactor * masterVolume));
    audio.playbackRate = Math.min(4, Math.max(0.25, layer.speed));
  }, [layer.volume, layer.speed, layer.duck, masterVolume, ducked]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    const target = layer.sourceIn + Math.max(0, playhead - layer.start) * layer.speed;
    if (audio.readyState > 0 && Number.isFinite(audio.duration)) {
      const clamped = Math.min(target, Math.max(0, audio.duration - 0.01));
      if (Math.abs(audio.currentTime - clamped) > 0.25) {
        audio.currentTime = Math.max(0, clamped);
      }
    }
  }, [playhead, layer.sourceIn, layer.start, layer.speed]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    if (playing) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [playing]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = layer.sourceIn;
  }, [layer.sourceIn]);

  return <audio ref={ref} src={layer.url} preload="auto" />;
}
