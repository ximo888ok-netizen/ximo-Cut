import { QWEN_DEFAULT_BASE_URL } from "./qwenAgent";

const STORAGE_KEY = "ximo-cut.settings.v1";
// 改名前的键名，读取时兼容一次，避免迁移后设置丢失
const LEGACY_STORAGE_KEY = "opencut.settings.v1";

export interface AiSettings {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export interface ExportDefaults {
  width: number;
  height: number;
  fps: number;
  format: "mp4" | "webm";
  bitrate: string;
}

export interface EditorSettings {
  ai: AiSettings;
  exportDefaults: ExportDefaults;
  timeline: {
    defaultZoom: number;
    snap: boolean;
  };
  preview: {
    showCaptions: boolean;
  };
  media: {
    generateThumbnails: boolean;
  };
  storage: {
    autoSave: boolean;
  };
}

export const RESOLUTION_OPTIONS = [
  { label: "1920 × 1080 · 横屏", width: 1920, height: 1080 },
  { label: "1080 × 1920 · 竖屏", width: 1080, height: 1920 },
  { label: "1280 × 720 · 720p", width: 1280, height: 720 },
];

export const FPS_OPTIONS = [24, 25, 30, 60];

export const BITRATE_OPTIONS = ["6 Mbps", "8 Mbps", "12 Mbps", "20 Mbps"];

export const MODEL_SUGGESTIONS = [
  "qwen3.8-omni-flash",
  "qwen-plus",
  "qwen-max",
  "qwen-vl-max",
];

export const DEFAULT_SETTINGS: EditorSettings = {
  ai: {
    baseUrl: QWEN_DEFAULT_BASE_URL,
    model: "qwen3.8-omni-flash",
    temperature: 0.3,
    maxTokens: 2048,
    apiKey: "",
  },
  exportDefaults: {
    width: 1920,
    height: 1080,
    fps: 30,
    format: "mp4",
    bitrate: "12 Mbps",
  },
  timeline: {
    defaultZoom: 1,
    snap: true,
  },
  preview: {
    showCaptions: true,
  },
  media: {
    generateThumbnails: true,
  },
  storage: {
    autoSave: true,
  },
};

export function loadSettings(): EditorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    return normalizeSettings(JSON.parse(raw) as Partial<EditorSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: EditorSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 存储空间不可用时保持内存中的设置即可
  }
}

export function normalizeSettings(input: Partial<EditorSettings> | null | undefined): EditorSettings {
  const ai: Partial<AiSettings> = input?.ai ?? {};
  const exportDefaults: Partial<ExportDefaults> = input?.exportDefaults ?? {};
  const timeline: Partial<EditorSettings["timeline"]> = input?.timeline ?? {};
  const preview: Partial<EditorSettings["preview"]> = input?.preview ?? {};
  const media: Partial<EditorSettings["media"]> = input?.media ?? {};
  const storage: Partial<EditorSettings["storage"]> = input?.storage ?? {};

  const storedBaseUrl = textOr(ai.baseUrl, DEFAULT_SETTINGS.ai.baseUrl);

  return {
    ai: {
      // 旧版本默认指向本地 8787 代理，桌面版没有该服务，直接迁移到千问直连地址
      baseUrl: /localhost|127\.0\.0\.1/i.test(storedBaseUrl)
        ? DEFAULT_SETTINGS.ai.baseUrl
        : storedBaseUrl,
      model: textOr(ai.model, DEFAULT_SETTINGS.ai.model),
      temperature: clamp(numberOr(ai.temperature, DEFAULT_SETTINGS.ai.temperature), 0, 1.5),
      maxTokens: Math.round(
        clamp(numberOr(ai.maxTokens, DEFAULT_SETTINGS.ai.maxTokens), 256, 8192),
      ),
      apiKey: typeof ai.apiKey === "string" ? ai.apiKey.trim() : "",
    },
    exportDefaults: {
      width: Math.round(clamp(numberOr(exportDefaults.width, 1920), 256, 7680)),
      height: Math.round(clamp(numberOr(exportDefaults.height, 1080), 256, 4320)),
      fps: FPS_OPTIONS.includes(numberOr(exportDefaults.fps, 30))
        ? numberOr(exportDefaults.fps, 30)
        : 30,
      format: exportDefaults.format === "webm" ? "webm" : "mp4",
      bitrate: textOr(exportDefaults.bitrate, DEFAULT_SETTINGS.exportDefaults.bitrate),
    },
    timeline: {
      defaultZoom: clamp(numberOr(timeline.defaultZoom, 1), 1, 10),
      snap: booleanOr(timeline.snap, true),
    },
    preview: {
      showCaptions: booleanOr(preview.showCaptions, true),
    },
    media: {
      generateThumbnails: booleanOr(media.generateThumbnails, true),
    },
    storage: {
      autoSave: booleanOr(storage.autoSave, true),
    },
  };
}

function numberOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanOr(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function textOr(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
