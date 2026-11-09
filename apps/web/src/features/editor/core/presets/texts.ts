import type { TextPreset } from "./types";

const base = { size: 1, color: "white", position: "bottom" as const };

/** 36 个文本样式：基础排版、花字、常用模板。 */
export const TEXT_PRESETS: TextPreset[] = [
  // 基础
  { id: "txt-default", label: "默认文本", category: "基础", sample: "输入文字", style: { ...base } },
  { id: "txt-title", label: "大标题", category: "基础", sample: "标题文字", style: { ...base, size: 2, bold: true, position: "center" } },
  { id: "txt-subtitle", label: "副标题", category: "基础", sample: "副标题文字", style: { ...base, size: 1.35, bold: true } },
  { id: "txt-body", label: "正文", category: "基础", sample: "正文内容", style: { ...base, size: 1 } },
  { id: "txt-quote", label: "引用", category: "基础", sample: "「一句话摘录」", style: { ...base, size: 1.15, color: "white" } },
  { id: "txt-label", label: "标签", category: "基础", sample: "标签", style: { ...base, size: 0.85, background: true, backgroundColor: "black", position: "top" } },
  { id: "txt-number", label: "序号", category: "基础", sample: "01", style: { ...base, size: 2.2, bold: true, position: "top" } },
  { id: "txt-note", label: "注释", category: "基础", sample: "注释文字", style: { ...base, size: 0.7, color: "white" } },

  // 花字
  { id: "art-white-black", label: "白字黑边", category: "花字", sample: "白字黑边", style: { ...base, bold: true, stroke: 2, strokeColor: "black" } },
  { id: "art-black-white", label: "黑字白边", category: "花字", sample: "黑字白边", style: { ...base, color: "black", bold: true, stroke: 2, strokeColor: "white" } },
  { id: "art-yellow-box", label: "黄底黑字", category: "花字", sample: "重点提示", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "yellow" } },
  { id: "art-red-box", label: "红底白字", category: "花字", sample: "紧急通知", style: { ...base, bold: true, background: true, backgroundColor: "red" } },
  { id: "art-blue-box", label: "蓝底白字", category: "花字", sample: "信息提示", style: { ...base, bold: true, background: true, backgroundColor: "blue" } },
  { id: "art-green-box", label: "绿底黑字", category: "花字", sample: "已完成", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "green" } },
  { id: "art-pink-box", label: "粉底白字", category: "花字", sample: "少女心", style: { ...base, bold: true, background: true, backgroundColor: "magenta" } },
  { id: "art-black-yellow", label: "黑底黄字", category: "花字", sample: "重要信息", style: { ...base, color: "yellow", bold: true, background: true, backgroundColor: "black" } },
  { id: "art-variety", label: "综艺描边", category: "花字", sample: "哈哈哈哈哈", style: { ...base, color: "yellow", bold: true, stroke: 3, strokeColor: "black", size: 1.5 } },
  { id: "art-news", label: "新闻条", category: "花字", sample: "今日要闻速览", style: { ...base, color: "white", bold: true, background: true, backgroundColor: "blue", align: "left", position: "top" } },
  { id: "art-intro", label: "人物介绍", category: "花字", sample: "嘉宾 · 张三", style: { ...base, size: 0.9, background: true, backgroundColor: "black", align: "left" } },
  { id: "art-opening", label: "片头标题", category: "花字", sample: "我的第一部短片", style: { ...base, size: 1.9, bold: true, stroke: 2, strokeColor: "black", position: "center" } },
  { id: "art-ending", label: "片尾字幕", category: "花字", sample: "感谢观看", style: { ...base, size: 1.4, bold: true, position: "center" } },
  { id: "art-emphasis", label: "强调标签", category: "花字", sample: "必看", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "yellow", position: "top", size: 1.1 } },
  { id: "art-big-number", label: "数字大字", category: "花字", sample: "100%", style: { ...base, size: 2.4, bold: true, stroke: 2, strokeColor: "black", position: "center" } },
  { id: "art-bilingual", label: "双语字幕", category: "花字", sample: "你好世界 / Hello", style: { ...base, size: 0.95, bold: true, stroke: 1, strokeColor: "black" } },

  // 模板
  { id: "tpl-opening", label: "开场白", category: "模板", sample: "大家好，欢迎来到本期视频", style: { ...base, size: 1.2, bold: true, position: "center" } },
  { id: "tpl-topic", label: "今日话题", category: "模板", sample: "今日话题：如何高效剪辑", style: { ...base, size: 1.1, background: true, backgroundColor: "black", position: "top" } },
  { id: "tpl-step-1", label: "步骤一", category: "模板", sample: "第一步 · 导入素材", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "yellow", position: "top" } },
  { id: "tpl-step-2", label: "步骤二", category: "模板", sample: "第二步 · 调整节奏", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "yellow", position: "top" } },
  { id: "tpl-step-3", label: "步骤三", category: "模板", sample: "第三步 · 导出成片", style: { ...base, color: "black", bold: true, background: true, backgroundColor: "yellow", position: "top" } },
  { id: "tpl-place", label: "地点打卡", category: "模板", sample: "📍 上海 · 外滩", style: { ...base, size: 1.05, bold: true, background: true, backgroundColor: "black" } },
  { id: "tpl-price", label: "价格标签", category: "模板", sample: "¥ 99 起", style: { ...base, size: 1.5, color: "black", bold: true, background: true, backgroundColor: "yellow", position: "center" } },
  { id: "tpl-review", label: "好评推荐", category: "模板", sample: "★★★★★ 强烈推荐", style: { ...base, color: "yellow", bold: true, stroke: 2, strokeColor: "black" } },
  { id: "tpl-countdown", label: "倒计时", category: "模板", sample: "3 秒后开始", style: { ...base, size: 1.8, bold: true, color: "red", stroke: 2, strokeColor: "white", position: "center" } },
  { id: "tpl-follow", label: "结尾关注", category: "模板", sample: "点赞关注，下期再见", style: { ...base, size: 1.3, bold: true, position: "center" } },
  { id: "tpl-bar", label: "字幕条", category: "模板", sample: "这是一条底部字幕条", style: { ...base, size: 0.9, background: true, backgroundColor: "black" } },
  { id: "tpl-quote-gold", label: "金句", category: "模板", sample: "「慢慢来，比较快」", style: { ...base, size: 1.35, bold: true, position: "center" } },

  // 场景模板扩展
  { id: "tpl-street", label: "街头采访", category: "模板", sample: "街头采访 · 第 1 期", style: { ...base, size: 1.15, bold: true, background: true, backgroundColor: "black", position: "top", align: "left" } },
  { id: "tpl-shop", label: "探店打卡", category: "模板", sample: "探店｜这家店值得来", style: { ...base, size: 1.1, bold: true, background: true, backgroundColor: "yellow", color: "black", position: "top" } },
  { id: "tpl-unbox", label: "开箱", category: "模板", sample: "开箱啦！", style: { ...base, size: 1.8, bold: true, stroke: 2, strokeColor: "black", position: "center" } },
  { id: "tpl-tutorial", label: "教程步骤", category: "模板", sample: "Step 1 · 打开设置", style: { ...base, size: 1, bold: true, background: true, backgroundColor: "blue", position: "top", align: "left" } },
  { id: "tpl-compare", label: "前后对比", category: "模板", sample: "BEFORE / AFTER", style: { ...base, size: 1.3, bold: true, stroke: 2, strokeColor: "black", position: "center" } },
  { id: "tpl-list", label: "清单", category: "模板", sample: "① 先定主题 ② 再写脚本", style: { ...base, size: 0.95, align: "left", background: true, backgroundColor: "black" } },
  { id: "tpl-qa", label: "问答", category: "模板", sample: "Q：为什么画面发灰？", style: { ...base, size: 1.05, bold: true, background: true, backgroundColor: "black", position: "top", align: "left" } },
  { id: "tpl-giveaway", label: "抽奖", category: "模板", sample: "评论区抽 3 位送同款", style: { ...base, size: 1.1, bold: true, background: true, backgroundColor: "red" } },
  { id: "tpl-live", label: "直播预告", category: "模板", sample: "今晚 8 点直播间见", style: { ...base, size: 1.2, bold: true, background: true, backgroundColor: "magenta", position: "top" } },
  { id: "tpl-topbar", label: "顶部字幕条", category: "模板", sample: "顶部信息条", style: { ...base, size: 0.9, position: "top", background: true, backgroundColor: "black", align: "left" } },
  { id: "tpl-en-quote", label: "英文金句", category: "模板", sample: "STAY WILD", style: { ...base, size: 1.6, bold: true, stroke: 2, strokeColor: "black", position: "center" } },
  { id: "tpl-datetime", label: "日期时间", category: "模板", sample: "2026.10.27 · 上海", style: { ...base, size: 0.85, background: true, backgroundColor: "black", align: "left" } },
];

