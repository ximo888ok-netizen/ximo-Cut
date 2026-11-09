import {
  timelineTracks,
  TOTAL_DURATION,
  type Marker,
  type PlanShot,
  type Track,
  type TrackClip,
} from "../data";

export interface ProjectState {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  tracks: Track[];
  markers: Marker[];
  revision: number;
}

export interface CommandResult {
  ok: boolean;
  revision: number;
  error?: string;
}

export type ClipPatch = Partial<
  Pick<
    TrackClip,
    | "name"
    | "text"
    | "textStyle"
    | "muted"
    | "volumeDb"
    | "opacity"
    | "scale"
    | "rotation"
    | "positionX"
    | "positionY"
    | "mask"
    | "blendMode"
    | "speed"
    | "ducking"
    | "denoise"
    | "fadeIn"
    | "fadeOut"
    | "normalized"
    | "eq"
    | "syncOffset"
    | "transitionIn"
    | "transitionOut"
    | "keyframes"
    | "groupId"
    | "filter"
    | "look"
    | "adjust"
  >
>;

export type EditCommand =
  | { type: "clip.insert"; trackId: string; clip: TrackClip }
  | { type: "track.insertClip"; kind: Track["kind"]; clip: TrackClip }
  | { type: "clip.move"; clipId: string; start: number; trackId?: string }
  | {
      type: "clip.trim";
      clipId: string;
      edge: "start" | "end";
      delta: number;
      maxDuration?: number;
    }
  | { type: "clip.split"; clipId: string; at: number }
  | { type: "clip.delete"; clipId: string; ripple?: boolean }
  | { type: "clip.duplicate"; clipId: string }
  | { type: "clip.update"; clipId: string; patch: ClipPatch }
  | { type: "clip.speed"; clipId: string; speed: number }
  | { type: "clip.transition"; clipId: string; edge: "in" | "out"; transition: TrackClip["transitionIn"] | null }
  | { type: "clip.keyframe"; clipId: string; keyframe: NonNullable<TrackClip["keyframes"]>[number] }
  | { type: "clip.keyframeRemove"; clipId: string; keyframeId: string }
  | { type: "clip.group"; clipIds: string[]; groupId: string | null }
  | { type: "marker.add"; time: number; label: string }
  | { type: "marker.remove"; markerId: string }
  | { type: "track.add"; kind: Track["kind"]; name?: string }
  | { type: "track.update"; trackId: string; patch: Partial<Pick<Track, "muted" | "locked" | "hidden">> }
  | { type: "track.replace"; trackId: string; clips: TrackClip[] };

export function createInitialProject(): ProjectState {
  return {
    id: `project-${Date.now().toString(36)}`,
    name: "未命名工程",
    fps: 30,
    width: 1920,
    height: 1080,
    duration: TOTAL_DURATION,
    tracks: structuredClone(timelineTracks),
    markers: [],
    revision: 1,
  };
}

export interface ExecuteOptions {
  coalesceKey?: string;
  coalesceWindowMs?: number;
}

export class EditorStore {
  private project: ProjectState;
  private undoStack: ProjectState[] = [];
  private redoStack: ProjectState[] = [];
  private listeners = new Set<() => void>();
  private lastCoalesceKey: string | null = null;
  private lastCoalesceAt = 0;

