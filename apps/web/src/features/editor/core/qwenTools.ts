import {
  DEFAULT_TEXT_STYLE,
  type ClipAdjust,
  type Keyframe,
  type RenderSettings,
  type TextStyle,
} from "../data";
import type { ProposedShot } from "./agentApi";
import { approvalDetail, needsApproval } from "./agentGuard";
import { buildStoryPlan, STORY_STYLES, type StoryStyle } from "./story";

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const api = window.XimoCutAgent;
  if (!api) {
    return { ok: false, message: "ximo-Cut AI 接口不可用" };
  }
  if (needsApproval(name)) {
    const approved = await api.requestApproval({
      action:
        name === "timeline_delete_clip"
          ? "删除片段"
          : name === "render_start"
            ? "导出视频"
            : name === "quick_cut"
              ? "一键快剪"
              : "生成导出清单",
      detail: approvalDetail(name, args),
    });
    if (!approved) {
      return { ok: false, message: "用户取消了该操作" };
    }
  }

  switch (name) {
    case "project_get_state":
      return api.getProject();
    case "plan_propose":
      return api.plan.propose(
        Array.isArray(args.shots) ? (args.shots as ProposedShot[]) : [],
      );
    case "ui_snapshot":
      return api.snapshot();
    case "audio_get_analysis":
      return api.audio.getAnalyses();
    case "sfx_list":
      return api.audio.listSfx();
    case "sfx_insert": {
      const effects = await api.audio.listSfx();
      const query = String(args.sfx_id ?? args.name ?? "").trim().toLowerCase();
      if (!query) {
        return { ok: false, message: "请提供要插入的音效 id 或名称" };
      }
      const effect =
        effects.find((item) => item.id === query) ??
        effects.find((item) => item.name.toLowerCase().includes(query)) ??
        effects.find((item) => item.category.toLowerCase().includes(query));
      if (!effect) {
        return { ok: false, message: `没有找到音效「${query}」` };
      }
      return api.audio.insertSfx(effect);
    }
    case "voiceover":
      return api.audio.speak(String(args.text ?? ""), Number(args.rate ?? 0));
    case "caption_transcribe":
      return api.captions.transcribe(args.asset_id ? String(args.asset_id) : undefined);
    case "quick_cut":
      return api.quickCut.run({
        targetDuration: args.target_duration ? Number(args.target_duration) : undefined,
        captions: args.captions === undefined ? undefined : Boolean(args.captions),
        music: args.music === undefined ? undefined : Boolean(args.music),
        vertical: args.vertical === undefined ? undefined : Boolean(args.vertical),
      });
    case "analyze_footage":
      return api.review.footage();
    case "plan_story": {
      const style = String(args.style ?? "cinematic") as StoryStyle;
      const targetDuration = args.target_duration ? Number(args.target_duration) : 30;
      const analyses = await api.review.footage();
      const plan = buildStoryPlan(analyses, { targetDuration, style });
      if (plan.shots.length === 0) {
        return { ok: false, message: "素材里没有达到质量要求的可用镜头，请先导入更清晰的素材。" };
      }
      const result = api.plan.propose(
        plan.shots.map((shot) => ({
          asset_id: shot.assetId,
          title: shot.title,
          note: `${shot.beat} · ${shot.note}`,
          duration: shot.duration,
          source_in: shot.sourceIn,
          beat: shot.beat,
          look: shot.look,
          transition: shot.transition,
        })),
      );
      return {
        ...result,
        style: STORY_STYLES[plan.style].label,
        styleNote: STORY_STYLES[plan.style].description,
        targetDuration: plan.targetDuration,
        totalDuration: plan.totalDuration,
        shots: plan.shots,
      };
    }
    case "review_timeline":
      return api.review.timeline();
    case "review_video":
      return api.review.video(String(args.path ?? ""));
    case "preview_get_state":
      return { ...api.preview.getState(), ...api.context.getState() };
    case "preview_seek":
      return api.preview.seek(Number(args.time ?? 0));
    case "preview_play":
      return api.preview.play();
    case "preview_pause":
      return api.preview.pause();
    case "render_get_settings":
      return api.render.getSettings();
    case "render_update_settings":
      return api.render.updateSettings((args.settings ?? {}) as Partial<RenderSettings>);
    case "render_start":
      return api.render.start((args.settings ?? {}) as Partial<RenderSettings>);
    case "render_batch":
      return api.render.batch(
        Array.isArray(args.jobs)
          ? (args.jobs as Array<Partial<RenderSettings>>)
          : [],
      );
    case "ui_click":
      return api.click(String(args.target ?? ""));
    case "ui_set_value":
      return api.setValue(String(args.target ?? ""), args.value as string | number | boolean);
    case "timeline_drag_clip":
      return api.timeline.dragClip(
        String(args.clip_id ?? ""),
        Number(args.start ?? 0),
        args.track_id ? String(args.track_id) : undefined,
      );
    case "timeline_trim_clip":
      return api.timeline.trimClip(
        String(args.clip_id ?? ""),
        args.edge === "start" ? "start" : "end",
        Number(args.delta ?? 0),
      );
    case "timeline_split_clip":
      return api.timeline.splitClip(String(args.clip_id ?? ""), Number(args.at ?? 0));
    case "timeline_delete_clip":
      return api.timeline.deleteClip(String(args.clip_id ?? ""), Boolean(args.ripple));
    case "timeline_add_track":
      return api.timeline.addTrack(
        args.kind === "audio" ? "audio" : args.kind === "text" ? "text" : "video",
      );
    case "clip_set_transform":
      return api.timeline.setTransform(String(args.clip_id ?? ""), {
        scale: args.scale === undefined ? undefined : Number(args.scale),
        rotation: args.rotation === undefined ? undefined : Number(args.rotation),
        opacity: args.opacity === undefined ? undefined : Number(args.opacity),
        positionX: args.position_x === undefined ? undefined : Number(args.position_x),
        positionY: args.position_y === undefined ? undefined : Number(args.position_y),
      });
    case "clip_set_volume": {
      const clipId = String(args.clip_id ?? "");
      const patch: { volumeDb?: number; muted?: boolean } = {};
      if (args.volume_db !== undefined) {
        patch.volumeDb = Math.min(12, Math.max(-60, Number(args.volume_db)));
      }
      if (args.muted !== undefined) {
        patch.muted = Boolean(args.muted);
      }
      if (Object.keys(patch).length === 0) {
        return { ok: false, message: "请提供 volume_db 或 muted" };
      }
      return api.execute({ type: "clip.update", clipId, patch });
    }
    case "clip_set_speed":
      return api.execute({
        type: "clip.speed",
        clipId: String(args.clip_id ?? ""),
        speed: Number(args.speed ?? 1),
      });
    case "clip_set_adjust": {
      const raw = args.adjust && typeof args.adjust === "object" ? args.adjust : {};
      const allowed: Array<keyof ClipAdjust> = [
        "brightness",
        "contrast",
        "saturation",
        "exposure",
        "temperature",
        "tint",
        "hue",
        "highlights",
        "shadows",
        "vibrance",
        "sharpen",
        "grain",
        "vignette",
        "fade",
      ];
      const adjust: Partial<ClipAdjust> = {};
      for (const key of allowed) {
        const value = (raw as Record<string, unknown>)[key];
        if (value !== undefined && Number.isFinite(Number(value))) {
          adjust[key] = Number(value);
        }
      }
      if (Object.keys(adjust).length === 0) {
        return { ok: false, message: "没有可应用的调色参数" };
      }
      return api.execute({
        type: "clip.update",
        clipId: String(args.clip_id ?? ""),
        patch: { adjust },
      });
    }
    case "clip_set_text_style": {
      const clipId = String(args.clip_id ?? "");
      const clip = api
        .getProject()
        .tracks.flatMap((track) => track.clips)
        .find((item) => item.id === clipId);
      if (!clip || clip.kind !== "text") {
        return { ok: false, message: "找不到可修改的文字片段" };
      }
      const style: TextStyle = {
        ...DEFAULT_TEXT_STYLE,
        ...clip.textStyle,
      };
      if (args.size !== undefined) style.size = Math.min(2.5, Math.max(0.5, Number(args.size)));
      if (args.color !== undefined) style.color = String(args.color);
      if (args.position === "top" || args.position === "center" || args.position === "bottom") {
        style.position = args.position;
      }
      if (args.bold !== undefined) style.bold = Boolean(args.bold);
      if (args.stroke !== undefined) style.stroke = Math.min(10, Math.max(0, Number(args.stroke)));
      if (args.stroke_color !== undefined) style.strokeColor = String(args.stroke_color);
      if (args.background !== undefined) style.background = Boolean(args.background);
      if (args.background_color !== undefined) {
        style.backgroundColor = String(args.background_color);
      }
      if (args.align === "left" || args.align === "center" || args.align === "right") {
        style.align = args.align;
      }
      if (args.animation === "none" || args.animation === "fade" || args.animation === "slide") {
        style.animation = args.animation;
      }
      const patch: { textStyle: TextStyle; text?: string } = { textStyle: style };
      if (args.text !== undefined) {
        patch.text = String(args.text);
      }
      return api.execute({ type: "clip.update", clipId, patch });
    }
    case "clip_set_transition": {
      const edge = args.edge === "out" ? "out" : "in";
      const type = String(args.type ?? "fade");
      const transition =
        type === "none"
          ? null
          : {
              type: type === "flash" ? ("flash" as const) : ("fade" as const),
              duration: Math.min(5, Math.max(0.1, Number(args.duration ?? 0.5))),
            };
      return api.execute({
        type: "clip.transition",
        clipId: String(args.clip_id ?? ""),
        edge,
        transition,
      });
    }
    case "keyframe_add": {
      const property = String(args.property ?? "scale") as Keyframe["property"];
      const allowed: Keyframe["property"][] = [
        "scale",
        "rotation",
        "opacity",
        "positionX",
        "positionY",
        "volumeDb",
      ];
      if (!allowed.includes(property)) {
        return { ok: false, message: `不支持的关键帧属性 ${property}` };
      }
      const easing = String(args.easing ?? "easeInOut") as NonNullable<Keyframe["easing"]>;
      return api.timeline.addKeyframe(String(args.clip_id ?? ""), {
        id: `kf-${Date.now().toString(36)}`,
        property,
        time: Number(args.time ?? 0),
        value: Number(args.value ?? 0),
        easing,
      });
    }
    case "keyframe_remove":
      return api.timeline.removeKeyframe(
        String(args.clip_id ?? ""),
        String(args.keyframe_id ?? ""),
      );
    case "clip_set_mask": {
      const clipId = String(args.clip_id ?? "");
      if (args.remove === true || args.mask === null) {
        return api.timeline.setMask(clipId, null);
      }
      const shape =
        args.shape === "ellipse" || args.shape === "linear" ? args.shape : "rect";
      return api.timeline.setMask(clipId, {
        shape,
        x: Number(args.x ?? 0.5),
        y: Number(args.y ?? 0.5),
        width: Number(args.width ?? 0.6),
        height: Number(args.height ?? 0.6),
        feather: Number(args.feather ?? 0.06),
        invert: Boolean(args.invert),
      });
    }
    case "speed_ramp": {
      const preset =
        args.preset === "fast" || args.preset === "bullet" ? args.preset : "slow";
      return api.timeline.speedRamp(String(args.clip_id ?? ""), preset);
    }
    case "clip_set_blend": {
      const allowed = ["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten"];
      const mode = allowed.includes(String(args.mode)) ? String(args.mode) : "normal";
      return api.timeline.setBlend(
        String(args.clip_id ?? ""),
        mode as "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "darken" | "lighten",
      );
    }
    default:
      return { ok: false, message: `未知工具 ${name}` };
  }
}

export function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
