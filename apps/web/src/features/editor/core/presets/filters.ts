import type { LookPreset } from "./types";

/**
 * 60 个调色滤镜：css 用于预览，ffmpeg 用于导出，两端表达同一组参数意图。
 */
export const FILTER_PRESETS: LookPreset[] = [
  // 清新
  { id: "fresh-clear", label: "清透", category: "清新", css: "brightness(1.06) saturate(1.06) contrast(0.96)", ffmpeg: "eq=brightness=0.06:saturation=1.06:contrast=0.96" },
  { id: "fresh-mint", label: "薄荷", category: "清新", css: "saturate(1.04) hue-rotate(6deg) brightness(1.05)", ffmpeg: "eq=saturation=1.04:brightness=0.05,hue=h=4" },
  { id: "fresh-lemon", label: "柠檬汽水", category: "清新", css: "saturate(1.18) brightness(1.08) hue-rotate(-4deg)", ffmpeg: "eq=saturation=1.18:brightness=0.08,hue=h=-3" },
  { id: "fresh-sky", label: "晴空", category: "清新", css: "saturate(1.12) brightness(1.04) hue-rotate(4deg)", ffmpeg: "eq=saturation=1.12:brightness=0.04,hue=h=3" },
  { id: "fresh-milk", label: "牛奶", category: "清新", css: "brightness(1.1) contrast(0.92) saturate(0.98)", ffmpeg: "eq=brightness=0.1:contrast=0.92:saturation=0.98" },
  { id: "fresh-soda", label: "气泡水", category: "清新", css: "contrast(1.04) saturate(1.1) brightness(1.03)", ffmpeg: "eq=contrast=1.04:saturation=1.1:brightness=0.03" },

  // 暖调
  { id: "warm-sun", label: "暖阳", category: "暖调", css: "sepia(0.2) saturate(1.22) brightness(1.03)", ffmpeg: "colorbalance=rm=0.08:bm=-0.05,eq=saturation=1.2:brightness=0.03" },
  { id: "warm-golden", label: "黄金时刻", category: "暖调", css: "sepia(0.3) saturate(1.3) brightness(1.05) contrast(1.02)", ffmpeg: "colorbalance=rm=0.12:gm=0.04:bm=-0.09,eq=saturation=1.26:brightness=0.05" },
  { id: "warm-amber", label: "琥珀", category: "暖调", css: "sepia(0.36) saturate(1.18) contrast(1.04)", ffmpeg: "colorbalance=rm=0.14:bm=-0.1,eq=saturation=1.14:contrast=1.04" },
  { id: "warm-sunset", label: "落日", category: "暖调", css: "sepia(0.26) saturate(1.35) hue-rotate(-6deg)", ffmpeg: "colorbalance=rm=0.12:bm=-0.1,eq=saturation=1.3,hue=h=-4" },
  { id: "warm-cabin", label: "暖屋", category: "暖调", css: "sepia(0.24) saturate(1.12) brightness(1.02)", ffmpeg: "colorbalance=rm=0.1:gm=0.02:bm=-0.06,eq=saturation=1.1:brightness=0.02" },
  { id: "warm-caramel", label: "焦糖", category: "暖调", css: "sepia(0.4) saturate(1.2) brightness(1.02)", ffmpeg: "colorbalance=rm=0.15:gm=0.05:bm=-0.1,eq=saturation=1.15:brightness=0.02" },

  // 冷调
  { id: "cool-coast", label: "冷调海岸", category: "冷调", css: "saturate(0.94) hue-rotate(8deg) brightness(1.02)", ffmpeg: "colorbalance=bm=0.08:rm=-0.04,eq=saturation=0.94:brightness=0.02" },
  { id: "cool-ice", label: "冰蓝", category: "冷调", css: "saturate(0.9) hue-rotate(14deg) brightness(1.04)", ffmpeg: "colorbalance=bs=0.12:bm=0.08:rm=-0.06,eq=saturation=0.9:brightness=0.04" },
  { id: "cool-night", label: "夜航", category: "冷调", css: "brightness(0.94) contrast(1.1) hue-rotate(10deg)", ffmpeg: "colorbalance=bs=0.1:bm=-0.04,eq=brightness=-0.06:contrast=1.1" },
  { id: "cool-steel", label: "钢青", category: "冷调", css: "saturate(0.82) contrast(1.08) hue-rotate(6deg)", ffmpeg: "colorbalance=bs=0.08:rm=-0.05,eq=saturation=0.82:contrast=1.08" },
  { id: "cool-winter", label: "冬日", category: "冷调", css: "brightness(1.04) saturate(0.92) contrast(0.98)", ffmpeg: "eq=brightness=0.04:saturation=0.92:contrast=0.98" },
  { id: "cool-cyan", label: "青蓝", category: "冷调", css: "hue-rotate(16deg) saturate(1.06) contrast(1.02)", ffmpeg: "colorbalance=bs=0.12:gs=0.04:rm=-0.05,eq=saturation=1.06:contrast=1.02" },

  // 人像
  { id: "portrait-soft", label: "柔光人像", category: "人像", css: "brightness(1.05) saturate(1.04) contrast(0.95)", ffmpeg: "eq=brightness=0.05:saturation=1.04:contrast=0.95" },
  { id: "portrait-peach", label: "蜜桃肌", category: "人像", css: "sepia(0.16) saturate(1.24) brightness(1.06)", ffmpeg: "colorbalance=rm=0.07:bm=-0.03,eq=saturation=1.18:brightness=0.06" },
  { id: "portrait-rosey", label: "玫瑰", category: "人像", css: "sepia(0.12) saturate(1.2) hue-rotate(-6deg) brightness(1.04)", ffmpeg: "colorbalance=rm=0.1:bm=-0.02,eq=saturation=1.16:brightness=0.04,hue=h=-4" },
  { id: "portrait-natural", label: "自然人像", category: "人像", css: "saturate(1.06) contrast(1.02)", ffmpeg: "eq=saturation=1.06:contrast=1.02" },
  { id: "portrait-cream", label: "奶油", category: "人像", css: "brightness(1.08) saturate(0.98) contrast(0.94)", ffmpeg: "eq=brightness=0.08:saturation=0.98:contrast=0.94" },
  { id: "portrait-fresh", label: "元气", category: "人像", css: "saturate(1.22) brightness(1.05) contrast(1.04)", ffmpeg: "eq=saturation=1.22:brightness=0.05:contrast=1.04" },

  // 风光
  { id: "land-vivid", label: "风光浓郁", category: "风光", css: "saturate(1.32) contrast(1.1)", ffmpeg: "eq=saturation=1.3:contrast=1.1" },
  { id: "land-forest", label: "森林", category: "风光", css: "hue-rotate(-8deg) saturate(1.16) brightness(0.98)", ffmpeg: "colorbalance=gs=0.1:rm=-0.04,eq=saturation=1.14:brightness=-0.02" },
  { id: "land-desert", label: "荒漠", category: "风光", css: "sepia(0.32) saturate(1.1) contrast(1.06)", ffmpeg: "colorbalance=rm=0.1:gm=0.03:bm=-0.08,eq=saturation=1.08:contrast=1.06" },
  { id: "land-ocean", label: "深海", category: "风光", css: "hue-rotate(12deg) saturate(1.14) contrast(1.08)", ffmpeg: "colorbalance=bs=0.12:bm=0.04:rm=-0.06,eq=saturation=1.12:contrast=1.08" },
  { id: "land-snow", label: "雪山", category: "风光", css: "brightness(1.06) contrast(1.12) saturate(0.94)", ffmpeg: "eq=brightness=0.06:contrast=1.12:saturation=0.94" },
  { id: "land-city", label: "城市", category: "风光", css: "contrast(1.14) saturate(1.1) brightness(0.98)", ffmpeg: "eq=contrast=1.14:saturation=1.1:brightness=-0.02" },

  // 美食
  { id: "food-warm", label: "暖食", category: "美食", css: "sepia(0.22) saturate(1.34) brightness(1.04)", ffmpeg: "colorbalance=rm=0.1:bm=-0.06,eq=saturation=1.3:brightness=0.04" },
  { id: "food-crisp", label: "酥脆", category: "美食", css: "contrast(1.14) saturate(1.24)", ffmpeg: "eq=contrast=1.14:saturation=1.22" },
  { id: "food-sweet", label: "甜点", category: "美食", css: "sepia(0.18) saturate(1.3) brightness(1.08)", ffmpeg: "colorbalance=rm=0.08:bm=-0.02,eq=saturation=1.26:brightness=0.08" },
  { id: "food-fresh", label: "鲜蔬", category: "美食", css: "saturate(1.28) brightness(1.05) hue-rotate(-4deg)", ffmpeg: "eq=saturation=1.26:brightness=0.05,hue=h=-3" },
  { id: "food-kitchen", label: "厨房", category: "美食", css: "brightness(1.06) contrast(1.04) saturate(1.08)", ffmpeg: "eq=brightness=0.06:contrast=1.04:saturation=1.08" },
  { id: "food-coffee", label: "咖啡", category: "美食", css: "sepia(0.34) contrast(1.08) saturate(1.06)", ffmpeg: "colorbalance=rm=0.12:gm=0.04:bm=-0.08,eq=contrast=1.08:saturation=1.04" },

  // 复古
  { id: "retro-70s", label: "70 年代", category: "复古", css: "sepia(0.42) saturate(1.16) contrast(1.04)", ffmpeg: "curves=preset=vintage,eq=saturation=1.1:contrast=1.04" },
  { id: "retro-vhs", label: "VHS", category: "复古", css: "contrast(1.12) saturate(1.34) hue-rotate(-8deg)", ffmpeg: "eq=contrast=1.12:saturation=1.3,hue=h=-6,noise=alls=6:allf=t" },
  { id: "retro-film", label: "胶片", category: "复古", css: "sepia(0.2) contrast(1.08) saturate(0.9)", ffmpeg: "curves=preset=medium_contrast,eq=saturation=0.9,colorbalance=rm=0.04:bm=-0.03" },
  { id: "retro-polaroid", label: "拍立得", category: "复古", css: "sepia(0.26) brightness(1.06) contrast(0.94)", ffmpeg: "curves=preset=lighter,eq=saturation=0.94:brightness=0.05" },
  { id: "retro-faded", label: "褪色", category: "复古", css: "saturate(0.72) contrast(0.9) brightness(1.05)", ffmpeg: "eq=saturation=0.72:contrast=0.9:brightness=0.05" },
  { id: "retro-super8", label: "超 8", category: "复古", css: "sepia(0.5) contrast(1.12) saturate(1.1)", ffmpeg: "curves=preset=vintage,eq=contrast=1.1:saturation=1.06,noise=alls=10:allf=t" },

  // 电影
  { id: "cine-teal", label: "青橙电影", category: "电影", css: "contrast(1.1) saturate(1.14) hue-rotate(4deg)", ffmpeg: "colorbalance=rs=-0.08:bs=0.1:rm=0.08:bm=-0.05,eq=contrast=1.1:saturation=1.12" },
  { id: "cine-dark", label: "暗夜电影", category: "电影", css: "brightness(0.9) contrast(1.16) saturate(0.9)", ffmpeg: "eq=brightness=-0.1:contrast=1.16:saturation=0.9" },
  { id: "cine-warm", label: "暖电影", category: "电影", css: "sepia(0.14) contrast(1.08) saturate(1.06)", ffmpeg: "colorbalance=rm=0.06:bm=-0.04,eq=contrast=1.08:saturation=1.06" },
  { id: "cine-high", label: "高反差", category: "电影", css: "contrast(1.28) saturate(1.06)", ffmpeg: "curves=preset=strong_contrast,eq=saturation=1.06" },
  { id: "cine-matte", label: "哑光", category: "电影", css: "contrast(0.9) brightness(1.04) saturate(0.92)", ffmpeg: "curves=preset=lighter,eq=contrast=0.9:saturation=0.92" },
  { id: "cine-green", label: "绿调电影", category: "电影", css: "hue-rotate(-12deg) saturate(0.96) contrast(1.06)", ffmpeg: "colorbalance=gm=0.06:rm=-0.05:bm=-0.02,eq=saturation=0.96:contrast=1.06" },

  // 黑白
  { id: "mono-silver", label: "银盐", category: "黑白", css: "grayscale(0.94) contrast(1.08)", ffmpeg: "hue=s=0.06,eq=contrast=1.08" },
  { id: "mono-noir", label: "黑色电影", category: "黑白", css: "grayscale(1) contrast(1.28)", ffmpeg: "hue=s=0,eq=contrast=1.26" },
  { id: "mono-soft", label: "柔灰", category: "黑白", css: "grayscale(1) contrast(0.94) brightness(1.04)", ffmpeg: "hue=s=0,eq=contrast=0.94:brightness=0.04" },
  { id: "mono-high", label: "硬黑白", category: "黑白", css: "grayscale(1) contrast(1.5)", ffmpeg: "hue=s=0,curves=preset=strong_contrast" },
  { id: "mono-warm", label: "暖黑白", category: "黑白", css: "grayscale(1) sepia(0.18) contrast(1.06)", ffmpeg: "hue=s=0,colorbalance=rm=0.06:bm=-0.04,eq=contrast=1.06" },
  { id: "mono-cool", label: "冷黑白", category: "黑白", css: "grayscale(1) hue-rotate(8deg) contrast(1.1)", ffmpeg: "hue=s=0,colorbalance=bm=0.06:rm=-0.04,eq=contrast=1.1" },

  // 氛围
  { id: "mood-moody", label: "情绪暗调", category: "氛围", css: "contrast(1.12) saturate(0.78) brightness(0.92)", ffmpeg: "eq=contrast=1.12:saturation=0.78:brightness=-0.08" },
  { id: "mood-dream", label: "梦境", category: "氛围", css: "brightness(1.1) saturate(1.06) contrast(0.92)", ffmpeg: "eq=brightness=0.1:saturation=1.06:contrast=0.92,gblur=sigma=1" },
  { id: "mood-neon", label: "霓虹", category: "氛围", css: "saturate(1.4) contrast(1.1) hue-rotate(-10deg)", ffmpeg: "colorbalance=rs=0.1:bs=0.15:rm=0.05,eq=saturation=1.36:contrast=1.1" },
  { id: "mood-dust", label: "尘埃", category: "氛围", css: "sepia(0.24) contrast(1.04) saturate(0.94)", ffmpeg: "curves=preset=vintage,eq=saturation=0.94:contrast=1.04", overlay: "grain" },
  { id: "mood-blue", label: "蓝调时刻", category: "氛围", css: "hue-rotate(14deg) brightness(0.96) saturate(1.04)", ffmpeg: "colorbalance=bs=0.14:bm=0.04:rm=-0.06,eq=brightness=-0.04:saturation=1.04" },
  { id: "mood-pink", label: "粉雾", category: "氛围", css: "sepia(0.1) saturate(1.24) hue-rotate(-10deg) brightness(1.06)", ffmpeg: "colorbalance=rm=0.1:bm=0.02,eq=saturation=1.18:brightness=0.06,hue=h=-6" },

  // 原生 / 人像扩展
  { id: "portrait-original", label: "原生", category: "人像", css: "saturate(1.02) contrast(1.01)", ffmpeg: "eq=saturation=1.02:contrast=1.01" },
  { id: "portrait-cream-skin", label: "奶油肌", category: "人像", css: "brightness(1.08) saturate(1.02) contrast(0.94)", ffmpeg: "eq=brightness=0.08:saturation=1.02:contrast=0.94" },
  { id: "portrait-pink-soft", label: "粉嫩", category: "人像", css: "sepia(0.14) saturate(1.26) brightness(1.06) hue-rotate(-6deg)", ffmpeg: "colorbalance=rm=0.09:bm=-0.02,eq=saturation=1.2:brightness=0.06,hue=h=-4" },
  { id: "portrait-cool-white", label: "冷白皮", category: "人像", css: "brightness(1.1) saturate(0.94) hue-rotate(4deg)", ffmpeg: "eq=brightness=0.1:saturation=0.94,hue=h=3" },
  { id: "portrait-warm-skin", label: "暖肤", category: "人像", css: "sepia(0.2) saturate(1.14) brightness(1.04)", ffmpeg: "colorbalance=rm=0.08:gm=0.02:bm=-0.05,eq=saturation=1.12:brightness=0.04" },
  { id: "portrait-clean", label: "干净人像", category: "人像", css: "brightness(1.06) contrast(1.04) saturate(0.98)", ffmpeg: "eq=brightness=0.06:contrast=1.04:saturation=0.98" },

  // 美食扩展
  { id: "food-bbq", label: "烧烤", category: "美食", css: "sepia(0.3) saturate(1.36) contrast(1.06)", ffmpeg: "colorbalance=rm=0.12:gm=0.04:bm=-0.08,eq=saturation=1.3:contrast=1.06" },
  { id: "food-seafood", label: "鲜美", category: "美食", css: "saturate(1.22) brightness(1.06) hue-rotate(6deg)", ffmpeg: "eq=saturation=1.2:brightness=0.06,hue=h=4" },
  { id: "food-dessert", label: "甜品", category: "美食", css: "sepia(0.16) saturate(1.3) brightness(1.1)", ffmpeg: "colorbalance=rm=0.08:bm=-0.01,eq=saturation=1.26:brightness=0.1" },
  { id: "food-coffee-dark", label: "咖啡暗调", category: "美食", css: "sepia(0.38) contrast(1.12) brightness(0.96)", ffmpeg: "colorbalance=rm=0.14:gm=0.05:bm=-0.09,eq=contrast=1.1:brightness=-0.04" },
  { id: "food-japanese", label: "日料", category: "美食", css: "saturate(1.14) contrast(1.08) brightness(1.03)", ffmpeg: "eq=saturation=1.14:contrast=1.08:brightness=0.03" },
  { id: "food-veggie", label: "素食", category: "美食", css: "saturate(1.26) hue-rotate(-6deg) brightness(1.05)", ffmpeg: "colorbalance=gs=0.08:rm=-0.03,eq=saturation=1.24:brightness=0.05" },

  // 风景扩展
  { id: "land-seascape", label: "海景", category: "风光", css: "hue-rotate(8deg) saturate(1.18) brightness(1.03)", ffmpeg: "colorbalance=bs=0.1:bm=0.04:rm=-0.04,eq=saturation=1.16:brightness=0.03" },
  { id: "land-forest-deep", label: "森系", category: "风光", css: "hue-rotate(-10deg) saturate(1.12) contrast(1.06)", ffmpeg: "colorbalance=gs=0.12:rm=-0.05,eq=saturation=1.1:contrast=1.06" },
  { id: "land-mountain", label: "山川", category: "风光", css: "contrast(1.12) saturate(1.04) brightness(1.01)", ffmpeg: "eq=contrast=1.12:saturation=1.04:brightness=0.01" },
  { id: "land-grass", label: "草原", category: "风光", css: "saturate(1.24) brightness(1.05) hue-rotate(-4deg)", ffmpeg: "eq=saturation=1.22:brightness=0.05,hue=h=-3" },
  { id: "land-snow-blue", label: "雪景", category: "风光", css: "brightness(1.1) saturate(0.9) contrast(1.04) hue-rotate(6deg)", ffmpeg: "eq=brightness=0.1:saturation=0.9:contrast=1.04,hue=h=4" },
  { id: "land-desert-gold", label: "沙漠", category: "风光", css: "sepia(0.36) saturate(1.12) contrast(1.08)", ffmpeg: "colorbalance=rm=0.12:gm=0.04:bm=-0.09,eq=saturation=1.1:contrast=1.08" },

  // 夜景扩展
  { id: "night-city", label: "夜景", category: "夜景", css: "brightness(0.98) contrast(1.16) saturate(1.1)", ffmpeg: "eq=brightness=-0.02:contrast=1.16:saturation=1.1" },
  { id: "night-neon", label: "霓虹夜", category: "夜景", css: "saturate(1.4) contrast(1.12) hue-rotate(-8deg)", ffmpeg: "colorbalance=rs=0.1:bs=0.14:rm=0.04,eq=saturation=1.36:contrast=1.12" },
  { id: "night-moon", label: "月光", category: "夜景", css: "hue-rotate(14deg) brightness(1.02) saturate(0.94)", ffmpeg: "colorbalance=bs=0.12:bm=0.05:rm=-0.05,eq=brightness=0.02:saturation=0.94" },
  { id: "night-blue", label: "蓝调夜", category: "夜景", css: "hue-rotate(16deg) contrast(1.08) brightness(0.98)", ffmpeg: "colorbalance=bs=0.14:bm=0.03:rm=-0.06,eq=contrast=1.08:brightness=-0.02" },
  { id: "night-warm-lamp", label: "暖灯", category: "夜景", css: "sepia(0.24) brightness(1.04) contrast(1.06)", ffmpeg: "colorbalance=rm=0.12:bm=-0.08,eq=brightness=0.04:contrast=1.06" },
  { id: "night-rain", label: "雨夜", category: "夜景", css: "saturate(0.86) brightness(0.94) contrast(1.12) hue-rotate(8deg)", ffmpeg: "colorbalance=bs=0.1:bm=0.02:rm=-0.05,eq=saturation=0.86:brightness=-0.06:contrast=1.12" },

  // 港风 / 日系 / 老照片
  { id: "retro-hk", label: "港风", category: "复古", css: "sepia(0.3) saturate(1.2) contrast(1.1) hue-rotate(-8deg)", ffmpeg: "colorbalance=rm=0.12:gm=0.02:bm=-0.08,eq=saturation=1.16:contrast=1.1,hue=h=-5" },
  { id: "retro-jp", label: "日系", category: "复古", css: "brightness(1.08) saturate(0.92) contrast(0.94) hue-rotate(6deg)", ffmpeg: "eq=brightness=0.08:saturation=0.92:contrast=0.94,hue=h=4" },
  { id: "retro-old-photo", label: "老照片", category: "复古", css: "sepia(0.6) contrast(1.06) brightness(1.02)", ffmpeg: "curves=preset=vintage,colorbalance=rm=0.12:gm=0.06:bm=-0.08,eq=contrast=1.06" },
  { id: "retro-instant", label: "拍立得", category: "复古", css: "sepia(0.24) brightness(1.08) contrast(0.92) saturate(0.94)", ffmpeg: "curves=preset=lighter,eq=saturation=0.94:brightness=0.06" },
  { id: "retro-dv", label: "DV 质感", category: "复古", css: "contrast(1.14) saturate(1.2) brightness(1.02)", ffmpeg: "eq=contrast=1.12:saturation=1.18:brightness=0.02,noise=alls=8:allf=t" },
  { id: "retro-lightleak", label: "胶片漏光", category: "复古", css: "sepia(0.24) saturate(1.3) brightness(1.08) contrast(0.96)", ffmpeg: "colorbalance=rm=0.14:gm=0.04:bm=-0.06,eq=saturation=1.24:brightness=0.06:contrast=0.96" },

  // 好莱坞 / 文艺
  { id: "cine-hollywood", label: "好莱坞", category: "电影", css: "contrast(1.16) saturate(1.08) sepia(0.06)", ffmpeg: "colorbalance=rm=0.05:bm=-0.04,eq=contrast=1.16:saturation=1.08" },
  { id: "cine-art", label: "文艺片", category: "电影", css: "saturate(0.8) contrast(0.96) brightness(1.03) sepia(0.1)", ffmpeg: "curves=preset=lighter,eq=saturation=0.8:contrast=0.96:brightness=0.03" },
  { id: "cine-orange-teal", label: "橙青", category: "电影", css: "contrast(1.12) saturate(1.16) hue-rotate(2deg)", ffmpeg: "colorbalance=rs=-0.06:bs=0.08:rm=0.08:bm=-0.05,eq=contrast=1.12:saturation=1.14" },
  { id: "cine-night", label: "夜戏", category: "电影", css: "brightness(0.86) contrast(1.2) saturate(0.86)", ffmpeg: "eq=brightness=-0.14:contrast=1.2:saturation=0.86" },
  { id: "cine-soft", label: "柔光电影", category: "电影", css: "brightness(1.05) contrast(0.96) saturate(0.96)", ffmpeg: "eq=brightness=0.05:contrast=0.96:saturation=0.96,gblur=sigma=1" },
  { id: "cine-dark-green", label: "墨绿电影", category: "电影", css: "hue-rotate(-14deg) contrast(1.1) saturate(0.9)", ffmpeg: "colorbalance=gm=0.1:rm=-0.06:bm=-0.03,eq=contrast=1.1:saturation=0.9" },

  // 风格化
  { id: "style-oil", label: "油画", category: "风格化", css: "saturate(1.3) contrast(1.12) blur(0.4px)", ffmpeg: "eq=saturation=1.28:contrast=1.1,gblur=sigma=1.2" },
  { id: "style-watercolor", label: "水彩", category: "风格化", css: "saturate(0.86) brightness(1.1) contrast(1.06) blur(0.3px)", ffmpeg: "eq=saturation=0.86:brightness=0.1:contrast=1.06,gblur=sigma=1.6" },
  { id: "style-sketch", label: "素描", category: "风格化", css: "grayscale(1) contrast(1.5) brightness(1.06)", ffmpeg: "hue=s=0,edgedetect=low=0.08:high=0.32,eq=brightness=0.06:contrast=1.3" },
  { id: "style-anime", label: "动漫", category: "风格化", css: "saturate(1.4) contrast(1.16) brightness(1.05)", ffmpeg: "eq=saturation=1.38:contrast=1.14:brightness=0.05" },
  { id: "style-macaron", label: "马卡龙", category: "风格化", css: "saturate(1.2) brightness(1.1) contrast(0.9) hue-rotate(-6deg)", ffmpeg: "colorbalance=rm=0.08:bm=0.03,eq=saturation=1.16:brightness=0.1:contrast=0.9" },
  { id: "style-comic", label: "漫画色调", category: "风格化", css: "saturate(1.24) contrast(1.3) brightness(1.02)", ffmpeg: "eq=saturation=1.22:contrast=1.3:brightness=0.02" },

  // 氛围扩展
  { id: "mood-morandi", label: "莫兰迪", category: "氛围", css: "saturate(0.7) brightness(1.04) contrast(0.94)", ffmpeg: "eq=saturation=0.7:brightness=0.04:contrast=0.94" },
  { id: "mood-highgray", label: "高级灰", category: "氛围", css: "saturate(0.66) contrast(1.04) brightness(1.02)", ffmpeg: "eq=saturation=0.66:contrast=1.04:brightness=0.02" },
  { id: "mood-french", label: "法式", category: "氛围", css: "sepia(0.18) saturate(0.9) brightness(1.04) contrast(0.96)", ffmpeg: "colorbalance=rm=0.05:gm=0.03:bm=-0.03,eq=saturation=0.9:brightness=0.04:contrast=0.96" },
  { id: "mood-korean", label: "韩系", category: "氛围", css: "brightness(1.12) saturate(0.94) contrast(0.92)", ffmpeg: "eq=brightness=0.12:saturation=0.94:contrast=0.92" },
  { id: "mood-ins", label: "ins 风", category: "氛围", css: "saturate(0.88) contrast(1.08) brightness(1.04) sepia(0.08)", ffmpeg: "eq=saturation=0.88:contrast=1.08:brightness=0.04" },
  { id: "mood-dark-tone", label: "暗调", category: "氛围", css: "brightness(0.86) contrast(1.18) saturate(0.9)", ffmpeg: "eq=brightness=-0.14:contrast=1.18:saturation=0.9" },

  // 主题场景
  { id: "theme-champagne", label: "香槟", category: "婚礼", css: "sepia(0.24) saturate(1.08) brightness(1.1)", ffmpeg: "colorbalance=rm=0.08:gm=0.05:bm=-0.03,eq=saturation=1.06:brightness=0.1" },
  { id: "theme-pure-white", label: "纯白", category: "婚礼", css: "brightness(1.14) saturate(0.9) contrast(0.94)", ffmpeg: "eq=brightness=0.14:saturation=0.9:contrast=0.94" },
  { id: "theme-island", label: "海岛", category: "旅拍", css: "hue-rotate(10deg) saturate(1.26) brightness(1.06)", ffmpeg: "colorbalance=bs=0.12:bm=0.05:rm=-0.05,eq=saturation=1.24:brightness=0.06" },
  { id: "theme-road", label: "公路", category: "旅拍", css: "sepia(0.18) contrast(1.12) saturate(1.08)", ffmpeg: "colorbalance=rm=0.07:gm=0.03:bm=-0.05,eq=contrast=1.12:saturation=1.06" },
  { id: "theme-sport", label: "活力", category: "运动", css: "saturate(1.32) contrast(1.14) brightness(1.02)", ffmpeg: "eq=saturation=1.3:contrast=1.14:brightness=0.02" },
  { id: "theme-sport-cool", label: "冷峻", category: "运动", css: "contrast(1.18) saturate(0.9) hue-rotate(8deg)", ffmpeg: "colorbalance=bs=0.08:rm=-0.06,eq=contrast=1.18:saturation=0.9" },
  { id: "theme-pet", label: "软萌", category: "宠物", css: "brightness(1.1) saturate(1.1) contrast(0.92)", ffmpeg: "eq=brightness=0.1:saturation=1.1:contrast=0.92" },
  { id: "theme-pet-bright", label: "明亮宠物", category: "宠物", css: "brightness(1.12) saturate(1.06) contrast(1.02)", ffmpeg: "eq=brightness=0.12:saturation=1.06:contrast=1.02" },
  { id: "theme-kids", label: "童趣", category: "儿童", css: "saturate(1.3) brightness(1.1) hue-rotate(-4deg)", ffmpeg: "colorbalance=rm=0.08:gm=0.04:bm=0.02,eq=saturation=1.28:brightness=0.1" },
  { id: "theme-kids-pastel", label: "粉彩", category: "儿童", css: "saturate(1.12) brightness(1.12) contrast(0.88)", ffmpeg: "eq=saturation=1.1:brightness=0.12:contrast=0.88" },
  { id: "theme-business", label: "稳重", category: "商务", css: "contrast(1.1) saturate(0.94) brightness(1.02)", ffmpeg: "eq=contrast=1.1:saturation=0.94:brightness=0.02" },
  { id: "theme-business-clean", label: "简洁", category: "商务", css: "brightness(1.06) contrast(1.06) saturate(0.96)", ffmpeg: "eq=brightness=0.06:contrast=1.06:saturation=0.96" },
];