  constructor(initial: ProjectState) {
    this.project = initial;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ProjectState => this.project;

  getClip(clipId: string): TrackClip | null {
    for (const track of this.project.tracks) {
      const clip = track.clips.find((item) => item.id === clipId);
      if (clip) {
        return clip;
      }
    }
    return null;
  }

  loadProject(project: ProjectState) {
    this.project = structuredClone(project);
    this.project.duration = computeTimelineDuration(this.project);
    this.undoStack = [];
    this.redoStack = [];
    this.lastCoalesceKey = null;
    this.lastCoalesceAt = 0;
    this.emit();
  }

  execute = (command: EditCommand, options?: ExecuteOptions): CommandResult => {
    const draft = structuredClone(this.project);
    let error: string | null = null;

    switch (command.type) {
      case "clip.insert":
        error = insertClip(draft, command.trackId, command.clip);
        break;
      case "track.insertClip":
        error = insertClipWithNewTrack(draft, command.kind, command.clip);
        break;
      case "clip.move":
        error = moveClip(draft, command.clipId, command.start, command.trackId);
        break;
      case "clip.trim":
        error = trimClip(
          draft,
          command.clipId,
          command.edge,
          command.delta,
          command.maxDuration,
        );
        break;
      case "clip.split":
        error = splitClip(draft, command.clipId, command.at);
        break;
      case "clip.delete":
        error = deleteClip(draft, command.clipId, command.ripple ?? false);
        break;
      case "clip.duplicate":
        error = duplicateClip(draft, command.clipId);
        break;
      case "clip.update":
        error = updateClip(draft, command.clipId, command.patch);
        break;
      case "clip.speed":
        error = setClipSpeed(draft, command.clipId, command.speed);
        break;
      case "clip.transition":
        error = setClipTransition(draft, command.clipId, command.edge, command.transition);
        break;
      case "clip.keyframe":
        error = addKeyframe(draft, command.clipId, command.keyframe);
        break;
      case "clip.keyframeRemove":
        error = removeKeyframe(draft, command.clipId, command.keyframeId);
        break;
      case "clip.group":
        error = groupClips(draft, command.clipIds, command.groupId);
        break;
      case "marker.add":
        error = addMarker(draft, command.time, command.label);
        break;
      case "marker.remove":
        error = removeMarker(draft, command.markerId);
        break;
      case "track.add":
        error = addTrack(draft, command.kind, command.name);
        break;
      case "track.update":
        error = updateTrack(draft, command.trackId, command.patch);
        break;
      case "track.replace":
        error = replaceTrack(draft, command.trackId, command.clips);
        break;
    }

    if (error) {
      return { ok: false, revision: this.project.revision, error };
    }

    draft.duration = computeTimelineDuration(draft);
    draft.revision = this.project.revision + 1;
    const validation = validateProject(draft);
    if (validation) {
      return { ok: false, revision: this.project.revision, error: validation };
    }

    const coalesceKey = options?.coalesceKey;
    const windowMs = options?.coalesceWindowMs ?? 1000;
    const coalesce =
      Boolean(coalesceKey) &&
      coalesceKey === this.lastCoalesceKey &&
      Date.now() - this.lastCoalesceAt <= windowMs;
    if (!coalesce) {
      this.undoStack.push(this.project);
    }
    this.redoStack = [];
    this.project = draft;
    this.lastCoalesceKey = coalesceKey ?? null;
    this.lastCoalesceAt = Date.now();
    this.emit();
    return { ok: true, revision: draft.revision };
  };

  undo = (): CommandResult => {
    const previous = this.undoStack.pop();
    if (!previous) {
      return { ok: false, revision: this.project.revision, error: "没有可撤销的操作" };
    }
    const current = this.project;
    const restored = structuredClone(previous);
    restored.revision = current.revision + 1;
    this.redoStack.push(current);
    this.project = restored;
    this.lastCoalesceKey = null;
    this.lastCoalesceAt = 0;
    this.emit();
    return { ok: true, revision: restored.revision };
  };

  redo = (): CommandResult => {
    const next = this.redoStack.pop();
    if (!next) {
      return { ok: false, revision: this.project.revision, error: "没有可重做的操作" };
    }
    const current = this.project;
    const restored = structuredClone(next);
    restored.revision = current.revision + 1;
    this.undoStack.push(current);
    this.project = restored;
    this.lastCoalesceKey = null;
    this.lastCoalesceAt = 0;
    this.emit();
    return { ok: true, revision: restored.revision };
  };

  checkpoint(): ProjectState {
    return structuredClone(this.project);
  }

  restore(snapshot: ProjectState): CommandResult {
    this.undoStack.push(this.project);
    this.redoStack = [];
    const restored = structuredClone(snapshot);
    restored.revision = this.project.revision + 1;
    this.project = restored;
    this.lastCoalesceKey = null;
    this.lastCoalesceAt = 0;
    this.emit();
    return { ok: true, revision: restored.revision };
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function planShotsToClips(shots: PlanShot[]): TrackClip[] {
  let cursor = 0;
  return shots.map((shot, index) => {
    const duration = Number.parseFloat(shot.duration.replace("s", "")) || 3;
    const clip: TrackClip = {
      id: `plan-clip-${index + 1}`,
      name: shot.title,
      start: Number(cursor.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      kind: "video",
      tone: shot.tone,
      assetId: shot.assetId,
      sourceIn: shot.sourceIn ?? 0,
      speed: shot.speed && shot.speed !== 1 ? shot.speed : undefined,
      transitionIn: shot.transition ? { type: shot.transition, duration: 0.3 } : undefined,
      look: shot.look,
    };
    cursor += duration;
    return clip;
  });
}

function findClip(project: ProjectState, clipId: string) {
  for (const track of project.tracks) {
    const index = track.clips.findIndex((clip) => clip.id === clipId);
    if (index >= 0) {
      return { track, clip: track.clips[index], index };
    }
  }
  return null;
}

function insertClip(project: ProjectState, trackId: string, clip: TrackClip): string | null {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) {
    return `找不到轨道 ${trackId}`;
  }
  if (track.locked) {
    return `轨道 ${track.name} 已锁定`;
  }
  if (track.kind !== clip.kind) {
    return "片段类型与轨道不一致";
  }
  if (clip.duration < 0.2 || clip.start < 0) {
    return "片段时长或起点不合法";
  }
  const overlaps = track.clips.some(
    (item) =>
      clip.start < item.start + item.duration - 0.001 &&
      clip.start + clip.duration > item.start + 0.001,
  );
  if (overlaps) {
    return `轨道 ${track.name} 在 ${clip.start.toFixed(2)}s 处已有片段`;
  }
  track.clips.push(structuredClone(clip));
  sortClips(track);
  return null;
}

function insertClipWithNewTrack(
  project: ProjectState,
  kind: Track["kind"],
  clip: TrackClip,
): string | null {
  if (clip.kind !== kind) {
    return "片段类型与轨道不一致";
  }
  const track = createTrack(project, kind);
  return insertClip(project, track.id, clip);
}

function moveClip(
  project: ProjectState,
  clipId: string,
  start: number,
  trackId?: string,
): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const targetTrack = trackId
    ? project.tracks.find((track) => track.id === trackId)
    : found.track;
  if (!targetTrack) {
    return `找不到目标轨道 ${trackId}`;
  }
  if (targetTrack.locked) {
    return `轨道 ${targetTrack.name} 已锁定`;
  }
  if (targetTrack.kind !== found.clip.kind) {
    return "片段类型与目标轨道不一致";
  }

  const nextStart = Math.max(0, start);
  const moved: TrackClip = { ...found.clip, start: nextStart };

  if (targetTrack.id !== found.track.id) {
    found.track.clips.splice(found.index, 1);
    targetTrack.clips.push(moved);
  } else {
    found.track.clips[found.index] = moved;
  }

  sortClips(targetTrack);
  return null;
}

function trimClip(
  project: ProjectState,
  clipId: string,
  edge: "start" | "end",
  delta: number,
  maxDuration?: number,
): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const clip = found.clip;
  const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
  if (edge === "start") {
    const nextStart = clamp(clip.start + delta, 0, clip.start + clip.duration - 0.2);
    const nextDuration = clip.duration - (nextStart - clip.start);
    // 起点裁剪会同时前移源素材入点，变速片段需要按速度换算
    clip.sourceIn = Math.max(0, (clip.sourceIn ?? 0) + (nextStart - clip.start) * speed);
    clip.start = nextStart;
    clip.duration = nextDuration;
  } else {
    const limit =
      typeof maxDuration === "number" && maxDuration > 0 ? maxDuration : Number.POSITIVE_INFINITY;
    clip.duration = Math.max(0.2, Math.min(limit, clip.duration + delta));
  }

  return null;
}

function splitClip(project: ProjectState, clipId: string, at: number): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const clip = found.clip;
  const relative = at - clip.start;
  if (relative <= 0.15 || relative >= clip.duration - 0.15) {
    return "切割点必须位于片段内部";
  }

