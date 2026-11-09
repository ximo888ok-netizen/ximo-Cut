export interface SilenceRange {
  start_ms: number;
  end_ms: number;
}

export interface AudioAnalysisResult {
  file_name: string;
  duration_ms: number;
  sample_rate: number;
  channels: number;
  peak_db: number;
  rms_db: number;
  estimated_lufs: number;
  silence_ranges: SilenceRange[];
  waveform: number[];
  bpm: number | null;
  beats_ms: number[];
}

export async function analyzeAudioFile(file: File): Promise<AudioAnalysisResult> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return analyzeAudioBuffer(buffer, file.name);
  } finally {
    await context.close();
  }
}

export function analyzeAudioBuffer(buffer: AudioBuffer, fileName: string): AudioAnalysisResult {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const length = buffer.length;
  const mono = new Float32Array(length);
  let peak = 0;
  let sumSquares = 0;

  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const value = data[index];
      mono[index] += value / channels;
      const magnitude = Math.abs(value);
      if (magnitude > peak) {
        peak = magnitude;
      }
      sumSquares += value * value;
    }
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, length * channels));
  const waveform = buildWaveform(mono, 256);
  const frameSize = Math.max(1, Math.floor(buffer.sampleRate * 0.02));
  const frames: number[] = [];

  for (let offset = 0; offset < length; offset += frameSize) {
    let frameSum = 0;
    let frameCount = 0;
    for (let index = offset; index < Math.min(length, offset + frameSize); index += 1) {
      frameSum += mono[index] * mono[index];
      frameCount += 1;
    }
    frames.push(Math.sqrt(frameSum / Math.max(1, frameCount)));
  }

  return {
    file_name: fileName,
    duration_ms: Math.round(buffer.duration * 1000),
    sample_rate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    peak_db: toDb(peak),
    rms_db: toDb(rms),
    estimated_lufs: Number((-0.691 + 10 * Math.log10(Math.max(rms * rms, 1e-12))).toFixed(1)),
    silence_ranges: detectSilence(frames, frameSize, buffer.sampleRate),
    waveform,
    ...detectTempo(frames, buffer.sampleRate, frameSize),
  };
}

function buildWaveform(samples: Float32Array, buckets: number): number[] {
  const bucketSize = Math.max(1, Math.floor(samples.length / buckets));
  const result: number[] = [];
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    let peak = 0;
    const start = bucket * bucketSize;
    const end = Math.min(samples.length, start + bucketSize);
    for (let index = start; index < end; index += 1) {
      const magnitude = Math.abs(samples[index]);
      if (magnitude > peak) {
        peak = magnitude;
      }
    }
    result.push(Number(peak.toFixed(3)));
  }
  return result;
}

function detectSilence(
  frames: number[],
  frameSize: number,
  sampleRate: number,
): SilenceRange[] {
  const threshold = 10 ** (-45 / 20);
  const minFrames = Math.ceil(0.3 / (frameSize / sampleRate));
  const ranges: SilenceRange[] = [];
  let start: number | null = null;

  frames.forEach((value, index) => {
    if (value < threshold) {
      if (start === null) {
        start = index;
      }
    } else if (start !== null) {
      if (index - start >= minFrames) {
        ranges.push({
          start_ms: Math.round((start * frameSize * 1000) / sampleRate),
          end_ms: Math.round((index * frameSize * 1000) / sampleRate),
        });
      }
      start = null;
    }
  });

  if (start !== null && frames.length - start >= minFrames) {
    ranges.push({
      start_ms: Math.round((start * frameSize * 1000) / sampleRate),
      end_ms: Math.round((frames.length * frameSize * 1000) / sampleRate),
    });
  }

  return ranges;
}

function detectTempo(
  frames: number[],
  sampleRate: number,
  frameSize: number,
): { bpm: number | null; beats_ms: number[] } {
  if (frames.length < 20) {
    return { bpm: null, beats_ms: [] };
  }

  const mean = frames.reduce((sum, value) => sum + value, 0) / frames.length;
  const variance =
    frames.reduce((sum, value) => sum + (value - mean) ** 2, 0) / frames.length;
  const threshold = mean + Math.sqrt(variance) * 0.65;
  const minSpacingFrames = Math.ceil(0.22 / (frameSize / sampleRate));
  const beats: number[] = [];
  let lastPeak = -minSpacingFrames;

  frames.forEach((value, index) => {
    if (value > threshold && index - lastPeak >= minSpacingFrames) {
      beats.push(index);
      lastPeak = index;
    }
  });

  if (beats.length < 4) {
    return { bpm: null, beats_ms: beats.map(frameToMs) };
  }

  const intervals: number[] = [];
  for (let index = 1; index < beats.length; index += 1) {
    intervals.push(beats[index] - beats[index - 1]);
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  const secondsPerBeat = (median * frameSize) / sampleRate;
  const bpm = secondsPerBeat > 0 ? 60 / secondsPerBeat : null;

  return {
    bpm: bpm && bpm >= 50 && bpm <= 200 ? Math.round(bpm) : null,
    beats_ms: beats.map(frameToMs),
  };

  function frameToMs(frame: number): number {
    return Math.round((frame * frameSize * 1000) / sampleRate);
  }
}

function toDb(value: number): number {
  return Number((20 * Math.log10(Math.max(value, 1e-6))).toFixed(1));
}
