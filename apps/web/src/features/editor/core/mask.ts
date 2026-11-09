import type { CSSProperties } from "react";
import type { ClipMask } from "../data";

export const DEFAULT_MASK: ClipMask = {
  shape: "rect",
  x: 0.5,
  y: 0.5,
  width: 0.6,
  height: 0.6,
  feather: 0.06,
  invert: false,
};

/** 把蒙版编译成 SVG 亮度蒙版，预览与导出使用同一套形状参数 */
export function maskToCss(mask: ClipMask): CSSProperties {
  const x0 = (mask.x - mask.width / 2) * 100;
  const x1 = (mask.x + mask.width / 2) * 100;
  const y0 = (mask.y - mask.height / 2) * 100;
  const blur = Math.max(0, Math.min(0.5, mask.feather)) * 50;
  const background = mask.invert ? "white" : "black";
  const fill = mask.invert ? "black" : "white";

  let shape = "";
  if (mask.shape === "ellipse") {
    shape = `<ellipse cx="${(mask.x * 100).toFixed(2)}" cy="${(mask.y * 100).toFixed(2)}" rx="${(mask.width * 50).toFixed(2)}" ry="${(mask.height * 50).toFixed(2)}" fill="${fill}" filter="url(#b)"/>`;
  } else if (mask.shape === "linear") {
    shape = `<rect x="${x0.toFixed(2)}" y="0" width="${Math.max(0.1, x1 - x0).toFixed(2)}" height="100" fill="url(#g)" filter="url(#b)"/>`;
  } else {
    shape = `<rect x="${x0.toFixed(2)}" y="${y0.toFixed(2)}" width="${(mask.width * 100).toFixed(2)}" height="${(mask.height * 100).toFixed(2)}" fill="${fill}" filter="url(#b)"/>`;
  }

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">',
    "<defs>",
    `<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur.toFixed(2)}"/></filter>`,
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>',
    "</defs>",
    `<rect width="100" height="100" fill="${background}"/>`,
    shape,
    "</svg>",
  ].join("");

  return {
    maskImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    maskMode: "luminance",
    maskSize: "100% 100%",
    maskRepeat: "no-repeat",
    maskPosition: "center",
  };
}

export function maskLabel(mask: ClipMask): string {
  const shapes: Record<ClipMask["shape"], string> = {
    rect: "矩形",
    ellipse: "椭圆",
    linear: "线性",
  };
  return `${shapes[mask.shape]}蒙版 · ${Math.round(mask.feather * 100)}% 羽化${mask.invert ? " · 反转" : ""}`;
}
