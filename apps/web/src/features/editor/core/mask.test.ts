import { describe, expect, it } from "vitest";
import { DEFAULT_MASK, maskLabel, maskToCss } from "./mask";

describe("maskToCss", () => {
  it("生成 SVG 亮度蒙版", () => {
    const style = maskToCss(DEFAULT_MASK);
    expect(String(style.maskImage)).toContain("data:image/svg+xml");
    expect(style.maskMode).toBe("luminance");
    expect(style.maskSize).toBe("100% 100%");
  });

  it("支持椭圆与线性形状", () => {
    const ellipse = String(maskToCss({ ...DEFAULT_MASK, shape: "ellipse" }).maskImage);
    expect(decodeURIComponent(ellipse)).toContain("<ellipse");
    const linear = String(maskToCss({ ...DEFAULT_MASK, shape: "linear" }).maskImage);
    expect(decodeURIComponent(linear)).toContain("linearGradient");
  });

  it("反转时交换黑白填充", () => {
    const normal = decodeURIComponent(String(maskToCss(DEFAULT_MASK).maskImage));
    const inverted = decodeURIComponent(
      String(maskToCss({ ...DEFAULT_MASK, invert: true }).maskImage),
    );
    expect(normal).toContain('fill="black"/>');
    expect(inverted).toContain('fill="white"/>');
  });
});

describe("maskLabel", () => {
  it("描述蒙版类型与羽化", () => {
    expect(maskLabel(DEFAULT_MASK)).toContain("矩形蒙版");
    expect(maskLabel({ ...DEFAULT_MASK, invert: true })).toContain("反转");
  });
});
