import {
  clipText,
  outputFailed,
  summarizeToolResult,
} from "./feedResult";

export type AgentRunStatus = "thinking" | "running" | "done" | "error" | "stopped";
export type AgentStepStatus = "running" | "ok" | "error";

export interface AgentToolStep {
  id: string;
  name: string;
  title: string;
  detail: string;
  args?: unknown;
  output?: unknown;
  result?: string;
  status: AgentStepStatus;
  startedAt: number;
  endedAt?: number;
}

export interface AgentFeedMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoning?: string;
  steps?: AgentToolStep[];
  status?: AgentRunStatus;
  startedAt?: number;
  endedAt?: number;
  canUndo?: boolean;
  undone?: boolean;
}

export function createAssistantRun(id: string, at: number): AgentFeedMessage {
  return {
    id,
    role: "assistant",
    text: "",
    reasoning: "",
    steps: [],
    status: "thinking",
    startedAt: at,
  };
}

export function startToolStep(
  message: AgentFeedMessage,
  input: { id: string; name: string; args?: unknown; at: number },
): AgentFeedMessage {
  const display = describeTool(input.name, input.args);
  return {
    ...message,
    status: "running",
    steps: [
      ...(message.steps ?? []),
      {
        id: input.id,
        name: input.name,
        title: display.title,
        detail: display.detail,
        args: input.args,
        status: "running",
        startedAt: input.at,
      },
    ],
  };
}

export function finishToolStep(
  message: AgentFeedMessage,
  input: { id: string; output: unknown; at: number },
): AgentFeedMessage {
  return {
    ...message,
    steps: (message.steps ?? []).map((step) =>
      step.id === input.id
        ? {
            ...step,
            status: outputFailed(input.output) ? "error" : "ok",
            output: input.output,
            result: summarizeToolResult(input.output),
            endedAt: input.at,
          }
        : step,
    ),
  };
}

export function finishRun(
  message: AgentFeedMessage,
  input: { status: AgentRunStatus; at: number; text?: string },
): AgentFeedMessage {
  return {
    ...message,
    status: input.status,
    endedAt: input.at,
    text: input.text ?? message.text,
  };
}

