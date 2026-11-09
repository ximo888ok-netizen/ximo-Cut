import type { LookPreset } from "./types";

/**
 * 按剪映「画面特效」的命名与分类补充的可实现效果。
 * 只收录能用单路 FFmpeg 滤镜真实渲染、且预览能近似表达的类型；
 * 粒子类（烟花、金粉、雪花）、分屏、贴纸叠加等依赖素材或多路合成的特效不在此列。
 */
export const JIANYING_EFFECT_PRESETS: LookPreset[] = [
  // 边框
  { id: "jy-frame-white", label: "简约边框", category: "边框", css: "none", ffmpeg: "drawbox=x=0:y=0:w=iw:h=ih:color=white@0.9:t=6", overlay: "frame" },
  { id: "jy-frame-black", label: "基础黑框", category: "边框", css: "none", ffmpeg: "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.92:t=8", overlay: "frame-dark" },
  { id: "jy-frame-double", label: "白色线框", category: "边框", css: "none", ffmpeg: "drawbox=x=6:y=6:w=iw-12:h=ih-12:color=white@0.85:t=2,drawbox=x=14:y=14:w=iw-28:h=ih-28:color=white@0.35:t=1", overlay: "frame" },
  { id: "jy-frame-film", label: "胶片框", category: "边框", css: "none", ffmpeg: "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.92:t=16", overlay: "frame-dark" },
  { id: "jy-frame-stamp", label: "邮票边框", category: "边框", css: "none", ffmpeg: "drawbox=x=0:y=0:w=iw:h=ih:color=white@0.9:t=12,drawbox=x=18:y=18:w=iw-36:h=ih-36:color=white@0.45:t=1", overlay: "frame" },
  { id: "jy-frame-handbook", label: "手帐边框", category: "边框", css: "none", ffmpeg: "drawbox=x=0:y=0:w=iw:h=ih:color=0xF2C6D8@0.9:t=8", overlay: "frame" },

  // 模糊与清晰
  { id: "jy-blur", label: "模糊", category: "模糊", css: "blur(3px)", ffmpeg: "gblur=sigma=7:steps=2" },
  { id: "jy-blur-motion", label: "动感模糊", category: "模糊", css: "blur(1.4px) contrast(1.04)", ffmpeg: "dblur=angle=0:radius=9" },
  { id: "jy-blur-diagonal", label: "斜向模糊", category: "模糊", css: "blur(1.4px)", ffmpeg: "dblur=angle=45:radius=9" },
  { id: "jy-blur-vertical", label: "纵向模糊", category: "模糊", css: "blur(1.6px)", ffmpeg: "dblur=angle=90:radius=11" },
  { id: "jy-blur-surface", label: "表面模糊", category: "模糊", css: "blur(0.9px) saturate(1.04)", ffmpeg: "smartblur=lr=2:ls=-0.6:lt=8" },
  { id: "jy-blur-focus", label: "失焦", category: "模糊", css: "blur(5px)", ffmpeg: "gblur=sigma=13:steps=2" },
  { id: "jy-sharpen", label: "变清晰", category: "清晰", css: "contrast(1.05) saturate(1.02)", ffmpeg: "unsharp=5:5:0.9:5:5:0" },
  { id: "jy-sharpen-2", label: "变清晰 II", category: "清晰", css: "contrast(1.09) saturate(1.04)", ffmpeg: "unsharp=5:5:1.5:5:5:0" },
  { id: "jy-sharpen-strong", label: "强锐化", category: "清晰", css: "contrast(1.14) saturate(1.06)", ffmpeg: "unsharp=7:7:2.0:7:7:0" },
  { id: "jy-sharpen-fine", label: "精细锐化", category: "清晰", css: "contrast(1.06)", ffmpeg: "unsharp=3:3:1.1:3:3:0" },

  // 色彩与胶片
  { id: "jy-mono", label: "变黑白", category: "色彩", css: "grayscale(1)", ffmpeg: "hue=s=0" },
  { id: "jy-negative", label: "负片", category: "色彩", css: "invert(1)", ffmpeg: "negate" },
  { id: "jy-negative-orange", label: "橘色负片", category: "色彩", css: "invert(1) sepia(0.4) saturate(1.4)", ffmpeg: "negate,colorbalance=rm=0.3:gm=0.1:bm=-0.2" },
  { id: "jy-negative-purple", label: "紫色负片", category: "色彩", css: "invert(1) hue-rotate(40deg) saturate(1.3)", ffmpeg: "negate,colorbalance=rm=0.2:bm=0.3" },
  { id: "jy-negative-blue", label: "蓝色负片", category: "色彩", css: "invert(1) hue-rotate(180deg) saturate(1.2)", ffmpeg: "negate,colorbalance=bm=0.3:rm=-0.2" },
  { id: "jy-exposure-up", label: "曝光", category: "色彩", css: "brightness(1.2) contrast(0.96)", ffmpeg: "eq=brightness=0.18:contrast=0.96" },
  { id: "jy-exposure-down", label: "曝光降低", category: "色彩", css: "brightness(0.82) contrast(1.06)", ffmpeg: "eq=brightness=-0.18:contrast=1.06" },
  { id: "jy-noise-dark", label: "暗黑噪点", category: "色彩", css: "brightness(0.86) contrast(1.16) saturate(0.8)", ffmpeg: "eq=brightness=-0.12:contrast=1.18:saturation=0.8,noise=alls=18:allf=t", overlay: "grain" },
  { id: "jy-noise", label: "噪点", category: "色彩", css: "contrast(1.04)", ffmpeg: "noise=alls=16:allf=t+u", overlay: "grain" },
  { id: "jy-noise-color", label: "彩噪画质", category: "色彩", css: "saturate(1.2) contrast(1.04)", ffmpeg: "noise=alls=22:allf=t+u,eq=saturation=1.18", overlay: "grain" },
  { id: "jy-noise-screen", label: "荧幕噪点", category: "色彩", css: "contrast(1.08)", ffmpeg: "noise=alls=10:allf=t,eq=contrast=1.08", overlay: "grain" },
  { id: "jy-noise-leak", label: "漏光噪点", category: "色彩", css: "sepia(0.2) saturate(1.2) brightness(1.04)", ffmpeg: "colorbalance=rm=0.16:gm=0.05:bm=-0.08,noise=alls=8:allf=t", overlay: "grain" },
  { id: "jy-film", label: "胶片", category: "胶片", css: "sepia(0.2) contrast(1.06) saturate(0.92)", ffmpeg: "curves=preset=vintage,eq=saturation=0.92:contrast=1.05,noise=alls=6:allf=t", overlay: "grain" },
  { id: "jy-film-2", label: "胶片 II", category: "胶片", css: "sepia(0.14) contrast(1.1) saturate(0.9)", ffmpeg: "curves=preset=medium_contrast,colorbalance=rm=0.05:bm=-0.04,noise=alls=5:allf=t", overlay: "grain" },
  { id: "jy-film-hasselblad", label: "哈苏胶片", category: "胶片", css: "contrast(1.12) saturate(0.88) sepia(0.08)", ffmpeg: "curves=preset=strong_contrast,eq=saturation=0.88:contrast=1.1" },
  { id: "jy-old-photo", label: "老照片", category: "胶片", css: "sepia(0.52) contrast(1.04) brightness(1.02)", ffmpeg: "curves=preset=vintage,colorbalance=rm=0.14:gm=0.06:bm=-0.1,eq=contrast=1.04" },
  { id: "jy-old-film", label: "老电影", category: "胶片", css: "sepia(0.34) contrast(1.1) brightness(0.98)", ffmpeg: "curves=preset=vintage,noise=alls=12:allf=t,vignette=PI/4", overlay: "grain" },
  { id: "jy-cinematic", label: "电影感", category: "胶片", css: "contrast(1.12) saturate(1.06) hue-rotate(2deg)", ffmpeg: "colorbalance=rs=-0.06:bs=0.08:rm=0.06:bm=-0.04,eq=contrast=1.12:saturation=1.06" },
  { id: "jy-sunset", label: "夕阳", category: "色彩", css: "sepia(0.28) saturate(1.2) brightness(1.04)", ffmpeg: "colorbalance=rm=0.14:gm=0.04:bm=-0.1,eq=saturation=1.2:brightness=0.04" },

  // 风格化
  { id: "jy-america", label: "美式", category: "风格", css: "contrast(1.14) saturate(1.2)", ffmpeg: "eq=contrast=1.14:saturation=1.2:brightness=0.02" },
  { id: "jy-america-2", label: "美式 II", category: "风格", css: "contrast(1.1) saturate(1.1) sepia(0.06)", ffmpeg: "colorbalance=rm=0.08:bm=-0.05,eq=contrast=1.1:saturation=1.1" },
  { id: "jy-comic-us", label: "美漫", category: "风格", css: "saturate(1.36) contrast(1.26)", ffmpeg: "eq=saturation=1.36:contrast=1.26" },
  { id: "jy-comic-color", label: "彩色漫画", category: "风格", css: "saturate(1.3) contrast(1.22) brightness(1.04)", ffmpeg: "eq=saturation=1.3:contrast=1.22:brightness=0.04" },
  { id: "jy-comic-retro", label: "复古漫画", category: "风格", css: "sepia(0.24) saturate(1.16) contrast(1.18)", ffmpeg: "curves=preset=vintage,eq=saturation=1.16:contrast=1.18" },
  { id: "jy-pixel-art", label: "像素画", category: "风格", css: "contrast(1.18) saturate(1.1)", ffmpeg: "scale=iw/24:ih/24:flags=neighbor,scale=iw*24:ih*24:flags=neighbor" },
  { id: "jy-low-pixel", label: "低像素", category: "风格", css: "contrast(1.1)", ffmpeg: "scale=iw/12:ih/12:flags=neighbor,scale=iw*12:ih*12:flags=neighbor" },
  { id: "jy-oil-texture", label: "油画纹理", category: "风格", css: "saturate(1.28) contrast(1.12) blur(0.5px)", ffmpeg: "eq=saturation=1.28:contrast=1.12,gblur=sigma=1.4,noise=alls=4:allf=t" },
  { id: "jy-ink", label: "水墨晕染", category: "风格", css: "grayscale(0.9) contrast(1.2) brightness(1.08) blur(0.3px)", ffmpeg: "hue=s=0.1,curves=preset=lighter,eq=contrast=1.2:brightness=0.08,gblur=sigma=1.2" },
  { id: "jy-watercolor", label: "水彩晕染", category: "风格", css: "saturate(0.9) brightness(1.1) blur(0.4px)", ffmpeg: "eq=saturation=0.9:brightness=0.1:contrast=1.04,gblur=sigma=1.8" },
  { id: "jy-frosted", label: "磨砂纹理", category: "风格", css: "contrast(1.06) saturate(0.94)", ffmpeg: "noise=alls=14:allf=t+u,eq=contrast=1.06:saturation=0.94", overlay: "grain" },

  // 故障与复古设备
  { id: "jy-glitch", label: "故障", category: "故障", css: "hue-rotate(60deg) saturate(1.2) contrast(1.06)", ffmpeg: "rgbashift=rh=6:bh=-6,eq=contrast=1.06:saturation=1.2", overlay: "scanline" },
  { id: "jy-glitch-2", label: "故障 II", category: "故障", css: "hue-rotate(120deg) saturate(1.3)", ffmpeg: "rgbashift=rh=12:gh=-6:bh=8,eq=saturation=1.3", overlay: "scanline" },
  { id: "jy-glitch-bar", label: "故障读条", category: "故障", css: "contrast(1.06)", ffmpeg: "noise=alls=10:allf=t,rgbashift=rh=4:bh=-4", overlay: "scanline" },
  { id: "jy-glitch-h", label: "横纹故障", category: "故障", css: "contrast(1.12)", ffmpeg: "noise=alls=18:allf=t+u,eq=contrast=1.12", overlay: "scanline" },
  { id: "jy-chroma", label: "色差", category: "故障", css: "hue-rotate(10deg) saturate(1.08)", ffmpeg: "rgbashift=rh=3:bh=-3" },
  { id: "jy-chroma-glitch", label: "色差故障", category: "故障", css: "hue-rotate(30deg) saturate(1.2)", ffmpeg: "rgbashift=rh=8:bh=-8:gh=4,eq=saturation=1.2", overlay: "scanline" },
  { id: "jy-burr", label: "毛刺", category: "故障", css: "contrast(1.06) saturate(1.06)", ffmpeg: "rgbashift=rh=2:bh=-2,noise=alls=8:allf=t" },
  { id: "jy-edge-glitch", label: "边缘故障", category: "故障", css: "contrast(1.08) hue-rotate(20deg)", ffmpeg: "rgbashift=rh=5:bh=-5,eq=contrast=1.08" },
  { id: "jy-jitter", label: "抖动", category: "故障", css: "contrast(1.04)", ffmpeg: "noise=alls=18:allf=t+u", overlay: "grain" },
  { id: "jy-jitter-soft", label: "轻微抖动", category: "故障", css: "contrast(1.02)", ffmpeg: "noise=alls=9:allf=t+u", overlay: "grain" },
  { id: "jy-vhs", label: "录像带", category: "复古设备", css: "contrast(1.12) saturate(1.24) hue-rotate(-6deg)", ffmpeg: "eq=contrast=1.12:saturation=1.24,noise=alls=10:allf=t,rgbashift=rh=2:bh=-2", overlay: "scanline" },
  { id: "jy-dv", label: "复古 DV", category: "复古设备", css: "contrast(1.1) saturate(1.16) brightness(1.02)", ffmpeg: "eq=contrast=1.1:saturation=1.16,noise=alls=8:allf=t,vignette=PI/6", overlay: "grain" },
  { id: "jy-old-tv", label: "老电视卡顿", category: "复古设备", css: "contrast(1.14) saturate(1.1)", ffmpeg: "noise=alls=14:allf=t,eq=contrast=1.14:saturation=1.1", overlay: "scanline" },
];
