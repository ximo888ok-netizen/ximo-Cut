export const agentTools = [
  {
    type: "function",
    function: {
      name: "project_get_state",
      description: "读取当前工程、轨道、片段和时间线状态。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "ui_snapshot",
      description: "读取当前软件界面的语义树，返回所有可操作元素和 agent-id。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "audio_get_analysis",
      description: "读取已导入音频的分析结果：时长、采样率、峰值、RMS、估算响度、BPM、静音区间。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
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
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "preview_pause",
      description: "暂停预览。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "render_get_settings",
      description: "读取当前导出设置：分辨率、帧率、码率、格式、字幕烧录和导出范围。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "render_update_settings",
      description: "更新导出设置。settings 可包含 width、height、fps、bitrate、format、burnSubtitles、rangeStart、rangeEnd。",
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
      description: "批量导出多个渲染任务。jobs 是设置对象数组，每项可包含 width、height、fps、bitrate、format、burnSubtitles、rangeStart、rangeEnd。",
      parameters: {
        type: "object",
        properties: {
          jobs: { type: "array", items: { type: "object" } },
        },
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
        properties: {
          kind: { type: "string", enum: ["video", "audio", "text"] },
        },
        required: ["kind"],
        additionalProperties: false,
      },
    },
  },
] as const;

export type AgentToolName = (typeof agentTools)[number]["function"]["name"];
