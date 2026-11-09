import type { Asset, RenderSettings } from "../data";
import type { ProjectState } from "./editorStore";
import type { MaterialAnalysis } from "./quickCut";
import { isTauriRuntime, renderVideoFile } from "./desktop";
import { buildRenderRequest } from "./renderRequest";

export interface ReviewMetrics {
  duration: number;
  scenes: number;
  blackRatio: number;
  freezeRatio: number;
  loudness: number | null;
  peak: number | null;
  avgShot: number;
}

export interface ReviewIssue {
  level: "warn" | "info";
  text: string;
}

export interface ReviewReport {
  metrics: ReviewMetrics;
  issues: ReviewIssue[];
  score: number;
}

export interface FootageAnalysis extends MaterialAnalysis {
  assetId: string;
  name: string;
}

export async function reviewVideo(path: string): Promise<ReviewReport> {
  if (!isTauriRuntime) {
    throw new Error("审片仅在桌面版可用");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ReviewReport>("review_video", { input: path });
}

/** 渲染一版低清预览并直接审片，用于 Agent 的“剪完自检”循环 */
export async function renderAndReview(
  project: ProjectState,
  assets: Asset[],
  settings: RenderSettings,
): Promise<{ path: string; report: ReviewReport }> {
  if (!isTauriRuntime) {
    throw new Error("审片仅在桌面版可用");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  const path = await invoke<string>("preview_output_path");
  const vertical = settings.height > settings.width;
  const preview: RenderSettings = {
    ...settings,
    width: vertical ? 540 : 960,
    height: vertical ? 960 : 540,
    bitrate: "4 Mbps",
    // 审片工具只接受 MP4，避免沿用 WebM 设置导致渲染失败
    format: "mp4",
  };
  await renderVideoFile(buildRenderRequest(project, assets, preview), path);
  const report = await reviewVideo(path);
  return { path, report };
}

export function reviewGrade(score: number): { label: string; tone: string } {
  if (score >= 90) {
    return { label: "可直接发布", tone: "good" };
  }
  if (score >= 80) {
    return { label: "小修即可", tone: "good" };
  }
  if (score >= 65) {
    return { label: "需要再剪一轮", tone: "warn" };
  }
  return { label: "问题较多", tone: "bad" };
}

export function formatReview(report: ReviewReport): string {
  const { metrics } = report;
  const parts = [
    `${report.score} 分`,
    `${metrics.scenes} 个镜头 · 平均 ${metrics.avgShot.toFixed(1)} 秒`,
    metrics.loudness === null ? "未检测到音频" : `响度 ${metrics.loudness.toFixed(1)} LUFS`,
  ];
  return parts.join(" · ");
}
