import { describe, expect, it } from "vitest";
import { formatReview, reviewGrade, type ReviewReport } from "./review";

const report: ReviewReport = {
  metrics: {
    duration: 30,
    scenes: 9,
    blackRatio: 0.01,
    freezeRatio: 0.02,
    loudness: -15.8,
    peak: -1.2,
    avgShot: 3,
  },
  issues: [{ level: "info", text: "节奏正常" }],
  score: 92,
};

describe("reviewGrade", () => {
  it("按分数给出可发布等级", () => {
    expect(reviewGrade(92).label).toBe("可直接发布");
    expect(reviewGrade(84).label).toBe("小修即可");
    expect(reviewGrade(70).label).toBe("需要再剪一轮");
    expect(reviewGrade(40).label).toBe("问题较多");
  });
});

describe("formatReview", () => {
  it("汇总分数、镜头与响度", () => {
    const text = formatReview(report);
    expect(text).toContain("92 分");
    expect(text).toContain("9 个镜头");
    expect(text).toContain("-15.8 LUFS");
  });

  it("没有音频时给出明确提示", () => {
    const silent = {
      ...report,
      metrics: { ...report.metrics, loudness: null },
    };
    expect(formatReview(silent)).toContain("未检测到音频");
  });
});
