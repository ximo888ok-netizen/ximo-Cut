export const QWEN_DEFAULT_BASE_URL =
  "https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1";

export const QWEN_SYSTEM_PROMPT = `你是 ximo-Cut 的自动剪辑代理，运行在一个 Windows 桌面窗口式剪辑软件中。

规则：
1. 只能通过工具操作软件，不能输出 FFmpeg 命令，不能假设文件路径。
2. 只能使用工程中真实存在的 clip_id、track_id、asset_id，禁止编造。
3. 修改时间线前先读取 project_get_state 或 ui_snapshot。
4. 用户说“这个片段 / 当前片段 / 这里”时，先调用 preview_get_state，按返回的 selectedClipId 和 playhead 理解上下文，不要猜。
5. 点击或拖拽 UI 时使用 data-agent-id，绝不使用屏幕坐标。
6. 时间统一用秒，保留三位小数；最终由编辑器吸附到帧。
7. 一次最多执行 20 个修改动作，大计划拆成多个事务。
8. 不确定用户意图时，先说明方案，等待确认。
9. 不要删除用户原始素材，不要覆盖工程。删除、导出、关闭窗口等敏感操作必须明确告知用户。
10. 用简体中文回复，说明你做了什么、结果如何。
11. 用户要求生成剪辑方案或自动剪时，必须调用 plan_propose，并且只引用用户素材库里真实存在的 asset_id；不要凭空编造素材。
12. 用户说“一键快剪 / 自动成片 / 剪成 30 秒”时，优先调用 quick_cut，不要逐个手动拼接片段。
13. 用户要求“精剪 / 高级感 / 惊艳”时，先调用 analyze_footage 查看每个镜头的清晰度与曝光评分，只选好镜头，不要把素材平均用完。
14. 方案应用或快剪完成后，必须调用 review_timeline 审片；分数低于 80 时按问题清单继续修正，再审一次，至少迭代一轮。
15. 审片通过后再导出；导出前确认竖屏/横屏、字幕烧录和导出范围。
16. 用户说“根据素材剪一支片子 / 讲故事 / 有电影感 / 像广告 / 高能卡点”时，优先调用 plan_story，一次完成选镜头、叙事结构、节奏和风格；不要一个个手动拼接。
17. 用户要音效、转场声、重击、点缀声时用 sfx_insert；要旁白、口播、解说时用 voiceover，不要假装已经配音。
18. 审片发现响度、偏色、节奏或文字问题时，用 clip_set_volume、clip_set_adjust、clip_set_speed、clip_set_text_style、clip_set_transition 直接修正，不要只给建议。`;

