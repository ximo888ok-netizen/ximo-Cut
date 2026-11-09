export function summarizeToolResult(output: unknown): string {
  if (output === null || output === undefined) {
    return "";
  }
  if (typeof output === "string") {
    return clipText(output, 120);
  }
  if (Array.isArray(output)) {
    return `${output.length} 条记录`;
  }
  if (typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (record.ok === false) {
      return clipText(String(record.message ?? "执行失败"), 120);
    }
    if (Array.isArray(record.elements)) {
      return `${record.elements.length} 个可操作元素`;
    }
    if (Array.isArray(record.tracks)) {
      const clips = record.tracks.reduce(
        (sum, track) =>
          sum + (Array.isArray((track as { clips?: unknown[] })?.clips)
            ? (track as { clips: unknown[] }).clips.length
            : 0),
        0,
      );
      return `${record.tracks.length} 条轨道 · ${clips} 个片段`;
    }
    if (record.ok === true) {
      return clipText(String(record.message ?? "完成"), 120);
    }
    if (typeof record.width === "number" && typeof record.height === "number") {
      return `${record.width}×${record.height}`;
    }
    return clipText(JSON.stringify(output), 120);
  }
  return String(output);
}

export function outputFailed(output: unknown): boolean {
  return Boolean(
    output && typeof output === "object" && (output as { ok?: unknown }).ok === false,
  );
}

export function formatJson(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  try {
    return clipText(JSON.stringify(value, null, 2), 1600);
  } catch {
    return String(value);
  }
}

export function clipText(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