/** 12 种字幕预设，应用到选中的字幕片段或直接新建。 */
export const SUBTITLE_PRESETS: TextPreset[] = [
  { id: "sub-white", label: "白字黑边", category: "通用", sample: "字幕样式", style: { ...base, bold: true, stroke: 2, strokeColor: "black" } },
  { id: "sub-yellow", label: "黄字黑边", category: "通用", sample: "字幕样式", style: { ...base, color: "yellow", bold: true, stroke: 2, strokeColor: "black" } },
  { id: "sub-white-box", label: "白底黑字", category: "底条", sample: "字幕样式", style: { ...base, color: "black", background: true, backgroundColor: "white" } },
  { id: "sub-black-box", label: "黑底白字", category: "底条", sample: "字幕样式", style: { ...base, background: true, backgroundColor: "black" } },
  { id: "sub-blue-box", label: "蓝底白字", category: "底条", sample: "字幕样式", style: { ...base, background: true, backgroundColor: "blue" } },
  { id: "sub-pink-box", label: "粉底白字", category: "底条", sample: "字幕样式", style: { ...base, background: true, backgroundColor: "magenta" } },
  { id: "sub-big", label: "大号强调", category: "强调", sample: "重点字幕", style: { ...base, size: 1.5, bold: true, stroke: 2, strokeColor: "black" } },
  { id: "sub-small", label: "小号说明", category: "强调", sample: "补充说明文字", style: { ...base, size: 0.75 } },
  { id: "sub-top", label: "顶部标题", category: "位置", sample: "顶部标题", style: { ...base, position: "top", bold: true, stroke: 2, strokeColor: "black" } },
  { id: "sub-center", label: "居中大字", category: "位置", sample: "居中字幕", style: { ...base, position: "center", size: 1.4, bold: true } },
  { id: "sub-news", label: "新闻条", category: "位置", sample: "新闻字幕条", style: { ...base, position: "top", align: "left", background: true, backgroundColor: "blue", bold: true } },
  { id: "sub-variety", label: "综艺字", category: "强调", sample: "综艺字幕", style: { ...base, size: 1.3, color: "yellow", bold: true, stroke: 3, strokeColor: "black" } },
  { id: "sub-thin-stroke", label: "细描边", category: "通用", sample: "字幕样式", style: { ...base, stroke: 1, strokeColor: "black" } },
  { id: "sub-thick-stroke", label: "粗描边", category: "强调", sample: "字幕样式", style: { ...base, color: "yellow", bold: true, stroke: 4, strokeColor: "black" } },
  { id: "sub-green-box", label: "绿底白字", category: "底条", sample: "字幕样式", style: { ...base, background: true, backgroundColor: "green" } },
  { id: "sub-orange-box", label: "橙底黑字", category: "底条", sample: "字幕样式", style: { ...base, color: "black", background: true, backgroundColor: "orange" } },
  { id: "sub-left-bottom", label: "左下角", category: "位置", sample: "左下角字幕", style: { ...base, align: "left", stroke: 2, strokeColor: "black" } },
  { id: "sub-top-center", label: "顶部居中", category: "位置", sample: "顶部居中字幕", style: { ...base, position: "top", bold: true, stroke: 2, strokeColor: "black" } },
];