  const leftDuration = Number(relative.toFixed(3));
  const rightDuration = Number((clip.duration - relative).toFixed(3));
  const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
  const left: TrackClip = {
    ...clip,
    duration: leftDuration,
    transitionOut: undefined,
    fadeOut: undefined,
  };
  const right: TrackClip = {
    ...clip,
    id: `${clip.id}-b-${Date.now().toString(36)}`,
    name: `${clip.name} B`,
    start: Number(at.toFixed(3)),
    duration: rightDuration,
    sourceIn: (clip.sourceIn ?? 0) + leftDuration * speed,
    transitionIn: undefined,
    fadeIn: undefined,
  };
  left.name = `${clip.name} A`;

  found.track.clips.splice(found.index, 1, left, right);
  sortClips(found.track);
  return null;
}

function deleteClip(project: ProjectState, clipId: string, ripple: boolean): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const removedEnd = found.clip.start + found.clip.duration;
  found.track.clips.splice(found.index, 1);

  if (ripple) {
    for (const clip of found.track.clips) {
      if (clip.start >= removedEnd - 0.001) {
        clip.start = Number(Math.max(0, clip.start - found.clip.duration).toFixed(3));
      }
    }
  }

  return null;
}

function duplicateClip(project: ProjectState, clipId: string): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const copy: TrackClip = {
    ...structuredClone(found.clip),
    id: `${found.clip.id}-copy-${Date.now().toString(36)}`,
    name: `${found.clip.name} 副本`,
    start: Number((found.clip.start + found.clip.duration + 0.1).toFixed(3)),
  };
  found.track.clips.push(copy);
  sortClips(found.track);
  return null;
}

