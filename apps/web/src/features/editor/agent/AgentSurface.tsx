import { useEffect, useRef, useState, type ReactNode } from "react";
import { AgentBubble } from "./AgentBubble";
import { AgentDock, type AgentTab } from "./AgentDock";

const BUBBLE_SIZE = 54;
const GAP = 14;
const MARGIN = 16;
const DOCK_WIDTH = 392;
const STORAGE_KEY = "ximo-cut.agent.bubble";

interface Point {
  x: number;
  y: number;
}

interface AgentSurfaceProps {
  open: boolean;
  tab: AgentTab;
  thinking: boolean;
  modelLabel: string;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: AgentTab) => void;
  onOpenSettings: () => void;
  chat: ReactNode;
  replica: ReactNode;
  scripts: ReactNode;
}

export function AgentSurface({
  open,
  tab,
  thinking,
  modelLabel,
  onOpenChange,
  onTabChange,
  onOpenSettings,
  chat,
  replica,
  scripts,
}: AgentSurfaceProps) {
  const [position, setPosition] = useState<Point>(loadPosition);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: Point;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPosition((current) => clampPosition(current, window.innerWidth, window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      moved: false,
      pointerId: event.pointerId,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      drag.moved = true;
      setDragging(true);
    }
    if (drag.moved) {
      setPosition(
        clampPosition(
          { x: drag.origin.x + dx, y: drag.origin.y + dy },
          window.innerWidth,
          window.innerHeight,
        ),
      );
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    if (!drag.moved) {
      onOpenChange(!open);
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const next = clampPosition(
      { x: drag.origin.x + dx, y: drag.origin.y + dy },
      window.innerWidth,
      window.innerHeight,
    );
    setPosition(next);
    persistPosition(next);
  };

  const dockWidth = Math.min(DOCK_WIDTH, viewport.width - MARGIN * 2);
  const dockStyle = placeDock(position, dockWidth, viewport);

  return (
    <>
      {open && (
        <AgentDock
          tab={tab}
          style={dockStyle}
          thinking={thinking}
          modelLabel={modelLabel}
          onTabChange={onTabChange}
          onClose={() => onOpenChange(false)}
          onOpenSettings={onOpenSettings}
          chat={chat}
          replica={replica}
          scripts={scripts}
        />
      )}
      <AgentBubble
        open={open}
        thinking={thinking}
        dragging={dragging}
        style={{ left: position.x, top: position.y }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </>
  );
}

function defaultPosition(): Point {
  if (typeof window === "undefined") {
    return { x: 900, y: 600 };
  }
  return {
    x: window.innerWidth - BUBBLE_SIZE - 24,
    y: window.innerHeight - BUBBLE_SIZE - 64,
  };
}

function loadPosition(): Point {
  if (typeof window === "undefined") {
    return defaultPosition();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Point;
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return clampPosition(parsed, window.innerWidth, window.innerHeight);
      }
    }
  } catch {
    // 忽略损坏的位置记录
  }
  return defaultPosition();
}

function persistPosition(position: Point) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // 存储不可用时保持当前会话位置
  }
}

function clampPosition(position: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(MARGIN, position.x), Math.max(MARGIN, width - BUBBLE_SIZE - MARGIN)),
    y: Math.min(Math.max(MARGIN, position.y), Math.max(MARGIN, height - BUBBLE_SIZE - MARGIN)),
  };
}

function placeDock(
  bubble: Point,
  width: number,
  viewport: { width: number; height: number },
) {
  const maxHeight = Math.min(620, viewport.height - MARGIN * 2);
  const spaceAbove = bubble.y - GAP - MARGIN;
  const spaceBelow = viewport.height - (bubble.y + BUBBLE_SIZE) - GAP - MARGIN;
  const placeAbove = spaceAbove >= spaceBelow;
  const available = Math.max(240, placeAbove ? spaceAbove : spaceBelow);
  const height = Math.min(maxHeight, available);
  const top = placeAbove ? bubble.y - GAP - height : bubble.y + BUBBLE_SIZE + GAP;
  const left = Math.min(
    Math.max(MARGIN, bubble.x + BUBBLE_SIZE - width),
    Math.max(MARGIN, viewport.width - width - MARGIN),
  );
  return {
    left,
    top: Math.min(Math.max(MARGIN, top), Math.max(MARGIN, viewport.height - height - MARGIN)),
    width,
    height,
  };
}
