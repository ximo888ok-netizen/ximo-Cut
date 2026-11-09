import type { TransitionPreset } from "./types";

/**
 * 转场集中在真实可渲染的淡化家族：黑场淡入淡出与闪白。
 * 滑动、圆形、故障等需要多轨合成，暂不提供，避免出现无法导出的假选项。
 */
export const TRANSITION_PRESETS: TransitionPreset[] = [
  { id: "tr-none", label: "无转场", type: "fade", duration: 0, note: "移除转场" },
  { id: "tr-black-30", label: "黑场淡化", type: "fade", duration: 0.3, note: "0.3s" },
  { id: "tr-black-50", label: "黑场淡化", type: "fade", duration: 0.5, note: "0.5s" },
  { id: "tr-black-80", label: "黑场淡化", type: "fade", duration: 0.8, note: "0.8s" },
  { id: "tr-black-120", label: "缓慢黑场", type: "fade", duration: 1.2, note: "1.2s" },
  { id: "tr-flash-20", label: "闪白", type: "flash", duration: 0.2, note: "0.2s" },
  { id: "tr-flash-40", label: "闪白", type: "flash", duration: 0.4, note: "0.4s" },
  { id: "tr-flash-70", label: "闪白", type: "flash", duration: 0.7, note: "0.7s" },
  { id: "tr-white-100", label: "白场淡化", type: "flash", duration: 1, note: "1.0s" },
];