function updateClip(project: ProjectState, clipId: string, patch: ClipPatch): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }
  Object.assign(found.clip, patch);
  return null;
}

function setClipSpeed(project: ProjectState, clipId: string, speed: number): string | null {
  if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) {
    return "变速范围必须在 0.25x 到 4x 之间";
  }
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }

  const currentSpeed = found.clip.speed ?? 1;
  const nextDuration = Number((found.clip.duration * (currentSpeed / speed)).toFixed(3));
  const nextEnd = found.clip.start + nextDuration;
  const nextClip = found.track.clips
    .filter((clip) => clip.id !== clipId && clip.start >= found.clip.start)
    .sort((a, b) => a.start - b.start)[0];
  if (nextClip && nextEnd > nextClip.start + 0.001) {
    return "变速后片段会与下一个片段重叠";
  }

  found.clip.speed = speed;
  found.clip.duration = nextDuration;
  return null;
}

function setClipTransition(
  project: ProjectState,
  clipId: string,
  edge: "in" | "out",
  transition: TrackClip["transitionIn"] | null,
): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }
  if (!transition) {
    delete found.clip[edge === "in" ? "transitionIn" : "transitionOut"];
    return null;
  }
  const duration = Math.min(2, Math.max(0.1, transition.duration));
  const spec = { ...transition, duration };
  if (edge === "in") {
    found.clip.transitionIn = spec;
  } else {
    found.clip.transitionOut = spec;
  }
  return null;
}

function addKeyframe(
  project: ProjectState,
  clipId: string,
  keyframe: NonNullable<TrackClip["keyframes"]>[number],
): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }
  const relativeTime = Math.max(0, Math.min(found.clip.duration, keyframe.time));
  found.clip.keyframes = [
    ...(found.clip.keyframes ?? []).filter(
      (item) =>
        item.property !== keyframe.property ||
        Math.abs(item.time - relativeTime) > 0.001,
    ),
    { ...keyframe, time: relativeTime },
  ].sort((a, b) => a.time - b.time);
  return null;
}

function removeKeyframe(
  project: ProjectState,
  clipId: string,
  keyframeId: string,
): string | null {
  const found = findClip(project, clipId);
  if (!found) {
    return `找不到片段 ${clipId}`;
  }
  if (found.track.locked) {
    return `轨道 ${found.track.name} 已锁定`;
  }
  const before = found.clip.keyframes ?? [];
  const next = before.filter((keyframe) => keyframe.id !== keyframeId);
  if (next.length === before.length) {
    return "找不到要删除的关键帧";
  }
  found.clip.keyframes = next;
  return null;
}

