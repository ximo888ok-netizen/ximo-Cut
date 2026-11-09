use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(serde::Serialize)]
struct FileInfo {
    name: String,
    size: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderKeyframe {
    property: String,
    time: f64,
    value: f64,
    #[serde(default)]
    easing: String,
}

#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RenderMask {
    shape: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    feather: f64,
    invert: bool,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderVideoClip {
    path: String,
    start: f64,
    duration: f64,
    source_in: f64,
    #[serde(default = "default_speed")]
    speed: f64,
    #[serde(default)]
    muted: bool,
    #[serde(default)]
    volume_db: f64,
    #[serde(default)]
    fade_in: f64,
    #[serde(default)]
    fade_out: f64,
    #[serde(default = "default_fade_color")]
    fade_in_color: String,
    #[serde(default = "default_fade_color")]
    fade_out_color: String,
    #[serde(default = "default_opacity")]
    opacity: f64,
    #[serde(default = "default_opacity")]
    scale: f64,
    #[serde(default)]
    rotation: f64,
    #[serde(default)]
    position_x: f64,
    #[serde(default)]
    position_y: f64,
    #[serde(default)]
    keyframes: Vec<RenderKeyframe>,
    #[serde(default)]
    mask: Option<RenderMask>,
    #[serde(default = "default_blend_mode")]
    blend_mode: String,
    #[serde(default)]
    denoise: bool,
    #[serde(default)]
    normalized: bool,
    #[serde(default)]
    image: bool,
    #[serde(default)]
    filters: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderAudioClip {
    path: String,
    start: f64,
    duration: f64,
    source_in: f64,
    #[serde(default = "default_speed")]
    speed: f64,
    #[serde(default)]
    volume_db: f64,
    #[serde(default)]
    fade_in: f64,
    #[serde(default)]
    fade_out: f64,
    #[serde(default)]
    denoise: bool,
    #[serde(default)]
    normalized: bool,
    #[serde(default)]
    ducking: bool,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderTextClip {
    text: String,
    start: f64,
    duration: f64,
    font_size: u32,
    #[serde(default = "default_text_color")]
    color: String,
    #[serde(default = "default_text_position")]
    position: String,
    #[serde(default)]
    bold: bool,
    #[serde(default)]
    stroke: u32,
    #[serde(default = "default_text_color")]
    stroke_color: String,
    #[serde(default)]
    background: bool,
    #[serde(default = "default_text_color")]
    background_color: String,
    #[serde(default = "default_text_align")]
    align: String,
    #[serde(default = "default_text_animation")]
    animation: String,
}

fn default_text_animation() -> String {
    "none".to_string()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderRequest {
    width: u32,
    height: u32,
    fps: u32,
    bitrate: String,
    format: String,
    duration: f64,
    #[serde(default)]
    vertical: bool,
    video_clips: Vec<RenderVideoClip>,
    audio_clips: Vec<RenderAudioClip>,
    text_clips: Vec<RenderTextClip>,
}

fn default_speed() -> f64 {
    1.0
}

fn default_opacity() -> f64 {
    1.0
}

fn default_fade_color() -> String {
    "black".to_string()
}

fn default_blend_mode() -> String {
    "normal".to_string()
}

fn default_text_color() -> String {
    "white".to_string()
}

fn default_text_position() -> String {
    "bottom".to_string()
}

fn default_text_align() -> String {
    "center".to_string()
}

fn fade_color(value: &str) -> &str {
    if value.eq_ignore_ascii_case("white") {
        "white"
    } else {
        "black"
    }
}

fn text_color(value: &str) -> &str {
    match value.to_ascii_lowercase().as_str() {
        "yellow" => "yellow",
        "red" => "red",
        "green" => "green",
        "black" => "black",
        "cyan" => "cyan",
        "magenta" => "magenta",
        "orange" => "orange",
        "blue" => "blue",
        _ => "white",
    }
}

#[tauri::command]
fn file_info(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);
    let metadata = std::fs::metadata(file_path).map_err(|error| error.to_string())?;
    Ok(FileInfo {
        name: file_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("未命名")
            .to_string(),
        size: metadata.len(),
    })
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|error| error.to_string())
}

#[derive(serde::Serialize)]
struct DraftFileEntry {
    name: String,
    size: u64,
    modified: u64,
}

#[derive(serde::Serialize)]
struct ReferenceFrame {
    path: String,
    time: f64,
}

#[derive(serde::Serialize)]
struct ReferenceFrames {
    duration: f64,
    frames: Vec<ReferenceFrame>,
}

fn app_data_dir(sub: &str) -> PathBuf {
    std::env::var("LOCALAPPDATA")
        .map(|base| PathBuf::from(base).join("ximo-Cut").join(sub))
        .unwrap_or_else(|_| std::env::temp_dir().join(format!("ximo-cut-{sub}")))
}

/// 改名后首次启动：把旧版本的数据目录与 WebView2 配置目录整体迁移到新名字
fn migrate_legacy_identity() {
    let Some(local) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) else {
        return;
    };
    for (legacy, current) in [
        ("OpenCut", "ximo-Cut"),
        ("com.opencut.studio", "com.ximocut.studio"),
    ] {
        let from = local.join(legacy);
        let to = local.join(current);
        if from.exists() && !to.exists() {
            let _ = std::fs::rename(from, to);
        }
    }
}

#[tauri::command]
fn drafts_directory() -> Result<String, String> {
    let dir = app_data_dir("drafts");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

fn list_json_files(sub: &str) -> Result<Vec<DraftFileEntry>, String> {
    let dir = app_data_dir(sub);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let mut entries = Vec::new();
    for item in std::fs::read_dir(&dir).map_err(|error| error.to_string())? {
        let item = item.map_err(|error| error.to_string())?;
        let path = item.path();
        if !path.is_file() || path.extension().map(|value| value != "json").unwrap_or(true) {
            continue;
        }
        let metadata = item.metadata().map_err(|error| error.to_string())?;
        let modified = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|value| value.as_millis() as u64)
            .unwrap_or(0);
        entries.push(DraftFileEntry {
            name: item.file_name().to_string_lossy().to_string(),
            size: metadata.len(),
            modified,
        });
    }
    entries.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(entries)
}

fn delete_app_file(sub: &str, path: &str) -> Result<(), String> {
    let dir = app_data_dir(sub);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let target = Path::new(path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let base = dir.canonicalize().map_err(|error| error.to_string())?;
    if !target.starts_with(&base) {
        return Err("只能删除应用数据目录内的文件".to_string());
    }
    std::fs::remove_file(target).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_draft_files() -> Result<Vec<DraftFileEntry>, String> {
    list_json_files("drafts")
}

#[tauri::command]
fn delete_draft_file(path: String) -> Result<(), String> {
    delete_app_file("drafts", &path)
}

#[tauri::command]
fn scripts_directory() -> Result<String, String> {
    let dir = app_data_dir("scripts");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn list_script_files() -> Result<Vec<DraftFileEntry>, String> {
    list_json_files("scripts")
}

#[tauri::command]
fn delete_script_file(path: String) -> Result<(), String> {
    delete_app_file("scripts", &path)
}

#[tauri::command]
async fn extract_reference_frames(
    path: String,
    count: usize,
) -> Result<ReferenceFrames, String> {
    tauri::async_runtime::spawn_blocking(move || extract_reference_frames_blocking(path, count))
        .await
        .map_err(|error| error.to_string())?
}

fn ffmpeg_binary() -> String {
    std::env::var("XIMOCUT_FFMPEG").unwrap_or_else(|_| "ffmpeg".to_string())
}

fn probe_duration(input: &str) -> Result<f64, String> {
    let mut command = Command::new(ffmpeg_binary());
    command.args(["-hide_banner", "-i", input]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command.output().map_err(|error| error.to_string())?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    parse_ffmpeg_duration(&stderr)
}

fn parse_ffmpeg_duration(stderr: &str) -> Result<f64, String> {
    let marker = "Duration: ";
    let start = stderr
        .find(marker)
        .map(|index| index + marker.len())
        .ok_or_else(|| "无法读取参考视频时长".to_string())?;
    let rest = &stderr[start..];
    let end = rest
        .find(',')
        .ok_or_else(|| "无法读取参考视频时长".to_string())?;
    let parts: Vec<&str> = rest[..end].trim().split(':').collect();
    if parts.len() != 3 {
        return Err("无法读取参考视频时长".to_string());
    }
    let hours: f64 = parts[0].trim().parse().map_err(|_| "视频时长无效".to_string())?;
    let minutes: f64 = parts[1].trim().parse().map_err(|_| "视频时长无效".to_string())?;
    let seconds: f64 = parts[2].trim().parse().map_err(|_| "视频时长无效".to_string())?;
    let total = hours * 3600.0 + minutes * 60.0 + seconds;
    if !total.is_finite() || total <= 0.0 {
        return Err("视频时长无效".to_string());
    }
    Ok(total)
}

fn extract_reference_frames_blocking(
    input: String,
    count: usize,
) -> Result<ReferenceFrames, String> {
    if !Path::new(&input).exists() {
        return Err("找不到参考视频文件".to_string());
    }
    let total = probe_duration(&input)?;
    let count = count.clamp(2, 12);
    let dir = app_data_dir("refframes");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let stamp = format!("{:x}", hasher.finish());

    let prefix = format!("{stamp}-");
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }

    let ffmpeg = ffmpeg_binary();
    let mut frames = Vec::new();
    for index in 0..count {
        let ratio = (index as f64 + 0.5) / count as f64;
        let time = (total * ratio).clamp(0.05, (total - 0.05).max(0.05));
        let output = dir.join(format!("{stamp}-{index}.jpg"));
        run_command(
            &ffmpeg,
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-ss".into(),
                format!("{time:.3}"),
                "-i".into(),
                input.clone(),
                "-frames:v".into(),
                "1".into(),
                "-vf".into(),
                "scale=640:-2".into(),
                "-q:v".into(),
                "5".into(),
                output.to_string_lossy().to_string(),
            ],
        )?;
        frames.push(ReferenceFrame {
            path: output.to_string_lossy().to_string(),
            time,
        });
    }
    Ok(ReferenceFrames {
        duration: total,
        frames,
    })
}

#[tauri::command]
async fn generate_thumbnail(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || generate_thumbnail_blocking(path))
        .await
        .map_err(|error| error.to_string())?
}

fn generate_thumbnail_blocking(input: String) -> Result<String, String> {
    if !Path::new(&input).exists() {
        return Err("找不到源文件".to_string());
    }
    let dir = app_data_dir("thumbnails");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let output = dir.join(format!("{:x}.png", hasher.finish()));
    if output.exists() {
        return Ok(output.to_string_lossy().to_string());
    }
    let ffmpeg = ffmpeg_binary();
    run_command(
        &ffmpeg,
        &[
            "-hide_banner".into(),
            "-loglevel".into(),
            "error".into(),
            "-y".into(),
            "-ss".into(),
            "0.1".into(),
            "-i".into(),
            input,
            "-frames:v".into(),
            "1".into(),
            "-vf".into(),
            "scale=480:-2".into(),
            output.to_string_lossy().to_string(),
        ],
    )?;
    Ok(output.to_string_lossy().to_string())
}

#[tauri::command]
async fn extract_audio(input: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || extract_audio_blocking(input))
        .await
        .map_err(|error| error.to_string())?
}

fn extract_audio_blocking(input: String) -> Result<String, String> {
    if !Path::new(&input).exists() {
        return Err("找不到源视频文件".to_string());
    }
    let ffmpeg = std::env::var("XIMOCUT_FFMPEG").unwrap_or_else(|_| "ffmpeg".to_string());
    let ffprobe = ffprobe_for(&ffmpeg);
    if probe_has_audio(&ffprobe, &input) != Some(true) {
        return Err("该视频没有音轨，无法提取音频".to_string());
    }
    let dir = std::env::var("LOCALAPPDATA")
        .map(|base| PathBuf::from(base).join("ximo-Cut").join("extracted"))
        .unwrap_or_else(|_| std::env::temp_dir().join("ximo-cut-audio"));
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let stem = Path::new(&input)
        .file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "audio".to_string());
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    let output = dir.join(format!("{stem}-{stamp}.m4a"));
    run_command(
        &ffmpeg,
        &[
            "-hide_banner".into(),
            "-loglevel".into(),
            "error".into(),
            "-y".into(),
            "-i".into(),
            input,
            "-vn".into(),
            "-c:a".into(),
            "aac".into(),
            "-b:a".into(),
            "192k".into(),
            output.to_string_lossy().to_string(),
        ],
    )?;
    Ok(output.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SpeechResult {
    path: String,
    duration: f64,
}

fn synthesize_speech_blocking(text: String, rate: i32) -> Result<SpeechResult, String> {
    let content = text.trim();
    if content.is_empty() {
        return Err("配音文本为空".to_string());
    }
    if content.chars().count() > 2000 {
        return Err("单次配音文本不能超过 2000 字".to_string());
    }
    let dir = app_data_dir("voice");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    let text_path = dir.join(format!("speech-{stamp}.txt"));
    let output_path = dir.join(format!("speech-{stamp}.wav"));
    std::fs::write(&text_path, content).map_err(|error| error.to_string())?;
    let text_arg = text_path.to_string_lossy().replace('\'', "''");
    let out_arg = output_path.to_string_lossy().replace('\'', "''");
    let script = format!(
        "$text = [IO.File]::ReadAllText('{text_arg}', [Text.Encoding]::UTF8); \
         Add-Type -AssemblyName System.Speech; \
         $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
         $synth.Rate = {rate}; \
         $synth.SetOutputToWaveFile('{out_arg}'); \
         $synth.Speak($text); \
         $synth.Dispose()"
    );
    run_command(
        "powershell",
        &[
            "-NoProfile".into(),
            "-NonInteractive".into(),
            "-ExecutionPolicy".into(),
            "Bypass".into(),
            "-Command".into(),
            script,
        ],
    )
    .map_err(|error| format!("系统配音失败：{error}"))?;
    if !output_path.exists() {
        return Err("系统没有生成配音文件".to_string());
    }
    let duration = probe_duration(&output_path.to_string_lossy()).unwrap_or(0.0);
    Ok(SpeechResult {
        path: output_path.to_string_lossy().to_string(),
        duration,
    })
}

#[tauri::command]
async fn synthesize_speech(text: String, rate: Option<i32>) -> Result<SpeechResult, String> {
    let rate = rate.unwrap_or(0).clamp(-10, 10);
    tauri::async_runtime::spawn_blocking(move || synthesize_speech_blocking(text, rate))
        .await
        .map_err(|error| error.to_string())?
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptSegment {
    start: f64,
    end: f64,
    text: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptResult {
    segments: Vec<TranscriptSegment>,
    duration: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AsrStatus {
    available: bool,
    binary: Option<String>,
    model: Option<String>,
    reason: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscribeSegment {
    path: String,
    start: f64,
    duration: f64,
}

fn bundled_resource_dir(sub: &str) -> Option<PathBuf> {
    let env_key = format!("XIMO_{}_DIR", sub.to_ascii_uppercase());
    if let Ok(value) = std::env::var(&env_key) {
        let dir = PathBuf::from(value);
        if dir.exists() {
            return Some(dir);
        }
    }
    let mut bases: Vec<PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            bases.push(parent.to_path_buf());
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        bases.push(cwd.clone());
        if let Some(parent) = cwd.parent() {
            bases.push(parent.to_path_buf());
        }
    }
    for base in bases {
        for relative in [format!("resources/{sub}"), sub.to_string()] {
            let dir = base.join(relative);
            if dir.exists() {
                return Some(dir);
            }
        }
    }
    let fallback = app_data_dir(sub);
    if fallback.exists() {
        Some(fallback)
    } else {
        None
    }
}

fn asr_resource_dir() -> Option<PathBuf> {
    bundled_resource_dir("asr")
}

fn resolve_whisper(dir: &Path) -> Option<PathBuf> {
    for name in ["whisper-cli.exe", "main.exe", "whisper.exe"] {
        let candidate = dir.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

fn resolve_asr_model(dir: &Path) -> Option<PathBuf> {
    for name in [
        "ggml-base-q5_1.bin",
        "ggml-base.bin",
        "ggml-tiny-q5_1.bin",
        "ggml-small-q5_1.bin",
    ] {
        let candidate = dir.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

fn asr_parts() -> Result<(PathBuf, PathBuf), String> {
    let dir = asr_resource_dir().ok_or_else(|| {
        "本地语音模型未安装：请把 resources/asr 目录放到程序旁边后重试".to_string()
    })?;
    let binary = resolve_whisper(&dir)
        .ok_or_else(|| format!("找不到 whisper-cli.exe，请检查 {}", dir.display()))?;
    let model = resolve_asr_model(&dir)
        .ok_or_else(|| format!("找不到语音模型文件，请检查 {}", dir.display()))?;
    Ok((binary, model))
}

#[tauri::command]
fn asr_status() -> AsrStatus {
    let Some(dir) = asr_resource_dir() else {
        return AsrStatus {
            available: false,
            binary: None,
            model: None,
            reason: Some("本地语音模型未安装".to_string()),
        };
    };
    let binary = resolve_whisper(&dir);
    let model = resolve_asr_model(&dir);
    let available = binary.is_some() && model.is_some();
    AsrStatus {
        available,
        binary: binary.map(|path| path.to_string_lossy().to_string()),
        model: model.map(|path| path.to_string_lossy().to_string()),
        reason: if available {
            None
        } else {
            Some(format!("语音模型文件不完整：{}", dir.display()))
        },
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MusicTrackInfo {
    id: String,
    name: String,
    bpm: u32,
    mood: String,
    duration: f64,
    path: String,
}

#[tauri::command]
fn music_library() -> Result<Vec<MusicTrackInfo>, String> {
    let dir = bundled_resource_dir("music")
        .ok_or_else(|| "内置音乐未安装：请把 resources/music 目录放到程序旁边".to_string())?;
    let raw = std::fs::read_to_string(dir.join("music.json"))
        .map_err(|error| format!("读取内置音乐清单失败：{error}"))?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|error| format!("内置音乐清单格式错误：{error}"))?;
    let items = value
        .get("tracks")
        .and_then(|items| items.as_array())
        .ok_or_else(|| "内置音乐清单缺少 tracks 字段".to_string())?;
    let mut tracks = Vec::new();
    for item in items {
        let file = item
            .get("file")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        if file.is_empty() {
            continue;
        }
        let path = dir.join(file);
        if !path.exists() {
            continue;
        }
        tracks.push(MusicTrackInfo {
            id: item
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or(file)
                .to_string(),
            name: item
                .get("name")
                .and_then(|value| value.as_str())
                .unwrap_or("内置音乐")
                .to_string(),
            bpm: item.get("bpm").and_then(|value| value.as_u64()).unwrap_or(100) as u32,
            mood: item
                .get("mood")
                .and_then(|value| value.as_str())
                .unwrap_or("neutral")
                .to_string(),
            duration: item
                .get("duration")
                .and_then(|value| value.as_f64())
                .unwrap_or(60.0),
            path: path.to_string_lossy().to_string(),
        });
    }
    Ok(tracks)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SfxInfo {
    id: String,
    name: String,
    category: String,
    duration: f64,
    path: String,
}

#[tauri::command]
fn sfx_library() -> Result<Vec<SfxInfo>, String> {
    let dir = bundled_resource_dir("sfx")
        .ok_or_else(|| "内置音效未安装：请把 resources/sfx 目录放到程序旁边".to_string())?;
    let raw = std::fs::read_to_string(dir.join("sfx.json"))
        .map_err(|error| format!("读取内置音效清单失败：{error}"))?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|error| format!("内置音效清单格式错误：{error}"))?;
    let items = value
        .get("items")
        .and_then(|items| items.as_array())
        .ok_or_else(|| "内置音效清单缺少 items 字段".to_string())?;
    let mut effects = Vec::new();
    for item in items {
        let file = item
            .get("file")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        if file.is_empty() {
            continue;
        }
        let path = dir.join(file);
        if !path.exists() {
            continue;
        }
        effects.push(SfxInfo {
            id: item
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or(file)
                .to_string(),
            name: item
                .get("name")
                .and_then(|value| value.as_str())
                .unwrap_or("内置音效")
                .to_string(),
            category: item
                .get("category")
                .and_then(|value| value.as_str())
                .unwrap_or("点缀")
                .to_string(),
            duration: item
                .get("duration")
                .and_then(|value| value.as_f64())
                .unwrap_or(0.5),
            path: path.to_string_lossy().to_string(),
        });
    }
    Ok(effects)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SilenceSpan {
    start: f64,
    end: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ShotInfo {
    start: f64,
    end: f64,
    blur: f64,
    brightness: f64,
    score: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterialAnalysis {
    duration: f64,
    scenes: Vec<f64>,
    silences: Vec<SilenceSpan>,
    shots: Vec<ShotInfo>,
}

#[tauri::command]
async fn analyze_material(
    input: String,
    quality: Option<bool>,
) -> Result<MaterialAnalysis, String> {
    tauri::async_runtime::spawn_blocking(move || {
        analyze_material_blocking(input, quality.unwrap_or(false))
    })
    .await
    .map_err(|error| error.to_string())?
}

fn analyze_material_blocking(input: String, quality: bool) -> Result<MaterialAnalysis, String> {
    if !Path::new(&input).exists() {
        return Err("找不到要分析的素材".to_string());
    }
    let duration = probe_duration(&input).unwrap_or(0.0);
    let scenes = detect_scenes(&input).unwrap_or_default();
    let silences = detect_silences(&input, duration).unwrap_or_default();
    let shots = if quality {
        let metrics = analyze_frame_metrics(&input);
        build_shots(&scenes, duration, &metrics)
    } else {
        Vec::new()
    };
    Ok(MaterialAnalysis {
        duration,
        scenes,
        silences,
        shots,
    })
}

struct FrameMetric {
    time: f64,
    blur: f64,
    brightness: f64,
}

fn analyze_frame_metrics(input: &str) -> Vec<FrameMetric> {
    let log = run_ffmpeg_log(&[
        "-hide_banner".into(),
        "-nostdin".into(),
        "-i".into(),
        input.to_string(),
        "-an".into(),
        "-sn".into(),
        "-vf".into(),
        "scale=320:-2,blurdetect=low=0.1:high=0.5,signalstats,metadata=print:file=-".into(),
        "-f".into(),
        "null".into(),
        "-".into(),
    ])
    .unwrap_or_default();
    parse_frame_metrics(&log)
}

fn parse_frame_metrics(log: &str) -> Vec<FrameMetric> {
    let mut metrics = Vec::new();
    let mut time: Option<f64> = None;
    let mut blur: Option<f64> = None;
    for line in log.lines() {
        if let Some(index) = line.find("pts_time:") {
            time = parse_seconds(&line[index + "pts_time:".len()..]);
        } else if let Some(index) = line.find("lavfi.blur=") {
            blur = parse_seconds(&line[index + "lavfi.blur=".len()..]);
        } else if let Some(index) = line.find("lavfi.signalstats.YAVG=") {
            let brightness = parse_seconds(&line[index + "lavfi.signalstats.YAVG=".len()..]);
            if let (Some(frame_time), Some(frame_blur), Some(frame_brightness)) =
                (time, blur, brightness)
            {
                metrics.push(FrameMetric {
                    time: frame_time,
                    blur: frame_blur,
                    brightness: frame_brightness,
                });
                blur = None;
            }
        }
    }
    metrics
}

fn build_shots(scenes: &[f64], duration: f64, metrics: &[FrameMetric]) -> Vec<ShotInfo> {
    if duration <= 0.2 {
        return Vec::new();
    }
    let mut bounds = vec![0.0];
    bounds.extend(
        scenes
            .iter()
            .copied()
            .filter(|time| *time > 0.2 && *time < duration - 0.2),
    );
    bounds.push(duration);
    let max_blur = metrics
        .iter()
        .filter(|metric| metric.blur.is_finite())
        .map(|metric| metric.blur)
        .fold(0.0_f64, f64::max)
        .max(1.0);
    let mut shots = Vec::new();
    for pair in bounds.windows(2) {
        let start = pair[0];
        let end = pair[1];
        let frames: Vec<&FrameMetric> = metrics
            .iter()
            .filter(|metric| metric.time >= start && metric.time < end)
            .collect();
        if frames.is_empty() {
            continue;
        }
        let count = frames.len() as f64;
        let blur = frames
            .iter()
            .map(|metric| if metric.blur.is_finite() { metric.blur } else { 0.0 })
            .sum::<f64>()
            / count;
        let brightness = frames
            .iter()
            .map(|metric| {
                if metric.brightness.is_finite() {
                    metric.brightness
                } else {
                    0.0
                }
            })
            .sum::<f64>()
            / count;
        let sharpness = (blur / max_blur).clamp(0.0, 1.0);
        let exposure = 1.0 - ((brightness - 118.0).abs() / 118.0).clamp(0.0, 1.0);
        let score = (sharpness * 0.7 + exposure * 0.3) * 100.0;
        shots.push(ShotInfo {
            start,
            end,
            blur: round3(blur),
            brightness: round3(brightness),
            score: round3(score),
        });
    }
    shots
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewMetrics {
    duration: f64,
    scenes: u32,
    black_ratio: f64,
    freeze_ratio: f64,
    loudness: Option<f64>,
    peak: Option<f64>,
    avg_shot: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewIssue {
    level: String,
    text: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewReport {
    metrics: ReviewMetrics,
    issues: Vec<ReviewIssue>,
    score: u32,
}

#[tauri::command]
async fn review_video(input: String) -> Result<ReviewReport, String> {
    tauri::async_runtime::spawn_blocking(move || review_video_blocking(input))
        .await
        .map_err(|error| error.to_string())?
}

fn review_video_blocking(input: String) -> Result<ReviewReport, String> {
    if !Path::new(&input).exists() {
        return Err("找不到要审片的视频".to_string());
    }
    let duration = probe_duration(&input)?;
    let video_log = run_ffmpeg_log(&[
        "-hide_banner".into(),
        "-nostdin".into(),
        "-i".into(),
        input.clone(),
        "-vf".into(),
        "blackdetect=d=0.12:pix_th=0.10,freezedetect=n=-60dB:d=0.4,select='gt(scene,0.3)',showinfo"
            .into(),
        "-an".into(),
        "-f".into(),
        "null".into(),
        "-".into(),
    ])?;
    let audio_log = run_ffmpeg_log(&[
        "-hide_banner".into(),
        "-nostdin".into(),
        "-i".into(),
        input,
        "-vn".into(),
        "-af".into(),
        "ebur128=peak=true".into(),
        "-f".into(),
        "null".into(),
        "-".into(),
    ])
    .unwrap_or_default();

    let black = parse_ranges(&video_log, "black_start:", "black_end:", duration);
    let freeze = parse_ranges(&video_log, "freeze_start:", "freeze_end:", duration);
    let scenes = parse_scene_times(&video_log);
    let (loudness, peak) = parse_ebur128(&audio_log);

    let black_ratio = round3(black.iter().map(|(start, end)| end - start).sum::<f64>() / duration);
    let freeze_ratio =
        round3(freeze.iter().map(|(start, end)| end - start).sum::<f64>() / duration);
    let avg_shot = round3(duration / (scenes.len() as f64 + 1.0));

    let mut issues = Vec::new();
    if black_ratio > 0.10 {
        issues.push(ReviewIssue {
            level: "warn".into(),
            text: format!("黑场占比 {:.0}%，画面断档明显", black_ratio * 100.0),
        });
    }
    if freeze_ratio > 0.08 {
        issues.push(ReviewIssue {
            level: "warn".into(),
            text: format!("静止画面占比 {:.0}%，容易让人走神", freeze_ratio * 100.0),
        });
    }
    if scenes.is_empty() && duration > 8.0 {
        issues.push(ReviewIssue {
            level: "warn".into(),
            text: "全片只有一个镜头，缺少景别与节奏变化".into(),
        });
    }
    if avg_shot > 7.0 {
        issues.push(ReviewIssue {
            level: "warn".into(),
            text: format!("平均镜头 {avg_shot:.1} 秒，节奏偏慢"),
        });
    } else if avg_shot < 1.2 {
        issues.push(ReviewIssue {
            level: "info".into(),
            text: format!("平均镜头 {avg_shot:.1} 秒，剪辑偏碎"),
        });
    }
    match loudness {
        Some(value) if (value + 16.0).abs() > 6.0 => issues.push(ReviewIssue {
            level: "warn".into(),
            text: format!("整体响度 {value:.1} LUFS，建议在 -16 到 -14 之间"),
        }),
        None => issues.push(ReviewIssue {
            level: "warn".into(),
            text: "没有检测到音频轨，成片会是无声的".into(),
        }),
        _ => {}
    }
    if issues.is_empty() {
        issues.push(ReviewIssue {
            level: "info".into(),
            text: "黑场、静止画面、节奏和响度都在合理范围".into(),
        });
    }

    let mut score: i32 = 100;
    if black_ratio > 0.10 {
        score -= 18;
    } else if black_ratio > 0.03 {
        score -= 8;
    }
    if freeze_ratio > 0.08 {
        score -= 15;
    }
    if scenes.is_empty() && duration > 8.0 {
        score -= 18;
    }
    if avg_shot > 10.0 {
        score -= 16;
    } else if avg_shot > 7.0 {
        score -= 10;
    } else if avg_shot < 1.2 {
        score -= 6;
    }
    match loudness {
        Some(value) if (value + 16.0).abs() > 6.0 => score -= 15,
        Some(value) if (value + 16.0).abs() > 3.0 => score -= 8,
        None => score -= 12,
        _ => {}
    }

    Ok(ReviewReport {
        metrics: ReviewMetrics {
            duration: round3(duration),
            scenes: scenes.len() as u32,
            black_ratio,
            freeze_ratio,
            loudness,
            peak,
            avg_shot,
        },
        issues,
        score: score.clamp(0, 100) as u32,
    })
}

fn parse_ranges(
    log: &str,
    start_key: &str,
    end_key: &str,
    duration: f64,
) -> Vec<(f64, f64)> {
    let mut ranges = Vec::new();
    let mut start: Option<f64> = None;
    for line in log.lines() {
        if let Some(index) = line.find(start_key) {
            start = parse_seconds(&line[index + start_key.len()..]);
        }
        if let Some(index) = line.find(end_key) {
            let Some(end) = parse_seconds(&line[index + end_key.len()..]) else {
                continue;
            };
            if let Some(begin) = start.take() {
                if end > begin {
                    ranges.push((begin, end));
                }
            }
        }
    }
    if let Some(begin) = start {
        if duration > begin {
            ranges.push((begin, duration));
        }
    }
    ranges
}

fn parse_ebur128(log: &str) -> (Option<f64>, Option<f64>) {
    let mut loudness = None;
    let mut peak = None;
    for line in log.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("I:") && trimmed.contains("LUFS") {
            loudness = parse_seconds(trimmed["I:".len()..].trim_start());
        } else if trimmed.starts_with("Peak:") && trimmed.contains("dBFS") {
            peak = parse_seconds(trimmed["Peak:".len()..].trim_start());
        }
    }
    (loudness, peak)
}

#[tauri::command]
fn preview_output_path() -> Result<String, String> {
    let dir = std::env::temp_dir().join("ximo-preview");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    Ok(dir
        .join(format!("preview-{stamp}.mp4"))
        .to_string_lossy()
        .to_string())
}

fn detect_scenes(input: &str) -> Result<Vec<f64>, String> {
    let log = run_ffmpeg_log(&[
        "-hide_banner".into(),
        "-nostdin".into(),
        "-i".into(),
        input.to_string(),
        "-an".into(),
        "-sn".into(),
        "-filter:v".into(),
        "scale=240:-2,select='gt(scene,0.3)',showinfo".into(),
        "-f".into(),
        "null".into(),
        "-".into(),
    ])?;
    Ok(parse_scene_times(&log))
}

fn parse_scene_times(log: &str) -> Vec<f64> {
    let mut times: Vec<f64> = Vec::new();
    for line in log.lines() {
        if !line.contains("Parsed_showinfo") {
            continue;
        }
        let Some(index) = line.find("pts_time:") else {
            continue;
        };
        let raw: String = line[index + "pts_time:".len()..]
            .chars()
            .take_while(|value| value.is_ascii_digit() || *value == '.' || *value == '-')
            .collect();
        let Ok(time) = raw.parse::<f64>() else {
            continue;
        };
        if !time.is_finite() || time < 0.3 {
            continue;
        }
        if times
            .last()
            .map(|last| time - last >= 0.4)
            .unwrap_or(true)
        {
            times.push((time * 1000.0).round() / 1000.0);
        }
    }
    times
}

fn detect_silences(input: &str, duration: f64) -> Result<Vec<SilenceSpan>, String> {
    let log = run_ffmpeg_log(&[
        "-hide_banner".into(),
        "-nostdin".into(),
        "-i".into(),
        input.to_string(),
        "-vn".into(),
        "-af".into(),
        "silencedetect=noise=-32dB:d=0.30".into(),
        "-f".into(),
        "null".into(),
        "-".into(),
    ])?;
    Ok(parse_silences(&log, duration))
}

fn parse_silences(log: &str, duration: f64) -> Vec<SilenceSpan> {
    let mut spans = Vec::new();
    let mut start: Option<f64> = None;
    for line in log.lines() {
        if let Some(index) = line.find("silence_start:") {
            start = parse_seconds(&line[index + "silence_start:".len()..]);
        } else if let Some(index) = line.find("silence_end:") {
            let Some(end) = parse_seconds(&line[index + "silence_end:".len()..]) else {
                continue;
            };
            if let Some(begin) = start.take() {
                if end - begin >= 0.2 {
                    spans.push(SilenceSpan { start: begin, end });
                }
            }
        }
    }
    if let Some(begin) = start {
        if duration > begin + 0.2 {
            spans.push(SilenceSpan {
                start: begin,
                end: duration,
            });
        }
    }
    spans
}

fn parse_seconds(raw: &str) -> Option<f64> {
    let trimmed = raw.trim_start();
    if trimmed.starts_with("nan") {
        return Some(f64::NAN);
    }
    let value: String = trimmed
        .chars()
        .take_while(|value| value.is_ascii_digit() || *value == '.' || *value == '-')
        .collect();
    let parsed = value.parse::<f64>().ok()?;
    if parsed.is_finite() {
        Some((parsed * 1000.0).round() / 1000.0)
    } else {
        None
    }
}

fn run_ffmpeg_log(args: &[String]) -> Result<String, String> {
    let mut command = Command::new(ffmpeg_binary());
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command.output().map_err(|error| error.to_string())?;
    let mut text = String::from_utf8_lossy(&output.stdout).to_string();
    text.push_str(&String::from_utf8_lossy(&output.stderr));
    Ok(text)
}

#[tauri::command]
async fn transcribe_audio(
    input: String,
    language: Option<String>,
) -> Result<TranscriptResult, String> {
    tauri::async_runtime::spawn_blocking(move || transcribe_audio_blocking(input, language))
        .await
        .map_err(|error| error.to_string())?
}

fn transcribe_audio_blocking(
    input: String,
    language: Option<String>,
) -> Result<TranscriptResult, String> {
    if !Path::new(&input).exists() {
        return Err("找不到要转写的文件".to_string());
    }
    let (binary, model) = asr_parts()?;
    let work = std::env::temp_dir().join(format!(
        "ximo-asr-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or(0)
    ));
    std::fs::create_dir_all(&work).map_err(|error| error.to_string())?;
    let wav = work.join("source.wav");
    extract_wav(&input, &wav)?;
    let result = run_whisper(&binary, &model, &wav, &work, language.as_deref());
    let _ = std::fs::remove_dir_all(&work);
    result
}

#[tauri::command]
async fn transcribe_segments(
    segments: Vec<TranscribeSegment>,
    language: Option<String>,
) -> Result<TranscriptResult, String> {
    tauri::async_runtime::spawn_blocking(move || transcribe_segments_blocking(segments, language))
        .await
        .map_err(|error| error.to_string())?
}

fn transcribe_segments_blocking(
    segments: Vec<TranscribeSegment>,
    language: Option<String>,
) -> Result<TranscriptResult, String> {
    if segments.is_empty() {
        return Err("没有可转写的片段".to_string());
    }
    for segment in &segments {
        if !Path::new(&segment.path).exists() {
            return Err(format!("找不到片段文件 {}", segment.path));
        }
        if segment.duration <= 0.05 {
            return Err("片段时长过短，无法转写".to_string());
        }
    }
    let (binary, model) = asr_parts()?;
    let work = std::env::temp_dir().join(format!(
        "ximo-asr-cut-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or(0)
    ));
    std::fs::create_dir_all(&work).map_err(|error| error.to_string())?;
    let wav = work.join("timeline.wav");
    extract_segments_wav(&segments, &wav)?;
    let result = run_whisper(&binary, &model, &wav, &work, language.as_deref());
    let _ = std::fs::remove_dir_all(&work);
    result
}

fn extract_wav(input: &str, output: &Path) -> Result<(), String> {
    run_command(
        &ffmpeg_binary(),
        &[
            "-hide_banner".into(),
            "-loglevel".into(),
            "error".into(),
            "-y".into(),
            "-i".into(),
            input.to_string(),
            "-vn".into(),
            "-ac".into(),
            "1".into(),
            "-ar".into(),
            "16000".into(),
            "-c:a".into(),
            "pcm_s16le".into(),
            output.to_string_lossy().to_string(),
        ],
    )?;
    Ok(())
}

fn extract_segments_wav(segments: &[TranscribeSegment], output: &Path) -> Result<(), String> {
    let mut args: Vec<String> = vec![
        "-hide_banner".into(),
        "-loglevel".into(),
        "error".into(),
        "-y".into(),
    ];
    for segment in segments {
        args.push("-ss".into());
        args.push(format!("{:.3}", segment.start.max(0.0)));
        args.push("-t".into());
        args.push(format!("{:.3}", segment.duration.max(0.05)));
        args.push("-i".into());
        args.push(segment.path.clone());
    }
    let mut filters: Vec<String> = Vec::new();
    let mut concat_inputs = String::new();
    for index in 0..segments.len() {
        filters.push(format!(
            "[{index}:a]aresample=16000,aformat=sample_fmts=s16:channel_layouts=mono[a{index}]"
        ));
        concat_inputs.push_str(&format!("[a{index}]"));
    }
    let graph = format!(
        "{};{}concat=n={}:v=0:a=1[out]",
        filters.join(";"),
        concat_inputs,
        segments.len()
    );
    args.push("-filter_complex".into());
    args.push(graph);
    args.push("-map".into());
    args.push("[out]".into());
    args.push("-ac".into());
    args.push("1".into());
    args.push("-ar".into());
    args.push("16000".into());
    args.push("-c:a".into());
    args.push("pcm_s16le".into());
    args.push(output.to_string_lossy().to_string());
    run_command(&ffmpeg_binary(), &args)?;
    Ok(())
}

fn run_whisper(
    binary: &Path,
    model: &Path,
    wav: &Path,
    work: &Path,
    language: Option<&str>,
) -> Result<TranscriptResult, String> {
    let prefix = work.join("transcript");
    let language = language
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or("zh");
    let threads = std::thread::available_parallelism()
        .map(|value| value.get().min(8))
        .unwrap_or(4);
    run_command(
        &binary.to_string_lossy(),
        &[
            "-m".into(),
            model.to_string_lossy().to_string(),
            "-f".into(),
            wav.to_string_lossy().to_string(),
            "-l".into(),
            language.to_string(),
            "-t".into(),
            threads.to_string(),
            "-oj".into(),
            "-of".into(),
            prefix.to_string_lossy().to_string(),
            "-np".into(),
        ],
    )?;
    let json_path = work.join("transcript.json");
    let raw = std::fs::read_to_string(&json_path)
        .map_err(|error| format!("无法读取转写结果：{error}"))?;
    parse_whisper_json(&raw)
}

fn parse_whisper_json(raw: &str) -> Result<TranscriptResult, String> {
    let value: serde_json::Value =
        serde_json::from_str(raw).map_err(|error| format!("转写结果格式错误：{error}"))?;
    let items = value
        .get("transcription")
        .and_then(|items| items.as_array())
        .ok_or_else(|| "转写结果缺少 transcription 字段".to_string())?;
    let mut segments = Vec::new();
    let mut duration = 0.0_f64;
    for item in items {
        let text = item
            .get("text")
            .and_then(|text| text.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if text.is_empty() {
            continue;
        }
        let from = item
            .pointer("/offsets/from")
            .and_then(|value| value.as_f64());
        let to = item
            .pointer("/offsets/to")
            .and_then(|value| value.as_f64());
        let (Some(from), Some(to)) = (from, to) else {
            continue;
        };
        let start = (from / 1000.0).max(0.0);
        let end = (to / 1000.0).max(start + 0.2);
        duration = duration.max(end);
        segments.push(TranscriptSegment { start, end, text });
    }
    Ok(TranscriptResult { segments, duration })
}

#[tauri::command]
fn save_audio_bytes(base64: String, extension: String) -> Result<String, String> {
    let bytes = decode_base64(&base64)?;
    if bytes.len() < 512 {
        return Err("录音数据为空".to_string());
    }
    let ext = match extension.to_ascii_lowercase().as_str() {
        "webm" => "webm",
        "ogg" => "ogg",
        "wav" => "wav",
        "m4a" | "mp4" => "m4a",
        _ => return Err("不支持的录音格式".to_string()),
    };
    let dir = std::env::var("LOCALAPPDATA")
        .map(|base| PathBuf::from(base).join("ximo-Cut").join("recordings"))
        .unwrap_or_else(|_| std::env::temp_dir().join("ximo-cut-recordings"));
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    let path = dir.join(format!("recording-{stamp}.{ext}"));
    std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let mut output = Vec::with_capacity(input.len() * 3 / 4 + 3);
    let mut buffer: u32 = 0;
    let mut bits = 0;
    for character in input.chars() {
        let value = match character {
            'A'..='Z' => character as u32 - 'A' as u32,
            'a'..='z' => character as u32 - 'a' as u32 + 26,
            '0'..='9' => character as u32 - '0' as u32 + 52,
            '+' => 62,
            '/' => 63,
            '=' => break,
            value if value.is_whitespace() => continue,
            _ => return Err("录音数据编码无效".to_string()),
        };
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xFF) as u8);
        }
    }
    Ok(output)
}

fn has_keyframe(frames: &[RenderKeyframe], property: &str) -> bool {
    frames.iter().any(|frame| frame.property == property)
}

fn max_keyframe_value(frames: &[RenderKeyframe], property: &str, fallback: f64) -> f64 {
    frames
        .iter()
        .filter(|frame| frame.property == property)
        .map(|frame| frame.value.abs())
        .fold(fallback.abs(), f64::max)
}

fn easing_expr(progress: &str, easing: &str) -> String {
    match easing {
        "easeIn" => format!("pow({progress},2)"),
        "easeOut" => format!("(1-pow(1-({progress}),2))"),
        "easeInOut" => format!(
            "if(lt({progress},0.5),2*{progress}*{progress},1-pow(-2*{progress}+2,2)/2)"
        ),
        "hold" => "0".to_string(),
        _ => progress.to_string(),
    }
}

/// 把关键帧插值编译成 FFmpeg 表达式，var 是时间变量（t / T / time）
fn keyframe_expr(
    frames: &[RenderKeyframe],
    property: &str,
    fallback: f64,
    var: &str,
) -> String {
    let mut list: Vec<&RenderKeyframe> = frames
        .iter()
        .filter(|frame| frame.property == property)
        .collect();
    list.sort_by(|a, b| {
        a.time
            .partial_cmp(&b.time)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    if list.is_empty() {
        return format!("{:.4}", fallback);
    }
    let last = list[list.len() - 1];
    let mut expr = format!("{:.4}", last.value);
    for index in (0..list.len().saturating_sub(1)).rev() {
        let current = list[index];
        let next = list[index + 1];
        let span = (next.time - current.time).max(0.001);
        let progress = format!("(({}-{:.4})/{:.4})", var, current.time, span);
        let eased = easing_expr(&progress, &current.easing);
        let segment = format!(
            "({:.4}+({:.4}-{:.4})*{})",
            current.value, next.value, current.value, eased
        );
        expr = format!("if(lt({},{:.4}),{},{})", var, next.time, segment, expr);
    }
    if list[0].time > 0.001 {
        expr = format!(
            "if(lt({},{:.4}),{:.4},{})",
            var, list[0].time, list[0].value, expr
        );
    }
    expr
}

fn blend_filter_name(mode: &str) -> String {
    match mode {
        "multiply" => "multiply",
        "screen" => "screen",
        "overlay" => "overlay",
        "soft-light" | "softlight" => "softlight",
        "hard-light" | "hardlight" => "hardlight",
        "darken" => "darken",
        "lighten" => "lighten",
        "difference" => "difference",
        "exclusion" => "exclusion",
        "color-dodge" | "dodge" => "dodge",
        "color-burn" | "burn" => "burn",
        _ => "normal",
    }
    .to_string()
}

fn mask_expr(mask: &RenderMask, width: u32, height: u32) -> String {
    let w = width as f64;
    let h = height as f64;
    let x0 = ((mask.x - mask.width / 2.0).clamp(0.0, 1.0)) * w;
    let x1 = ((mask.x + mask.width / 2.0).clamp(0.0, 1.0)) * w;
    let y0 = ((mask.y - mask.height / 2.0).clamp(0.0, 1.0)) * h;
    let y1 = ((mask.y + mask.height / 2.0).clamp(0.0, 1.0)) * h;
    let feather = (mask.feather.clamp(0.001, 0.5) * w.min(h) * 0.5).max(1.0);
    let body = match mask.shape.as_str() {
        "ellipse" => {
            let cx = mask.x * w;
            let cy = mask.y * h;
            let rx = (mask.width * w / 2.0).max(1.0);
            let ry = (mask.height * h / 2.0).max(1.0);
            let edge = (feather * 2.0 / rx.min(ry)).max(0.001);
            format!(
                "clip((1-(pow((X-{cx:.2})/{rx:.2},2)+pow((Y-{cy:.2})/{ry:.2},2)))/{edge:.4},0,1)"
            )
        }
        "linear" => format!(
            "clip((X-{x0:.2})/{feather:.2},0,1)*clip(({x1:.2}-X)/{feather:.2},0,1)"
        ),
        _ => format!(
            "clip((X-{x0:.2})/{feather:.2},0,1)*clip(({x1:.2}-X)/{feather:.2},0,1)*clip((Y-{y0:.2})/{feather:.2},0,1)*clip(({y1:.2}-Y)/{feather:.2},0,1)"
        ),
    };
    if mask.invert {
        format!("(1-({body}))")
    } else {
        body
    }
}

#[tauri::command]
async fn render_video(request: RenderRequest, output: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || render_blocking(request, output))
        .await
        .map_err(|error| error.to_string())?
}

fn render_blocking(request: RenderRequest, output: String) -> Result<String, String> {
    if request.duration <= 0.05 {
        return Err("导出时长必须大于 0 秒".to_string());
    }
    if request.video_clips.is_empty()
        && request.audio_clips.is_empty()
        && request.text_clips.is_empty()
    {
        return Err("时间线上没有可导出的片段".to_string());
    }

    let ffmpeg = std::env::var("XIMOCUT_FFMPEG").unwrap_or_else(|_| "ffmpeg".to_string());
    let ffprobe = ffprobe_for(&ffmpeg);
    let has_audio = |path: &str| probe_has_audio(&ffprobe, path).unwrap_or(false);

    let work_dir = std::env::temp_dir().join(format!(
        "ximo-cut-render-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or(0)
    ));
    std::fs::create_dir_all(&work_dir).map_err(|error| error.to_string())?;

    let mut args: Vec<String> = vec![
        "-hide_banner".into(),
        "-loglevel".into(),
        "error".into(),
        "-nostdin".into(),
        "-y".into(),
    ];

    for clip in &request.video_clips {
        if clip.image {
            args.push("-loop".into());
            args.push("1".into());
            args.push("-t".into());
            args.push(format!(
                "{:.3}",
                clip.source_in + clip.duration * clip.speed.max(0.05)
            ));
        }
        args.push("-i".into());
        args.push(clip.path.clone());
    }
    for clip in &request.audio_clips {
        args.push("-i".into());
        args.push(clip.path.clone());
    }

    let mut graph: Vec<String> = Vec::new();
    let mut overlays = String::new();
    let chain = format!(
        "color=c=black:s={}x{}:r={}:d={:.3},format=rgba[base]",
        request.width, request.height, request.fps, request.duration
    );

    for (index, clip) in request.video_clips.iter().enumerate() {
        let source_end = clip.source_in + clip.duration * clip.speed.max(0.05);
        let mut steps: Vec<String> = vec![
            format!("trim=start={:.3}:end={:.3}", clip.source_in, source_end),
            "setpts=(PTS-STARTPTS)".to_string(),
        ];
        if (clip.speed - 1.0).abs() > 0.001 {
            steps.push(format!("setpts=(PTS-STARTPTS)/{:.4}", clip.speed));
        }
        if has_keyframe(&clip.keyframes, "rotation") {
            let max_angle = max_keyframe_value(&clip.keyframes, "rotation", clip.rotation);
            let expr = keyframe_expr(&clip.keyframes, "rotation", clip.rotation, "t");
            steps.push(format!(
                "rotate=a='({})*PI/180':ow=rotw({:.4}*PI/180):oh=roth({:.4}*PI/180):c=black",
                expr, max_angle, max_angle
            ));
        } else if clip.rotation.abs() > 0.01 {
            let angle = format!("{:.4}*PI/180", clip.rotation);
            steps.push(format!(
                "rotate=a={}:ow=rotw({}):oh=roth({}):c=black",
                angle, angle, angle
            ));
        }
        if request.vertical {
            // 竖屏成片：放大到铺满画布后居中裁切，避免上下黑边
            steps.push(format!(
                "scale={}:{}:force_original_aspect_ratio=increase",
                request.width, request.height
            ));
            steps.push(format!(
                "crop={}:{}:(iw-{})/2:(ih-{})/2",
                request.width, request.height, request.width, request.height
            ));
        } else {
            steps.push(format!(
                "scale={}:{}:force_original_aspect_ratio=decrease",
                request.width, request.height
            ));
            steps.push(format!(
                "pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black",
                request.width, request.height
            ));
        }
        steps.push("setsar=1".to_string());
        let scale_keyed = has_keyframe(&clip.keyframes, "scale");
        let position_keyed = has_keyframe(&clip.keyframes, "positionX")
            || has_keyframe(&clip.keyframes, "positionY");
        if scale_keyed || position_keyed {
            // zoompan 会按输出帧率重排时间，先把输入统一到目标帧率，避免关键帧片段变短
            steps.push(format!("fps={}", request.fps));
            let scale_expr = keyframe_expr(&clip.keyframes, "scale", clip.scale, "time");
            let px_expr = keyframe_expr(&clip.keyframes, "positionX", clip.position_x, "time");
            let py_expr = keyframe_expr(&clip.keyframes, "positionY", clip.position_y, "time");
            steps.push(format!(
                "zoompan=z='max(1,{})':x='clip(iw/2-(iw/zoom/2)+({})*iw/100,0,iw-iw/zoom)':y='clip(ih/2-(ih/zoom/2)+({})*ih/100,0,ih-ih/zoom)':d=1:s={}x{}:fps={}",
                scale_expr, px_expr, py_expr, request.width, request.height, request.fps
            ));
        } else if clip.scale > 1.001 {
            let crop_w = (((request.width as f64) / clip.scale) as u32).max(2) & !1;
            let crop_h = (((request.height as f64) / clip.scale) as u32).max(2) & !1;
            steps.push(format!(
                "crop={}:{}:(iw-{})/2:(ih-{})/2",
                crop_w, crop_h, crop_w, crop_h
            ));
            steps.push(format!("scale={}:{}", request.width, request.height));
        } else if clip.scale < 0.999 && clip.scale > 0.01 {
            steps.push(format!("scale=iw*{:.4}:ih*{:.4}", clip.scale, clip.scale));
            steps.push(format!(
                "pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black",
                request.width, request.height
            ));
        }
        steps.push(format!("fps={}", request.fps));
        if !clip.filters.is_empty() {
            steps.push(clip.filters.clone());
        }
        if clip.fade_in > 0.01 {
            steps.push(format!(
                "fade=t=in:st=0:d={:.3}:color={}",
                clip.fade_in,
                fade_color(&clip.fade_in_color)
            ));
        }
        if clip.fade_out > 0.01 {
            steps.push(format!(
                "fade=t=out:st={:.3}:d={:.3}:color={}",
                (clip.duration - clip.fade_out).max(0.0),
                clip.fade_out,
                fade_color(&clip.fade_out_color)
            ));
        }
        let opacity_keyed = has_keyframe(&clip.keyframes, "opacity");
        if opacity_keyed || clip.mask.is_some() {
            let opacity_expr = if opacity_keyed {
                keyframe_expr(&clip.keyframes, "opacity", clip.opacity, "T")
            } else {
                format!("{:.4}", clip.opacity.clamp(0.0, 1.0))
            };
            let mask_value = clip
                .mask
                .as_ref()
                .map(|mask| mask_expr(mask, request.width, request.height))
                .unwrap_or_else(|| "1".to_string());
            steps.push("format=rgba".to_string());
            steps.push(format!(
                "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*clip({},0,1)*({})'",
                opacity_expr, mask_value
            ));
        } else if clip.opacity < 0.999 {
            steps.push("format=rgba".to_string());
            steps.push(format!("colorchannelmixer=aa={:.3}", clip.opacity));
        }
        steps.push(format!("setpts=PTS+{:.3}/TB", clip.start));
        let blend_mode = clip.blend_mode.to_ascii_lowercase();
        let blending = blend_mode != "normal" && !blend_mode.is_empty();
        if blending {
            // blend 在 YUV 下会逐平面相乘导致偏色，强制转到 RGB 平面再混合
            steps.push("format=gbrp".to_string());
        }
        graph.push(format!("[{index}:v]{}[v{index}]", steps.join(",")));
        let input = if index == 0 {
            "base".to_string()
        } else {
            format!("o{}", index - 1)
        };
        let overlay_x = if scale_keyed || position_keyed {
            "0".to_string()
        } else if clip.position_x.abs() > 0.001 {
            format!("{:.4}*W/100", clip.position_x)
        } else {
            "0".to_string()
        };
        let overlay_y = if scale_keyed || position_keyed {
            "0".to_string()
        } else if clip.position_y.abs() > 0.001 {
            format!("{:.4}*H/100", clip.position_y)
        } else {
            "0".to_string()
        };
        if blending {
            let opacity_option = if !opacity_keyed && clip.mask.is_none() && clip.opacity < 0.999 {
                format!(":all_opacity={:.3}", clip.opacity.clamp(0.0, 1.0))
            } else {
                String::new()
            };
            overlays.push_str(&format!(
                "[{}]format=gbrp[gb{}];[v{}]format=gbrp[gv{}];[gb{}][gv{}]blend=all_mode={}{}:enable='between(t,{:.3},{:.3})'[o{}];",
                input,
                index,
                index,
                index,
                index,
                index,
                blend_filter_name(&blend_mode),
                opacity_option,
                clip.start,
                clip.start + clip.duration,
                index
            ));
        } else {
            overlays.push_str(&format!(
                "[{}][v{}]overlay=x='{}':y='{}':eof_action=pass:format=auto[o{}];",
                input, index, overlay_x, overlay_y, index
            ));
        }
    }

    let mut current = if request.video_clips.is_empty() {
        "base".to_string()
    } else {
        format!("o{}", request.video_clips.len() - 1)
    };

    for (index, clip) in request.text_clips.iter().enumerate() {
        let text_path = work_dir.join(format!("text-{index}.txt"));
        // 按画面宽度预换行，复现预览的 82% 最大宽度，避免长文本被裁切
        let wrapped = wrap_text_for_drawtext(
            &clip.text,
            request.width as f64 * 0.82,
            clip.font_size as f64,
        );
        std::fs::write(&text_path, wrapped).map_err(|error| error.to_string())?;
        let font = pick_font_weight(&clip.text, clip.bold);
        let font_option = if font.is_empty() {
            String::new()
        } else {
            format!("fontfile={}:", escape_path(font))
        };
        let top_margin = (request.height as f64 * 0.08) as u32;
        let bottom_margin = (request.height as f64 * 0.12) as u32;
        let mut y = match clip.position.to_ascii_lowercase().as_str() {
            "top" => format!("{top_margin}"),
            "center" => "(h-text_h)/2".to_string(),
            _ => format!("h-text_h-{bottom_margin}"),
        };
        let animation = clip.animation.to_ascii_lowercase();
        if animation == "slide" {
            y = format!(
                "{}+(1-min((t-{:.3})/0.35,1))*{}",
                y,
                clip.start,
                (request.height as f64 * 0.05) as u32
            );
        }
        let alpha_option = if animation == "fade" || animation == "slide" {
            format!(
                ":alpha='min(1,max(0,(t-{:.3})/0.35))*min(1,max(0,({:.3}-t)/0.35))'",
                clip.start,
                clip.start + clip.duration
            )
        } else {
            String::new()
        };
        let side_margin = (request.width as f64 * 0.06) as u32;
        let x = match clip.align.to_ascii_lowercase().as_str() {
            "left" => format!("{side_margin}"),
            "right" => format!("w-text_w-{side_margin}"),
            _ => "(w-text_w)/2".to_string(),
        };
        let mut style = String::new();
        if clip.stroke > 0 {
            style.push_str(&format!(
                ":borderw={}:bordercolor={}@0.95",
                clip.stroke.min(10),
                text_color(&clip.stroke_color)
            ));
        }
        if clip.background {
            let padding = ((clip.font_size as f64) * 0.3).max(6.0) as u32;
            style.push_str(&format!(
                ":box=1:boxcolor={}@0.72:boxborderw={}",
                text_color(&clip.background_color),
                padding
            ));
        }
        graph.push(format!(
            "[{}]drawtext={}textfile={}:fontcolor={}:fontsize={}:line_spacing={}{}{}:x={}:y='{}':enable='between(t,{:.3},{:.3})'[t{}]",
            current,
            font_option,
            escape_path(&text_path.to_string_lossy()),
            text_color(&clip.color),
            clip.font_size,
            (clip.font_size as f64 * 0.25) as u32,
            style,
            alpha_option,
            x,
            y,
            clip.start,
            clip.start + clip.duration,
            index
        ));
        current = format!("t{index}");
    }

    graph.push(chain);
    if !overlays.is_empty() {
        graph.push(overlays.trim_end_matches(';').to_string());
    }
    if current != "base" {
        let label = if request.text_clips.is_empty() && !request.video_clips.is_empty() {
            format!("o{}", request.video_clips.len() - 1)
        } else {
            current
        };
        graph.push(format!("[{}]null[vout]", label));
    } else {
        graph.push("[base]null[vout]".to_string());
    }

    let mut audio_inputs = 0usize;
    let mut audio_labels: Vec<String> = Vec::new();
    for (index, clip) in request.video_clips.iter().enumerate() {
        if clip.muted || !has_audio(&clip.path) {
            continue;
        }
        let mut steps = vec![
            format!(
                "atrim=start={:.3}:end={:.3}",
                clip.source_in,
                clip.source_in + clip.duration * clip.speed.max(0.05)
            ),
            "asetpts=PTS-STARTPTS".to_string(),
        ];
        steps.extend(atempo_steps(clip.speed));
        steps.push(format!("volume={:.3}", db_to_gain(clip.volume_db)));
        if clip.denoise {
            steps.push("afftdn=nf=-25".to_string());
        }
        if clip.normalized {
            steps.push("loudnorm=I=-16:TP=-1.5:LRA=11".to_string());
        }
        if clip.fade_in > 0.01 {
            steps.push(format!("afade=t=in:st=0:d={:.3}", clip.fade_in));
        }
        if clip.fade_out > 0.01 {
            steps.push(format!(
                "afade=t=out:st={:.3}:d={:.3}",
                (clip.duration - clip.fade_out).max(0.0),
                clip.fade_out
            ));
        }
        steps.push(format!(
            "adelay={}|{}",
            (clip.start * 1000.0) as i64,
            (clip.start * 1000.0) as i64
        ));
        steps.push("aresample=48000".to_string());
        graph.push(format!("[{index}:a]{}[a{}]", steps.join(","), audio_inputs));
        audio_labels.push(format!("[a{}]", audio_inputs));
        audio_inputs += 1;
    }

    let base_index = request.video_clips.len();
    for (offset, clip) in request.audio_clips.iter().enumerate() {
        let mut steps = vec![
            format!(
                "atrim=start={:.3}:end={:.3}",
                clip.source_in,
                clip.source_in + clip.duration * clip.speed.max(0.05)
            ),
            "asetpts=PTS-STARTPTS".to_string(),
        ];
        steps.extend(atempo_steps(clip.speed));
        steps.push(format!("volume={:.3}", db_to_gain(clip.volume_db)));
        if clip.denoise {
            steps.push("afftdn=nf=-25".to_string());
        }
        if clip.normalized {
            steps.push("loudnorm=I=-16:TP=-1.5:LRA=11".to_string());
        }
        if clip.fade_in > 0.01 {
            steps.push(format!("afade=t=in:st=0:d={:.3}", clip.fade_in));
        }
        if clip.fade_out > 0.01 {
            steps.push(format!(
                "afade=t=out:st={:.3}:d={:.3}",
                (clip.duration - clip.fade_out).max(0.0),
                clip.fade_out
            ));
        }
        steps.push(format!(
            "adelay={}|{}",
            (clip.start * 1000.0) as i64,
            (clip.start * 1000.0) as i64
        ));
        if clip.ducking {
            let windows: Vec<(f64, f64)> = request
                .video_clips
                .iter()
                .filter(|video| !video.muted && has_audio(&video.path))
                .filter_map(|video| {
                    let start = video.start.max(clip.start);
                    let end = (video.start + video.duration).min(clip.start + clip.duration);
                    if end - start > 0.05 {
                        Some((start - clip.start, end - clip.start))
                    } else {
                        None
                    }
                })
                .collect();
            if !windows.is_empty() {
                let expression = windows
                    .iter()
                    .map(|(start, end)| format!("between(t,{start:.3},{end:.3})"))
                    .collect::<Vec<_>>()
                    .join("+");
                steps.push(format!("volume=0.35:enable='{expression}'"));
            }
        }
        steps.push("aresample=48000".to_string());
        let index = base_index + offset;
        graph.push(format!("[{index}:a]{}[a{}]", steps.join(","), audio_inputs));
        audio_labels.push(format!("[a{}]", audio_inputs));
        audio_inputs += 1;
    }

    let mut has_audio_output = false;
    if audio_inputs > 0 {
        graph.push(format!(
            "{}amix=inputs={}:duration=longest:normalize=0[aout]",
            audio_labels.join(""),
            audio_inputs
        ));
        has_audio_output = true;
    }

    let script_path = work_dir.join("filters.txt");
    std::fs::write(&script_path, graph.join(";\n")).map_err(|error| error.to_string())?;

    args.push("-filter_complex_script".into());
    args.push(script_path.to_string_lossy().to_string());
    args.push("-map".into());
    args.push("[vout]".into());
    if has_audio_output {
        args.push("-map".into());
        args.push("[aout]".into());
    } else {
        args.push("-an".into());
    }
    args.push("-t".into());
    args.push(format!("{:.3}", request.duration));
    args.push("-r".into());
    args.push(request.fps.to_string());

    if request.format.eq_ignore_ascii_case("webm") {
        args.extend([
            "-c:v".into(),
            "libvpx-vp9".into(),
            "-b:v".into(),
            normalize_bitrate(&request.bitrate),
            "-pix_fmt".into(),
            "yuv420p".into(),
            "-c:a".into(),
            "libopus".into(),
        ]);
    } else {
        args.extend([
            "-c:v".into(),
            "libx264".into(),
            "-preset".into(),
            "medium".into(),
            "-b:v".into(),
            normalize_bitrate(&request.bitrate),
            "-pix_fmt".into(),
            "yuv420p".into(),
            "-c:a".into(),
            "aac".into(),
            "-b:a".into(),
            "192k".into(),
            "-movflags".into(),
            "+faststart".into(),
        ]);
    }
    args.push(output.clone());

    let result = run_command(&ffmpeg, &args);
    let _ = std::fs::remove_dir_all(&work_dir);
    result.map_err(|error| {
        if error.contains("program not found") || error.contains("os error 2") {
            "未找到 FFmpeg：请先安装 FFmpeg 并加入系统 PATH，或设置 XIMOCUT_FFMPEG 环境变量。".to_string()
        } else {
            error
        }
    })?;

    Ok(format!("已导出 {}", output))
}

/// 依据字号估算字符宽度并插入换行，供 drawtext 多行渲染。
fn wrap_text_for_drawtext(text: &str, max_width: f64, font_size: f64) -> String {
    if max_width <= 0.0 || font_size <= 0.0 {
        return text.to_string();
    }
    let mut lines: Vec<String> = Vec::new();
    for paragraph in text.split('\n') {
        let mut line = String::new();
        let mut width = 0.0;
        for character in paragraph.chars() {
            let character_width = if character.is_ascii() {
                if character == ' ' {
                    font_size * 0.32
                } else {
                    font_size * 0.58
                }
            } else {
                font_size
            };
            if width + character_width > max_width && !line.is_empty() {
                lines.push(line);
                line = String::new();
                width = 0.0;
            }
            line.push(character);
            width += character_width;
        }
        lines.push(line);
    }
    lines.join("\n")
}

fn atempo_steps(speed: f64) -> Vec<String> {
    let mut steps = Vec::new();
    let mut remaining = speed.clamp(0.05, 100.0);
    while remaining > 2.0 {
        steps.push("atempo=2.0".to_string());
        remaining /= 2.0;
    }
    while remaining < 0.5 {
        steps.push("atempo=0.5".to_string());
        remaining /= 0.5;
    }
    if (remaining - 1.0).abs() > 0.001 {
        steps.push(format!("atempo={:.4}", remaining));
    }
    steps
}

fn db_to_gain(db: f64) -> f64 {
    10f64.powf(db / 20.0)
}

fn normalize_bitrate(bitrate: &str) -> String {
    let value: String = bitrate
        .chars()
        .take_while(|character| character.is_ascii_digit() || *character == '.')
        .collect();
    if value.is_empty() {
        "12M".to_string()
    } else {
        format!("{}M", value)
    }
}

fn escape_path(path: &str) -> String {
    path.replace('\\', "/")
        .replace(':', "\\\\:")
        .replace('\'', "\\'")
}

fn pick_font(text: &str) -> &'static str {
    let exists = |path: &str| Path::new(path).exists();
    let has_cjk = text.chars().any(|character| {
        let code = character as u32;
        (0x3000..=0x9FFF).contains(&code) || (0xFF00..=0xFFEF).contains(&code)
    });
    let has_emoji = text.chars().any(|character| (character as u32) >= 0x1F000);
    let has_symbol = text
        .chars()
        .any(|character| (0x2190..=0x2BFF).contains(&(character as u32)));
    if !has_cjk && has_emoji && exists("C:/Windows/Fonts/seguiemj.ttf") {
        return "C:/Windows/Fonts/seguiemj.ttf";
    }
    if !has_cjk && has_symbol && exists("C:/Windows/Fonts/seguisym.ttf") {
        return "C:/Windows/Fonts/seguisym.ttf";
    }
    if exists("C:/Windows/Fonts/msyh.ttc") {
        return "C:/Windows/Fonts/msyh.ttc";
    }
    if exists("C:/Windows/Fonts/arial.ttf") {
        return "C:/Windows/Fonts/arial.ttf";
    }
    ""
}

fn pick_font_weight(text: &str, bold: bool) -> &'static str {
    let font = pick_font(text);
    if bold
        && font == "C:/Windows/Fonts/msyh.ttc"
        && Path::new("C:/Windows/Fonts/msyhbd.ttc").exists()
    {
        return "C:/Windows/Fonts/msyhbd.ttc";
    }
    font
}

fn ffprobe_for(ffmpeg: &str) -> String {
    if ffmpeg == "ffmpeg" {
        return "ffprobe".to_string();
    }
    let path = PathBuf::from(ffmpeg);
    path.parent()
        .map(|parent| parent.join("ffprobe.exe").to_string_lossy().to_string())
        .unwrap_or_else(|| "ffprobe".to_string())
}

fn probe_has_audio(ffprobe: &str, path: &str) -> Option<bool> {
    let output = run_command(
        ffprobe,
        &[
            "-v".into(),
            "error".into(),
            "-select_streams".into(),
            "a".into(),
            "-show_entries".into(),
            "stream=index".into(),
            "-of".into(),
            "csv=p=0".into(),
            path.to_string(),
        ],
    )
    .ok()?;
    Some(!output.trim().is_empty())
}

fn run_command(program: &str, args: &[String]) -> Result<String, String> {
    let mut command = Command::new(program);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command.output().map_err(|error| {
        format!("{}: {}", error, program)
    })?;
    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Err(if stderr.trim().is_empty() {
        format!("{} 执行失败（退出码 {:?}）", program, output.status.code())
    } else {
        stderr
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    migrate_legacy_identity();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .on_permission_request(|_webview, kind| match kind {
            tauri::webview::PermissionKind::Microphone => tauri::webview::PermissionResponse::Allow,
            _ => tauri::webview::PermissionResponse::Default,
        })
        .setup(|app| {
            use tauri::{LogicalSize, Manager};
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale = monitor.scale_factor();
                    let area = monitor.work_area();
                    let available_width = area.size.width as f64 / scale - 24.0;
                    let available_height = area.size.height as f64 / scale - 24.0;
                    let width = 1280.0_f64.min(available_width).max(1024.0);
                    let height = 800.0_f64.min(available_height).max(640.0);
                    let _ = window.set_size(LogicalSize::new(width, height));
                    let _ = window.center();
                }
                let _ = window.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            file_info,
            read_text_file,
            write_text_file,
            drafts_directory,
            list_draft_files,
            delete_draft_file,
            scripts_directory,
            list_script_files,
            delete_script_file,
            extract_reference_frames,
            generate_thumbnail,
            extract_audio,
            save_audio_bytes,
            asr_status,
            transcribe_audio,
            transcribe_segments,
            music_library,
            sfx_library,
            synthesize_speech,
            analyze_material,
            review_video,
            preview_output_path,
            render_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running ximo-Cut");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_whisper_transcript() {
        let raw = r#"{
            "transcription": [
                {"offsets": {"from": 0, "to": 1800}, "text": " 大家好 "},
                {"offsets": {"from": 1800, "to": 3500}, "text": "今天讲讲剪辑"}
            ]
        }"#;
        let result = parse_whisper_json(raw).expect("should parse");
        assert_eq!(result.segments.len(), 2);
        assert_eq!(result.segments[0].text, "大家好");
        assert_eq!(result.segments[1].start, 1.8);
        assert_eq!(result.duration, 3.5);
    }

    #[test]
    fn rejects_invalid_whisper_transcript() {
        assert!(parse_whisper_json("{}").is_err());
        assert!(parse_whisper_json("not json").is_err());
    }

    #[test]
    fn parses_scene_change_times() {
        let log = "[Parsed_showinfo_2 @ 000001] n:  24 pts: 800000 pts_time:0.800000 duration:1\n\
[Parsed_showinfo_2 @ 000001] n:  75 pts:2500000 pts_time:2.500000 duration:1\n\
[Parsed_showinfo_2 @ 000001] n:  76 pts:2533333 pts_time:2.533333 duration:1\n\
[Parsed_showinfo_2 @ 000001] n:   1 pts:  33333 pts_time:0.033333 duration:1";
        let times = parse_scene_times(log);
        assert_eq!(times, vec![0.8, 2.5]);
    }

    #[test]
    fn parses_silence_spans() {
        let log = "[silencedetect @ 0x1] silence_start: 0.512\n\
[silencedetect @ 0x1] silence_end: 1.824 | silence_duration: 1.312\n\
[silencedetect @ 0x1] silence_start: 4.25";
        let spans = parse_silences(log, 6.0);
        assert_eq!(spans.len(), 2);
        assert!((spans[0].start - 0.512).abs() < 0.001);
        assert!((spans[0].end - 1.824).abs() < 0.001);
        assert!((spans[1].end - 6.0).abs() < 0.001);
        assert!(parse_silences("", 10.0).is_empty());
    }

    #[test]
    fn parses_frame_quality_metrics() {
        let log = "frame:0    pts:0       pts_time:0\n\
lavfi.blur=5.567766\n\
lavfi.signalstats.YAVG=125.48\n\
frame:1    pts:512     pts_time:0.0333333\n\
lavfi.blur=2.100000\n\
lavfi.signalstats.YAVG=40.0";
        let metrics = parse_frame_metrics(log);
        assert_eq!(metrics.len(), 2);
        assert!((metrics[0].blur - 5.5678).abs() < 0.001);
        assert!((metrics[1].brightness - 40.0).abs() < 0.001);
    }

    #[test]
    fn builds_shot_scores() {
        let metrics = vec![
            FrameMetric {
                time: 0.1,
                blur: 6.0,
                brightness: 118.0,
            },
            FrameMetric {
                time: 2.5,
                blur: 1.0,
                brightness: 20.0,
            },
        ];
        let shots = build_shots(&[2.0], 3.0, &metrics);
        assert_eq!(shots.len(), 2);
        assert!(shots[0].score > shots[1].score);
        assert!((shots[0].start - 0.0).abs() < 0.001);
        assert!((shots[1].end - 3.0).abs() < 0.001);
    }

    #[test]
    fn parses_review_issues() {
        let log = "[blackdetect @ 0x1] black_start:1.0 black_end:2.5 black_duration:1.5\n\
[freezedetect @ 0x1] freeze_start: 3.0\n\
[freezedetect @ 0x1] freeze_end: 4.2";
        let black = parse_ranges(log, "black_start:", "black_end:", 10.0);
        let freeze = parse_ranges(log, "freeze_start:", "freeze_end:", 10.0);
        assert_eq!(black, vec![(1.0, 2.5)]);
        assert_eq!(freeze, vec![(3.0, 4.2)]);
    }

    #[test]
    fn parses_ebur128_summary() {
        let log = "  Integrated loudness:\n    I:         -16.3 LUFS\n  True peak:\n    Peak:       -1.2 dBFS";
        let (loudness, peak) = parse_ebur128(log);
        assert!((loudness.unwrap() + 16.3).abs() < 0.001);
        assert!((peak.unwrap() + 1.2).abs() < 0.001);
    }

    #[test]
    fn compiles_keyframe_expressions() {
        let frames = vec![
            RenderKeyframe {
                property: "scale".into(),
                time: 0.0,
                value: 1.0,
                easing: "linear".into(),
            },
            RenderKeyframe {
                property: "scale".into(),
                time: 2.0,
                value: 1.5,
                easing: "linear".into(),
            },
        ];
        let expr = keyframe_expr(&frames, "scale", 1.0, "time");
        assert!(expr.contains("if(lt(time,2.0000)"));
        assert!(expr.contains("1.0000+(1.5000-1.0000)"));
        assert_eq!(keyframe_expr(&[], "scale", 1.2, "time"), "1.2000");
        assert!(has_keyframe(&frames, "scale"));
        assert!(!has_keyframe(&frames, "opacity"));
    }

    #[test]
    fn compiles_mask_expressions() {
        let mask = RenderMask {
            shape: "rect".into(),
            x: 0.5,
            y: 0.5,
            width: 0.5,
            height: 0.5,
            feather: 0.05,
            invert: false,
        };
        let expr = mask_expr(&mask, 640, 360);
        assert!(expr.contains("clip((X-"));
        assert!(!expr.starts_with("(1-"));
        let inverted = mask_expr(
            &RenderMask {
                invert: true,
                ..mask.clone()
            },
            640,
            360,
        );
        assert!(inverted.starts_with("(1-"));
        let ellipse = mask_expr(
            &RenderMask {
                shape: "ellipse".into(),
                ..mask
            },
            640,
            360,
        );
        assert!(ellipse.contains("pow("));
    }

    #[test]
    fn finds_font_for_text_content() {
        assert_eq!(pick_font("ximo-Cut 测试字幕"), "C:/Windows/Fonts/msyh.ttc");
        assert_eq!(pick_font("🌊"), "C:/Windows/Fonts/seguiemj.ttf");
        assert_eq!(pick_font("✦"), "C:/Windows/Fonts/seguisym.ttf");
    }

    #[test]
    fn decodes_base64_payloads() {
        assert_eq!(decode_base64("eGltby1DdXQ=").unwrap(), b"ximo-Cut".to_vec());
        assert!(decode_base64("").unwrap().is_empty());
        assert!(decode_base64("!!!!").is_err());
    }

    #[test]
    fn parses_reference_video_duration() {
        let stderr = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'demo.mp4':\n  Duration: 00:01:23.50, start: 0.000000, bitrate: 900 kb/s\n";
        assert!((parse_ffmpeg_duration(stderr).unwrap() - 83.5).abs() < 0.001);
        assert!(parse_ffmpeg_duration("no duration here").is_err());
        assert!(parse_ffmpeg_duration("  Duration: 00:00:00.00, start: 0").is_err());
    }

    #[test]
    #[ignore]
    fn render_pipeline_produces_mp4() {
        let dir = std::env::temp_dir().join("ximo-cut-render-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let clip1 = dir.join("clip1.mp4").to_string_lossy().to_string();
        let clip2 = dir.join("clip2.mp4").to_string_lossy().to_string();
        let music = dir.join("music.m4a").to_string_lossy().to_string();
        let output = dir.join("out.mp4").to_string_lossy().to_string();

        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "testsrc=size=640x360:rate=30:duration=2".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "sine=frequency=440:duration=2".into(),
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-c:a".into(),
                "aac".into(),
                "-shortest".into(),
                clip1.clone(),
            ],
        )
        .unwrap();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "color=c=blue:size=320x240:rate=30:duration=2".into(),
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                clip2.clone(),
            ],
        )
        .unwrap();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "sine=frequency=220:duration=4".into(),
                "-c:a".into(),
                "aac".into(),
                music.clone(),
            ],
        )
        .unwrap();

        let request = RenderRequest {
            width: 640,
            height: 360,
            fps: 30,
            bitrate: "2 Mbps".into(),
            format: "mp4".into(),
            duration: 4.0,
            vertical: false,
            video_clips: vec![
                RenderVideoClip {
                    path: clip1,
                    start: 0.0,
                    duration: 2.0,
                    source_in: 0.0,
                    speed: 1.0,
                    muted: false,
                    volume_db: -6.0,
                    fade_in: 0.3,
                    fade_out: 0.0,
                    fade_in_color: "black".into(),
                    fade_out_color: "black".into(),
                    opacity: 0.9,
                    scale: 1.1,
                    rotation: 5.0,
                    position_x: 0.0,
                    position_y: 0.0,
                    keyframes: Vec::new(),
                    mask: None,
                    blend_mode: "normal".into(),
                    denoise: true,
                    normalized: true,
                    image: false,
                    filters: "eq=brightness=0.050".into(),
                },
                RenderVideoClip {
                    path: clip2,
                    start: 2.0,
                    duration: 2.0,
                    source_in: 0.0,
                    speed: 1.0,
                    muted: false,
                    volume_db: 0.0,
                    fade_in: 0.0,
                    fade_out: 0.3,
                    fade_in_color: "black".into(),
                    fade_out_color: "black".into(),
                    opacity: 1.0,
                    scale: 1.0,
                    rotation: 0.0,
                    position_x: 0.0,
                    position_y: 0.0,
                    keyframes: Vec::new(),
                    mask: None,
                    blend_mode: "normal".into(),
                    denoise: false,
                    normalized: false,
                    image: false,
                    filters: String::new(),
                },
            ],
            audio_clips: vec![RenderAudioClip {
                path: music,
                start: 0.5,
                duration: 3.0,
                source_in: 0.0,
                speed: 1.0,
                volume_db: -3.0,
                fade_in: 0.2,
                fade_out: 0.2,
                denoise: true,
                normalized: true,
                ducking: true,
            }],
            text_clips: vec![RenderTextClip {
                text: "ximo-Cut 测试字幕".into(),
                start: 0.5,
                duration: 1.5,
                font_size: 32,
                color: "yellow".into(),
                position: "center".into(),
                bold: true,
                stroke: 2,
                stroke_color: "black".into(),
                background: false,
                background_color: "black".into(),
                align: "center".into(),
                animation: "none".into(),
            }],
        };

        let message = render_blocking(request, output.clone()).unwrap();
        println!("{message}");
        assert!(Path::new(&output).exists());
        assert!(std::fs::metadata(&output).unwrap().len() > 1000);
    }

    #[test]
    #[ignore]
    fn render_zoom_changes_picture() {
        let dir = std::env::temp_dir().join("ximo-cut-zoom-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let input = dir.join("src.mp4").to_string_lossy().to_string();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "testsrc2=size=640x360:rate=30:duration=1".into(),
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                input.clone(),
            ],
        )
        .unwrap();

        let render = |scale: f64, name: &str| -> Vec<u8> {
            let output = dir.join(name).to_string_lossy().to_string();
            let request = RenderRequest {
                width: 320,
                height: 240,
                fps: 30,
                bitrate: "1 Mbps".into(),
                format: "mp4".into(),
                duration: 1.0,
                vertical: false,
                video_clips: vec![RenderVideoClip {
                    path: input.clone(),
                    start: 0.0,
                    duration: 1.0,
                    source_in: 0.0,
                    speed: 1.0,
                    muted: true,
                    volume_db: 0.0,
                    fade_in: 0.0,
                    fade_out: 0.0,
                    fade_in_color: "black".into(),
                    fade_out_color: "black".into(),
                    opacity: 1.0,
                    scale,
                    rotation: 0.0,
                    position_x: 0.0,
                    position_y: 0.0,
                    keyframes: Vec::new(),
                    mask: None,
                    blend_mode: "normal".into(),
                    denoise: false,
                    normalized: false,
                    image: false,
                    filters: String::new(),
                }],
                audio_clips: vec![],
                text_clips: vec![],
            };
            render_blocking(request, output.clone()).unwrap();
            let sample = dir.join(format!("{name}.rgb")).to_string_lossy().to_string();
            run_command(
                "ffmpeg",
                &[
                    "-hide_banner".into(),
                    "-loglevel".into(),
                    "error".into(),
                    "-y".into(),
                    "-ss".into(),
                    "0.5".into(),
                    "-i".into(),
                    output,
                    "-frames:v".into(),
                    "1".into(),
                    "-vf".into(),
                    "scale=16:16".into(),
                    "-f".into(),
                    "rawvideo".into(),
                    "-pix_fmt".into(),
                    "rgb24".into(),
                    sample.clone(),
                ],
            )
            .unwrap();
            std::fs::read(sample).unwrap()
        };

        let base = render(1.0, "base.mp4");
        let zoomed = render(1.8, "zoomed.mp4");
        assert_eq!(base.len(), 16 * 16 * 3);
        assert_eq!(zoomed.len(), 16 * 16 * 3);
        let diff: i32 = base
            .iter()
            .zip(zoomed.iter())
            .map(|(a, b)| (*a as i32 - *b as i32).abs())
            .sum();
        assert!(diff > 1000, "缩放后画面应有明显变化，实际差值 {diff}");
    }

    fn mean_volume(path: &str, start: f64, duration: f64) -> f64 {
        let output = std::process::Command::new("ffmpeg")
            .args([
                "-hide_banner",
                "-nostdin",
                "-ss",
                &format!("{start:.3}"),
                "-t",
                &format!("{duration:.3}"),
                "-i",
                path,
                "-vn",
                "-af",
                "volumedetect",
                "-f",
                "null",
                "-",
            ])
            .output()
            .unwrap();
        let log = String::from_utf8_lossy(&output.stderr).to_string();
        log.lines()
            .find_map(|line| line.split("mean_volume:").nth(1))
            .and_then(|value| value.trim().split_whitespace().next())
            .and_then(|value| value.parse::<f64>().ok())
            .unwrap_or(-100.0)
    }

    #[test]
    #[ignore]
    fn renders_image_and_audio_ducking() {
        let dir = std::env::temp_dir().join("ximo-cut-image-duck-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let image = dir.join("still.png").to_string_lossy().to_string();
        let voice = dir.join("voice.mp4").to_string_lossy().to_string();
        let music = dir.join("music.m4a").to_string_lossy().to_string();

        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "color=c=red:size=640x360:rate=30:duration=1".into(),
                "-frames:v".into(),
                "1".into(),
                image.clone(),
            ],
        )
        .unwrap();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "testsrc2=size=640x360:rate=30:duration=2".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "sine=frequency=440:duration=2".into(),
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-c:a".into(),
                "aac".into(),
                "-shortest".into(),
                voice.clone(),
            ],
        )
        .unwrap();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-f".into(),
                "lavfi".into(),
                "-i".into(),
                "sine=frequency=220:duration=4".into(),
                "-c:a".into(),
                "aac".into(),
                music.clone(),
            ],
        )
        .unwrap();

        let build = |ducking: bool| RenderRequest {
            width: 320,
            height: 240,
            fps: 30,
            bitrate: "1 Mbps".into(),
            format: "mp4".into(),
            duration: 4.0,
            vertical: false,
            video_clips: vec![
                RenderVideoClip {
                    path: image.clone(),
                    start: 0.0,
                    duration: 2.0,
                    source_in: 0.0,
                    speed: 1.0,
                    muted: true,
                    volume_db: 0.0,
                    fade_in: 0.0,
                    fade_out: 0.0,
                    fade_in_color: "black".into(),
                    fade_out_color: "black".into(),
                    opacity: 1.0,
                    scale: 1.0,
                    rotation: 0.0,
                    position_x: 0.0,
                    position_y: 0.0,
                    keyframes: Vec::new(),
                    mask: None,
                    blend_mode: "normal".into(),
                    denoise: false,
                    normalized: false,
                    image: true,
                    filters: String::new(),
                },
                RenderVideoClip {
                    path: voice.clone(),
                    start: 2.0,
                    duration: 2.0,
                    source_in: 0.0,
                    speed: 1.0,
                    muted: false,
                    volume_db: 0.0,
                    fade_in: 0.0,
                    fade_out: 0.0,
                    fade_in_color: "black".into(),
                    fade_out_color: "black".into(),
                    opacity: 1.0,
                    scale: 1.0,
                    rotation: 0.0,
                    position_x: 0.0,
                    position_y: 0.0,
                    keyframes: Vec::new(),
                    mask: None,
                    blend_mode: "normal".into(),
                    denoise: false,
                    normalized: false,
                    image: false,
                    filters: String::new(),
                },
            ],
            audio_clips: vec![RenderAudioClip {
                path: music.clone(),
                start: 0.0,
                duration: 4.0,
                source_in: 0.0,
                speed: 1.0,
                volume_db: 0.0,
                fade_in: 0.0,
                fade_out: 0.0,
                denoise: false,
                normalized: false,
                ducking,
            }],
            text_clips: vec![],
        };

        let ducked_output = dir.join("ducked.mp4").to_string_lossy().to_string();
        let plain_output = dir.join("plain.mp4").to_string_lossy().to_string();
        render_blocking(build(true), ducked_output.clone()).unwrap();
        render_blocking(build(false), plain_output.clone()).unwrap();

        assert!(Path::new(&ducked_output).exists());
        let ducked_level = mean_volume(&ducked_output, 2.4, 1.2);
        let plain_level = mean_volume(&plain_output, 2.4, 1.2);
        println!("ducked={ducked_level}dB plain={plain_level}dB");
        assert!(
            ducked_level + 0.8 < plain_level,
            "闪避应压低配乐，实际 ducked={ducked_level}dB plain={plain_level}dB"
        );
        // 图片片段应出现在 0-2 秒，取中间帧应为红色
        let frame = dir.join("frame.rgb").to_string_lossy().to_string();
        run_command(
            "ffmpeg",
            &[
                "-hide_banner".into(),
                "-loglevel".into(),
                "error".into(),
                "-y".into(),
                "-ss".into(),
                "1.0".into(),
                "-i".into(),
                ducked_output,
                "-frames:v".into(),
                "1".into(),
                "-vf".into(),
                "scale=1:1".into(),
                "-f".into(),
                "rawvideo".into(),
                "-pix_fmt".into(),
                "rgb24".into(),
                frame.clone(),
            ],
        )
        .unwrap();
        let pixel = std::fs::read(frame).unwrap();
        assert_eq!(pixel.len(), 3);
        assert!(
            pixel[0] > 150 && pixel[1] < 90 && pixel[2] < 90,
            "图片片段应为红色，实际像素 {pixel:?}"
        );
    }
}