const emptyParameters = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const agentTools = [
  {
    type: "function",
    function: {
      name: "project_get_state",
      description: "读取当前工程、轨道、片段和时间线状态。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "ui_snapshot",
      description: "读取当前软件界面的语义树，返回所有可操作元素和 agent-id。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "audio_get_analysis",
      description: "读取已导入音频的分析结果：时长、采样率、峰值、RMS、估算响度、BPM、静音区间。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "sfx_list",
      description: "列出软件内置的音效（转场风声、情绪上升、重击、弹出、点击、闪光等）。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "sfx_insert",
      description: "把内置音效插入到播放头所在的音频轨。可用音效名或类别查找。",
      parameters: {
        type: "object",
        properties: {
          sfx_id: { type: "string", description: "音效 ID，例如 sfx-whoosh" },
          name: { type: "string", description: "音效名称或类别，例如 转场风声 / 转场 / 重击" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "voiceover",
      description:
        "用 Windows 系统语音合成生成配音，并插入到播放头位置。适合口播、旁白、解说。",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "配音文本，最多 2000 字" },
          rate: { type: "number", description: "语速，-10 到 10，默认 0" },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "caption_transcribe",
      description:
        "用本地语音模型为素材生成字幕并写入时间线。不传 asset_id 时使用当前选中或第一个带声音的素材。",
      parameters: {
        type: "object",
        properties: { asset_id: { type: "string", description: "素材库中的 asset_id" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quick_cut",
      description:
        "一键快剪：自动分析素材的镜头切换与静音停顿，挑出有内容的镜头，按节拍踩点拼成成片，并自动配乐、生成字幕。会重建主画面 V1 轨。",
      parameters: {
        type: "object",
        properties: {
          target_duration: { type: "number", description: "目标总时长，单位秒，默认 30" },
          captions: { type: "boolean", description: "是否用本地模型生成字幕，默认 true" },
          music: { type: "boolean", description: "是否添加内置免版权配乐，默认 true" },
          vertical: { type: "boolean", description: "true 输出 1080×1920 竖屏，false 输出横屏，不传保持当前设置" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_footage",
      description:
        "分析素材库中所有视频素材：镜头切点、每个镜头的清晰度与曝光评分、静音区间、时长。精剪前必须先看素材质量。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "plan_story",
      description:
        "精剪决策：自动分析素材质量，挑选最佳镜头，按开场钩子/铺垫/推进/高潮/收尾的叙事结构排成方案，并匹配风格调色、镜头时长和转场。生成的方案会显示在界面等待用户确认。",
      parameters: {
        type: "object",
        properties: {
          target_duration: { type: "number", description: "目标成片时长，单位秒，默认 30" },
          style: {
            type: "string",
            enum: ["cinematic", "energy", "vlog", "commercial", "documentary"],
            description:
              "风格参考：cinematic 电影感、energy 高能卡点、vlog 治愈 Vlog、commercial 商业广告、documentary 纪实",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_timeline",
      description:
        "把当前时间线渲染成低清预览并自动审片，返回 0-100 分、平均镜头时长、黑场/静止画面占比、响度和问题清单。剪完后必须调用。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "review_video",
      description: "对指定视频文件审片，返回分数与问题清单。",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "视频文件绝对路径" } },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_transform",
      description:
        "设置片段的画面变换：缩放、旋转、不透明度、水平/垂直位置（百分比，-100 到 100）。用于构图微调、推近、平移。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          scale: { type: "number", description: "缩放倍数，1 为原始大小" },
          rotation: { type: "number", description: "旋转角度，单位度" },
          opacity: { type: "number", description: "不透明度 0-1" },
          position_x: { type: "number", description: "水平偏移，百分比 -100 到 100" },
          position_y: { type: "number", description: "垂直偏移，百分比 -100 到 100" },
        },
        required: ["clip_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_volume",
      description:
        "设置片段音量（视频原声或音频片段），volume_db 范围 -60 到 12，0 为原始音量，-6 约等于一半响度。也可用 muted 直接静音。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          volume_db: { type: "number", description: "音量分贝，-60 到 12" },
          muted: { type: "boolean", description: "是否静音片段" },
        },
        required: ["clip_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_speed",
      description:
        "设置片段播放速度，0.25 到 4 倍。会同步调整片段时长；四舍五入后可能与后面的片段重叠，失败时返回原因。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          speed: { type: "number", description: "速度倍数 0.25-4" },
        },
        required: ["clip_id", "speed"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_adjust",
      description:
        "设置片段调色参数，所有值 -100 到 100（sharpen/grain/vignette/fade 为 0 到 100）。用于修复偏色、提亮、增加电影感。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          adjust: {
            type: "object",
            description:
              "可包含 brightness、contrast、saturation、exposure、temperature、tint、hue、highlights、shadows、vibrance、sharpen、grain、vignette、fade",
          },
        },
        required: ["clip_id", "adjust"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_text_style",
      description:
        "修改文字/标题/字幕片段的内容和样式：字号、颜色、位置、加粗、描边、背景、对齐和入场动画。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          text: { type: "string", description: "新的文字内容，不传则只改样式" },
          size: { type: "number", description: "字号倍率 0.5-2.5，默认 1" },
          color: { type: "string", description: "文字颜色，如 white/yellow/red/orange/blue" },
          position: { type: "string", enum: ["top", "center", "bottom"] },
          bold: { type: "boolean" },
          stroke: { type: "number", description: "描边宽度 0-10" },
          stroke_color: { type: "string" },
          background: { type: "boolean", description: "是否显示文字背景框" },
          background_color: { type: "string" },
          align: { type: "string", enum: ["left", "center", "right"] },
          animation: { type: "string", enum: ["none", "fade", "slide"] },
        },
        required: ["clip_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_transition",
      description:
        "给片段入点或出点设置淡入淡出转场。type=fade 黑场渐变，flash 白场闪光，none 表示移除转场。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          edge: { type: "string", enum: ["in", "out"] },
          type: { type: "string", enum: ["fade", "flash", "none"] },
          duration: { type: "number", description: "转场时长秒数，默认 0.5" },
        },
        required: ["clip_id", "edge", "type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "keyframe_add",
      description:
        "给片段添加关键帧，用于推近、平移、旋转、淡入淡出。time 是片段内的相对秒数，value 是该属性的值。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          property: {
            type: "string",
            enum: ["scale", "rotation", "opacity", "positionX", "positionY"],
          },
          time: { type: "number", description: "片段内相对时间，单位秒" },
          value: { type: "number", description: "属性值" },
          easing: {
            type: "string",
            enum: ["linear", "easeIn", "easeOut", "easeInOut", "hold"],
            description: "缓动方式，默认 easeInOut",
          },
        },
        required: ["clip_id", "property", "time", "value"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "keyframe_remove",
      description: "删除片段上的一个关键帧。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          keyframe_id: { type: "string" },
        },
        required: ["clip_id", "keyframe_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_mask",
      description:
        "给片段添加蒙版，用于局部显示、分屏、遮罩转场。shape 支持 rect/ellipse/linear；remove=true 时删除蒙版。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          shape: { type: "string", enum: ["rect", "ellipse", "linear"] },
          x: { type: "number", description: "中心水平位置 0-1，默认 0.5" },
          y: { type: "number", description: "中心垂直位置 0-1，默认 0.5" },
          width: { type: "number", description: "宽度 0-1，默认 0.6" },
          height: { type: "number", description: "高度 0-1，默认 0.6" },
          feather: { type: "number", description: "羽化 0-0.5，默认 0.06" },
          invert: { type: "boolean", description: "是否反转蒙版" },
          remove: { type: "boolean", description: "true 时删除蒙版" },
        },
        required: ["clip_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "speed_ramp",
      description:
        "把片段做成三段式速度斜坡：slow=快慢快（慢动作爆点）、fast=快更快快（加速转场）、bullet=子弹时间。会自动顺延同一轨道后面的片段。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          preset: { type: "string", enum: ["slow", "fast", "bullet"] },
        },
        required: ["clip_id", "preset"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clip_set_blend",
      description:
        "设置片段的混合模式，需要下方有另一条视频轨才会产生混合效果。mode 支持 normal/multiply/screen/overlay/soft-light/darken/lighten。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          mode: {
            type: "string",
            enum: ["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten"],
          },
        },
        required: ["clip_id", "mode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preview_get_state",
      description:
        "读取当前播放头、播放状态、选中片段、选中素材和当前面板，用于理解“这个片段”“这里”等指代。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "preview_seek",
      description: "把预览播放头定位到指定时间，单位秒。",
      parameters: {
        type: "object",
        properties: { time: { type: "number" } },
        required: ["time"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preview_play",
      description: "开始播放预览。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "preview_pause",
      description: "暂停预览。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "render_get_settings",
      description: "读取当前导出设置：分辨率、帧率、码率、格式、字幕烧录和导出范围。",
      parameters: emptyParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "render_update_settings",
      description:
        "更新导出设置。settings 可包含 width、height、fps、bitrate、format、burnSubtitles、rangeStart、rangeEnd。",
      parameters: {
        type: "object",
        properties: { settings: { type: "object" } },
        required: ["settings"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_start",
      description: "按当前或指定设置开始导出工程与渲染清单。",
      parameters: {
        type: "object",
        properties: { settings: { type: "object" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_batch",
      description:
        "批量渲染多个视频任务，会为每个任务弹出保存位置并逐个用 FFmpeg 渲染。jobs 是设置对象数组，每项可包含 width、height、fps、bitrate、format、burnSubtitles、rangeStart、rangeEnd。",
      parameters: {
        type: "object",
        properties: { jobs: { type: "array", items: { type: "object" } } },
        required: ["jobs"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_propose",
      description:
        "向用户提交一份可编辑的剪辑方案。只引用素材库里真实存在的 asset_id，不要编造。方案不会立即修改时间线，需要用户确认后才会应用。",
      parameters: {
        type: "object",
        properties: {
          shots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_id: { type: "string", description: "素材库中真实存在的 asset_id" },
                title: { type: "string", description: "镜头标题" },
                note: { type: "string", description: "镜头说明，例如景别、节奏、音效" },
                duration: { type: "number", description: "镜头时长，单位秒" },
                tone: { type: "string", description: "可选：画面风格标记，例如 sunset、wave" },
                source_in: {
                  type: "number",
                  description: "可选：从素材的第几秒开始取，精剪时必须按 analyze_footage 的镜头起点填写",
                },
                speed: { type: "number", description: "可选：0.25-4 倍速，默认 1" },
                transition: {
                  type: "string",
                  enum: ["fade", "flash"],
                  description: "可选：与上一个镜头的转场",
                },
              },
              required: ["title", "duration"],
              additionalProperties: false,
            },
          },
        },
        required: ["shots"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ui_click",
      description: "点击一个语义界面元素，例如 button.export、tab.inspector。",
      parameters: {
        type: "object",
        properties: { target: { type: "string", description: "元素的 data-agent-id" } },
        required: ["target"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ui_set_value",
      description: "设置输入框、滑块或下拉框的值。",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string" },
          value: { type: ["string", "number", "boolean"] },
        },
        required: ["target", "value"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "timeline_drag_clip",
      description: "语义化拖拽时间线片段到新的轨道或时间点。参数使用片段 ID，不使用屏幕坐标。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          start: { type: "number", description: "新的开始时间，单位秒" },
          track_id: { type: "string", description: "可选目标轨道 ID" },
        },
        required: ["clip_id", "start"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "timeline_trim_clip",
      description: "裁剪片段入点或出点。delta 为正表示延长，为负表示缩短。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          edge: { type: "string", enum: ["start", "end"] },
          delta: { type: "number", description: "裁剪量，单位秒" },
        },
        required: ["clip_id", "edge", "delta"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "timeline_split_clip",
      description: "在指定时间点分割片段。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          at: { type: "number", description: "绝对时间，单位秒" },
        },
        required: ["clip_id", "at"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "timeline_delete_clip",
      description: "删除片段，可选择波纹删除来闭合空隙。",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string" },
          ripple: { type: "boolean" },
        },
        required: ["clip_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "timeline_add_track",
      description: "添加视频、音频或字幕轨道。",
      parameters: {
        type: "object",
        properties: { kind: { type: "string", enum: ["video", "audio", "text"] } },
        required: ["kind"],
        additionalProperties: false,
      },
    },
  },
] as const;
