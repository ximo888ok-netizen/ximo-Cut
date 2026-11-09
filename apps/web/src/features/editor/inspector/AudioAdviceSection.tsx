import { Captions } from "lucide-react";
import type { AudioAnalysisResult } from "../core/audioAnalysis";

export function AudioAdviceSection({
  audioAnalysis,
}: {
  audioAnalysis: AudioAnalysisResult | null;
}) {
  const silenceCount = audioAnalysis?.silence_ranges.length ?? 0;
  const silenceSeconds =
    audioAnalysis?.silence_ranges.reduce(
      (sum, range) => sum + (range.end_ms - range.start_ms) / 1000,
      0,
    ) ?? 0;

  return (
    <section className="inspector-section">
      <span className="inspector-section__title">AI 建议</span>
      <div className="ai-suggestion">
        <Captions size={14} strokeWidth={1.8} />
        <p>
          {audioAnalysis
            ? silenceCount > 0
              ? `检测到 ${silenceCount} 处静音，共 ${silenceSeconds.toFixed(1)} 秒，可在时间线上收紧。`
              : "这份音频没有检测到明显静音段。"
            : "导入音频后，这里会显示基于真实音频分析的静音与节拍建议。"}
        </p>
      </div>
    </section>
  );
}
