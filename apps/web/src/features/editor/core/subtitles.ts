export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const TIMECODE = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

export function parseSrt(input: string): SubtitleCue[] {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const cues: SubtitleCue[] = [];

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split("\n").map((line) => line.trim());
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex < 0) {
      continue;
    }
    const [startPart, endPart] = lines[timeIndex].split("-->");
    const start = parseTimestamp(startPart ?? "");
    const end = parseTimestamp(endPart ?? "");
    if (start === null || end === null || end <= start) {
      continue;
    }
    const text = lines
      .slice(timeIndex + 1)
      .filter(Boolean)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!text) {
      continue;
    }
    cues.push({ start, end, text });
  }

  return cues.sort((a, b) => a.start - b.start);
}

function parseTimestamp(value: string): number | null {
  const match = value.match(TIMECODE);
  if (!match) {
    return null;
  }
  const [, hours, minutes, seconds, fraction] = match;
  const milliseconds = Number(fraction.padEnd(3, "0"));
  return (
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + milliseconds / 1000
  );
}