export function describeTool(
  name: string,
  args?: unknown,
): { title: string; detail: string } {
  const values = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  switch (name) {
    case "project_get_state":
      return { title: "读取工程状态", detail: "轨道、片段与播放头" };
    case "ui_snapshot":
      return { title: "扫描界面元素", detail: "读取可操作控件与 agent-id" };
    case "audio_get_analysis":
      return { title: "分析音频", detail: "响度、BPM 与静音区间" };
    case "caption_transcribe":
      return { title: "生成字幕", detail: values.asset_id ? shortId(values.asset_id) : "当前素材" };
    case "quick_cut": {
      const parts = [
        values.target_duration ? `${toNumber(values.target_duration)}s` : "约 30s",
        values.music === false ? "不配乐" : "带配乐",
        values.captions === false ? "不写字幕" : "写字幕",
      ];
      return { title: "一键快剪", detail: parts.join(" · ") };
    }
    case "analyze_footage":
      return { title: "分析素材", detail: "镜头切点、清晰度与曝光评分" };
    case "sfx_list":
      return { title: "音效库", detail: "查看内置音效" };
    case "sfx_insert":
      return {
        title: "添加音效",
        detail: String(values.name ?? values.sfx_id ?? "内置音效"),
      };
    case "voiceover":
      return {
        title: "生成配音",
        detail: clipText(String(values.text ?? ""), 32),
      };
    case "plan_story": {
      const styles: Record<string, string> = {
        cinematic: "电影感",
        energy: "高能卡点",
        vlog: "治愈 Vlog",
        commercial: "商业广告",
        documentary: "纪实",
      };
      return {
        title: "精剪方案",
        detail: `${styles[String(values.style)] ?? "电影感"} · ${toNumber(values.target_duration ?? 30)}s`,
      };
    }
    case "review_timeline":
      return { title: "审片", detail: "渲染低清预览并自动打分" };
    case "review_video":
      return { title: "审片", detail: shortId(values.path) };
    case "clip_set_transform": {
      const parts: string[] = [];
      if (values.scale !== undefined) parts.push(`缩放 ${Math.round(Number(values.scale) * 100)}%`);
      if (values.rotation !== undefined) parts.push(`旋转 ${Number(values.rotation)}°`);
      if (values.opacity !== undefined) parts.push(`不透明度 ${Math.round(Number(values.opacity) * 100)}%`);
      if (values.position_x !== undefined || values.position_y !== undefined) {
        parts.push(`位置 ${Number(values.position_x ?? 0)}% / ${Number(values.position_y ?? 0)}%`);
      }
      return {
        title: "调整画面变换",
        detail: parts.length > 0 ? `${shortId(values.clip_id)} · ${parts.join(" · ")}` : shortId(values.clip_id),
      };
    }
    case "clip_set_volume":
      return {
        title: "调整音量",
        detail:
          values.muted !== undefined
            ? `${shortId(values.clip_id)} · ${values.muted ? "静音" : "取消静音"}`
            : `${shortId(values.clip_id)} · ${toNumber(values.volume_db)} dB`,
      };
    case "clip_set_speed":
      return { title: "调整速度", detail: `${shortId(values.clip_id)} · ${toNumber(values.speed)}x` };
    case "clip_set_adjust": {
      const adjust = (values.adjust ?? {}) as Record<string, unknown>;
      const count = Object.keys(adjust).length;
      return { title: "调整画面调色", detail: `${shortId(values.clip_id)} · ${count} 项参数` };
    }
    case "clip_set_text_style":
      return {
        title: "修改文字样式",
        detail: values.text !== undefined ? `「${clipText(String(values.text), 24)}」` : shortId(values.clip_id),
      };
    case "clip_set_transition":
      return {
        title: "设置转场",
        detail: `${shortId(values.clip_id)} · ${values.edge === "out" ? "出点" : "入点"} · ${values.type === "none" ? "移除" : values.type === "flash" ? "闪白" : "淡化"}`,
      };
    case "keyframe_add": {
      const names: Record<string, string> = {
        scale: "缩放",
        rotation: "旋转",
        opacity: "不透明度",
        positionX: "水平位置",
        positionY: "垂直位置",
        volumeDb: "音量",
      };
      return {
        title: "添加关键帧",
        detail: `${names[String(values.property)] ?? String(values.property)} @ ${toNumber(values.time)}s`,
      };
    }
    case "keyframe_remove":
      return { title: "删除关键帧", detail: shortId(values.keyframe_id) };
    case "clip_set_mask": {
      if (values.remove === true) {
        return { title: "删除蒙版", detail: shortId(values.clip_id) };
      }
      const shapes: Record<string, string> = {
        rect: "矩形",
        ellipse: "椭圆",
        linear: "线性",
      };
      return {
        title: "设置蒙版",
        detail: `${shapes[String(values.shape)] ?? "矩形"} · ${Math.round(Number(values.feather ?? 0.06) * 100)}% 羽化`,
      };
    }
    case "speed_ramp": {
      const presets: Record<string, string> = {
        slow: "慢动作爆点",
        fast: "加速转场",
        bullet: "子弹时间",
      };
      return {
        title: "速度斜坡",
        detail: presets[String(values.preset)] ?? "慢动作爆点",
      };
    }
    case "clip_set_blend": {
      const modes: Record<string, string> = {
        normal: "正常",
        multiply: "正片叠底",
        screen: "滤色",
        overlay: "叠加",
        "soft-light": "柔光",
        darken: "变暗",
        lighten: "变亮",
      };
      return {
        title: "混合模式",
        detail: modes[String(values.mode)] ?? "正常",
      };
    }
    case "preview_get_state":
      return { title: "读取当前位置", detail: "播放头、选中片段与当前面板" };
    case "preview_seek":
      return { title: "定位播放头", detail: `${toNumber(values.time)}s` };
    case "preview_play":
      return { title: "播放预览", detail: "从当前播放头开始" };
    case "preview_pause":
      return { title: "暂停预览", detail: "停在当前帧" };
    case "render_get_settings":
      return { title: "读取导出设置", detail: "分辨率、帧率与范围" };
    case "render_update_settings":
      return { title: "更新导出设置", detail: summarizeSettings(values.settings) };
    case "render_start":
      return { title: "导出视频", detail: summarizeSettings(values.settings) || "按当前设置" };
    case "render_batch": {
      const jobs = Array.isArray(values.jobs) ? values.jobs.length : 0;
      return { title: "批量导出", detail: `${jobs || 1} 个渲染任务` };
    }
    case "plan_propose": {
      const shots = Array.isArray(values.shots) ? values.shots : [];
      const total = shots.reduce(
        (sum, shot) =>
          sum + Number((shot as { duration?: number })?.duration ?? 0),
        0,
      );
      return {
        title: "生成剪辑方案",
        detail: shots.length > 0 ? `${shots.length} 个镜头 · ${total.toFixed(1)}s` : "等待素材",
      };
    }
    case "ui_click":
      return { title: `点击「${shortId(values.target)}」`, detail: shortId(values.target) };
    case "ui_set_value":
      return {
        title: `调整「${shortId(values.target)}」`,
        detail: `设为 ${clipText(formatValue(values.value), 40)}`,
      };
    case "timeline_drag_clip":
      return {
        title: "移动片段",
        detail: `${shortId(values.clip_id)} → ${toNumber(values.start)}s${values.track_id ? ` · ${shortId(values.track_id)}` : ""}`,
      };
    case "timeline_trim_clip":
      return {
        title: "裁剪片段",
        detail: `${shortId(values.clip_id)} · ${values.edge === "start" ? "入点" : "出点"} ${signed(Number(values.delta ?? 0))}s`,
      };
    case "timeline_split_clip":
      return {
        title: "分割片段",
        detail: `${shortId(values.clip_id)} · 在 ${toNumber(values.at)}s`,
      };
    case "timeline_delete_clip":
      return {
        title: values.ripple ? "波纹删除片段" : "删除片段",
        detail: shortId(values.clip_id),
      };
    case "timeline_add_track": {
      const kinds: Record<string, string> = { video: "视频", audio: "音频", text: "字幕" };
      return { title: "添加轨道", detail: kinds[String(values.kind)] ?? "视频" };
    }
    default:
      return { title: name, detail: "" };
  }
}

