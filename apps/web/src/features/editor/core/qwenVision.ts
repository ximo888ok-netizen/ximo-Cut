import type { AiSettings } from "./settings";
import { isTauriRuntime, localFileUrl } from "./desktop";
import { requestQwen, type QwenContentPart } from "./qwenClient";
import { newScriptId, type ScriptDoc, type ScriptShot } from "./scripts";

const FRAME_COUNT = 8;

interface FrameEntry {
  path: string;
  time: number;
}

export async function analyzeReferenceVideo(options: {
  filePath: string;
  fileName: string;
  ai: AiSettings;
  onStage?: (stage: string) => void;
}): Promise<ScriptDoc> {
  const apiKey = options.ai.apiKey.trim();
  if (!apiKey) {
    throw new Error("还没有填写千问 API Key：打开设置 → 模型与服务，填写后重试");
  }
  if (!isTauriRuntime) {
    throw new Error("视频复刻依赖本地 FFmpeg 抽帧，请在桌面版使用");
  }

  options.onStage?.("正在抽取参考画面…");
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{ duration: number; frames: FrameEntry[] }>(
    "extract_reference_frames",
    { path: options.filePath, count: FRAME_COUNT },
  );
  if (!result.frames || result.frames.length < 2) {
    throw new Error("参考视频太短，至少需要 1 秒画面");
  }

  options.onStage?.(`正在读取 ${result.frames.length} 张关键帧…`);
  const dataUrls = await Promise.all(result.frames.map((frame) => frameToDataUrl(frame.path)));

  options.onStage?.("正在让千问拆解镜头结构…");
  const parts: QwenContentPart[] = [
    { type: "text", text: buildPrompt(options.fileName, result.duration, result.frames) },
    ...dataUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
    { type: "text", text: "请只输出 JSON，不要任何解释。" },
  ];

  const response = await requestQwen({
    apiKey,
    baseUrl: options.ai.baseUrl,
    model: options.ai.model,
    temperature: 0.2,
    maxTokens: Math.max(2048, options.ai.maxTokens),
    messages: [
      {
        role: "system",
        content:
          "你是专业短视频分镜师，擅长把参考视频拆解成可复刻的分镜脚本。你只输出 JSON，不输出解释。",
      },
      { role: "user", content: parts },
    ],
  });

  if (!response.content.trim()) {
    throw new Error("千问没有返回脚本内容，请稍后重试");
  }
  return parseReplicaScript(response.content, {
    fileName: options.fileName,
    duration: result.duration,
    coverPath: result.frames[0]?.path,
  });
}

export function parseReplicaScript(
  text: string,
  meta: { fileName: string; duration: number; coverPath?: string },
): ScriptDoc {
  const payload = extractJson(text);
  const rawShots = Array.isArray(payload.shots) ? payload.shots : [];
  const shots: ScriptShot[] = rawShots
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: `shot-${Date.now().toString(36)}-${index}`,
      duration: clampDuration(Number(item.duration), meta.duration, rawShots.length),
      shotSize: textOr(item.shotSize, "中景"),
      description: textOr(item.description, ""),
      dialogue: textOr(item.dialogue, ""),
      transition: textOr(item.transition, "硬切"),
    }))
    .filter((shot) => shot.duration > 0);

  if (shots.length === 0) {
    throw new Error("AI 没有拆出有效镜头，请换一条参考视频重试");
  }

  const now = new Date().toISOString();
  const title = textOr(payload.title, `复刻 · ${meta.fileName.replace(/\.[^.]+$/, "")}`);
  return {
    id: newScriptId(),
    title,
    createdAt: now,
    updatedAt: now,
    source: "replica",
    referenceName: meta.fileName,
    referenceDuration: Number(meta.duration.toFixed(2)),
    coverPath: meta.coverPath,
    shots,
  };
}

function buildPrompt(fileName: string, duration: number, frames: FrameEntry[]): string {
  const timeline = frames
    .map((frame, index) => `第 ${index + 1} 帧 ≈ ${frame.time.toFixed(1)}s`)
    .join("；");
  return [
    `下面是从参考视频《${fileName}》按时间顺序均匀抽取的 ${frames.length} 张画面，视频总时长 ${duration.toFixed(1)} 秒。`,
    `抽帧时间点：${timeline}。`,
    "",
    "请把这个视频拆解成可以直接复刻的分镜脚本，要求：",
    `1. 镜头数量 4 到 12 个，所有镜头的 duration 之和尽量接近 ${duration.toFixed(1)} 秒（误差 ±10%）。`,
    "2. duration 是秒数数字，最短 0.5 秒，结合抽帧时间点估算每个镜头的大致长度。",
    "3. shotSize 只能从 远景、全景、中景、近景、特写、空镜 里选一个。",
    "4. description 描述画面主体、动作、构图、色彩和运镜，30 字以内。",
    "5. dialogue 写画面里的口播或字幕文案；没有就填空字符串。",
    "6. transition 从 硬切、淡入、淡出、叠化、推拉 里选一个，默认硬切。",
    "",
    '输出 JSON：{"title":"脚本标题","shots":[{"duration":2.5,"shotSize":"中景","description":"画面描述","dialogue":"台词","transition":"硬切"}]}',
  ].join("\n");
}

async function frameToDataUrl(path: string): Promise<string> {
  const response = await fetch(await localFileUrl(path));
  if (!response.ok) {
    throw new Error("读取参考帧失败，请重试");
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取参考帧失败，请重试"));
    reader.readAsDataURL(blob);
  });
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI 返回的内容不是有效分镜脚本，请重试");
  }
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("AI 返回的内容不是有效分镜脚本，请重试");
  }
}

function clampDuration(value: number, total: number, count: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return count > 0 ? Number((total / count).toFixed(2)) : 0;
  }
  return Number(Math.min(60, Math.max(0.5, value)).toFixed(2));
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