function groupClips(
  project: ProjectState,
  clipIds: string[],
  groupId: string | null,
): string | null {
  for (const clipId of clipIds) {
    const found = findClip(project, clipId);
    if (!found) {
      return `找不到片段 ${clipId}`;
    }
    if (groupId) {
      found.clip.groupId = groupId;
    } else {
      delete found.clip.groupId;
    }
  }
  return null;
}

function addMarker(project: ProjectState, time: number, label: string): string | null {
  const safeTime = Math.min(project.duration, Math.max(0, time));
  project.markers.push({
    id: `marker-${Date.now().toString(36)}`,
    time: Number(safeTime.toFixed(3)),
    label: label.trim() || "标记",
  });
  project.markers.sort((a, b) => a.time - b.time);
  return null;
}

function removeMarker(project: ProjectState, markerId: string): string | null {
  const index = project.markers.findIndex((marker) => marker.id === markerId);
  if (index < 0) {
    return `找不到标记 ${markerId}`;
  }
  project.markers.splice(index, 1);
  return null;
}

function addTrack(project: ProjectState, kind: Track["kind"], name?: string): string | null {
  createTrack(project, kind, name);
  return null;
}

function createTrack(project: ProjectState, kind: Track["kind"], name?: string): Track {
  const prefix = kind === "video" ? "V" : kind === "audio" ? "A" : "T";
  const usedNames = new Set(project.tracks.map((track) => track.name));
  let index = 1;
  while (usedNames.has(`${prefix}${index}`)) {
    index += 1;
  }
  const track: Track = {
    id: `track-${kind}-${Date.now().toString(36)}`,
    name: name ?? `${prefix}${index}`,
    role: kind === "video" ? "视频轨道" : kind === "audio" ? "音频轨道" : "字幕轨道",
    kind,
    height: kind === "video" ? 52 : kind === "audio" ? 40 : 34,
    clips: [],
  };
  if (kind === "audio") {
    project.tracks.push(track);
    return track;
  }
  const firstSameKind = project.tracks.findIndex((item) => item.kind === kind);
  if (firstSameKind >= 0) {
    project.tracks.splice(firstSameKind, 0, track);
  } else {
    project.tracks.push(track);
  }
  return track;
}

function updateTrack(
  project: ProjectState,
  trackId: string,
  patch: Partial<Pick<Track, "muted" | "locked" | "hidden">>,
): string | null {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) {
    return `找不到轨道 ${trackId}`;
  }
  Object.assign(track, patch);
  return null;
}

function replaceTrack(
  project: ProjectState,
  trackId: string,
  clips: TrackClip[],
): string | null {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) {
    return `找不到轨道 ${trackId}`;
  }
  if (track.locked) {
    return `轨道 ${track.name} 已锁定`;
  }
  track.clips = structuredClone(clips);
  sortClips(track);
  return null;
}

function sortClips(track: Track) {
  track.clips.sort((a, b) => a.start - b.start);
}

function computeTimelineDuration(project: ProjectState): number {
  const end = project.tracks.reduce((max, track) => {
    const trackEnd = track.clips.reduce(
      (trackMax, clip) => Math.max(trackMax, clip.start + clip.duration),
      0,
    );
    return Math.max(max, trackEnd);
  }, 0);
  return Math.max(TOTAL_DURATION, Math.ceil((end + 10) / 30) * 30);
}

function validateProject(project: ProjectState): string | null {
  for (const track of project.tracks) {
    const sorted = [...track.clips].sort((a, b) => a.start - b.start);
    let previousEnd = -1;
    for (const clip of sorted) {
      if (clip.duration < 0.2) {
        return `片段 ${clip.name} 时长过短`;
      }
      if (clip.start < 0) {
        return `片段 ${clip.name} 起点小于 0`;
      }
      if (clip.start + clip.duration > project.duration + 0.01) {
        return `片段 ${clip.name} 超出时间线`;
      }
      if (clip.start < previousEnd - 0.001) {
        return `轨道 ${track.name} 上的片段 ${clip.name} 与其他片段重叠`;
      }
      previousEnd = clip.start + clip.duration;
    }
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