export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0s";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function runStatusLabel(status: AgentRunStatus | undefined): {
  label: string;
  tone: string;
} {
  switch (status) {
    case "thinking":
      return { label: "思考中", tone: "thinking" };
    case "running":
      return { label: "执行中", tone: "running" };
    case "error":
      return { label: "失败", tone: "error" };
    case "stopped":
      return { label: "已停止", tone: "stopped" };
    case "done":
      return { label: "已完成", tone: "done" };
    default:
      return { label: "", tone: "idle" };
  }
}

export function isRunActive(message: AgentFeedMessage): boolean {
  return message.status === "thinking" || message.status === "running";
}

function summarizeSettings(settings: unknown): string {
  if (!settings || typeof settings !== "object") {
    return "";
  }
  const record = settings as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.width === "number" && typeof record.height === "number") {
    parts.push(`${record.width}×${record.height}`);
  }
  if (typeof record.fps === "number") {
    parts.push(`${record.fps}fps`);
  }
  if (typeof record.format === "string") {
    parts.push(record.format.toUpperCase());
  }
  if (typeof record.rangeStart === "number" && typeof record.rangeEnd === "number") {
    parts.push(`${record.rangeStart}–${record.rangeEnd}s`);
  }
  return parts.join(" · ");
}

function shortId(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "界面元素";
  }
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}

function toNumber(value: unknown): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(3).replace(/\.?0+$/, "") : "0";
}

function signed(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2).replace(/\.?0+$/, "")}`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value) ?? String(value);
}
