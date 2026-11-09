import { describe, expect, it } from "vitest";
import { analyzeAudioBuffer } from "./audioAnalysis";

function makeBuffer(samples: Float32Array, sampleRate = 48000): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: samples.length,
    sampleRate,
    duration: samples.length / sampleRate,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

describe("audio analysis", () => {
  it("detects peak, RMS and silence", () => {
    const sampleRate = 48000;
    const samples = new Float32Array(sampleRate * 2);
    for (let index = sampleRate; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.5;
    }

    const result = analyzeAudioBuffer(makeBuffer(samples), "tone.wav");
    expect(result.duration_ms).toBe(2000);
    expect(result.peak_db).toBeCloseTo(-6, 0);
    expect(result.waveform).toHaveLength(256);
    expect(result.silence_ranges[0].start_ms).toBe(0);
    expect(result.silence_ranges[0].end_ms).toBeGreaterThan(900);
  });

  it("estimates a 120 BPM click track", () => {
    const sampleRate = 48000;
    const samples = new Float32Array(sampleRate * 8);
    for (let beat = 0; beat < 16; beat += 1) {
      const offset = Math.round((beat * 0.5) * sampleRate);
      for (let index = 0; index < 240; index += 1) {
        samples[offset + index] = 0.9 * Math.exp(-index / 40);
      }
    }

    const result = analyzeAudioBuffer(makeBuffer(samples), "click.wav");
    expect(result.bpm).toBe(120);
    expect(result.beats_ms.length).toBeGreaterThanOrEqual(12);
  });
});
