# 本地纪录片文案编辑器 MVP

这是一个本地优先的 MVP，用来验证“视频转文字 + 字幕联动 + 文字跳视频 + 纸编辑 + 故事版 + 剪辑软件导出”的核心手感。

## 运行

```bash
pnpm install
pnpm dev
```

打开：

```text
http://127.0.0.1:5174/
```

## 让别人使用

有三种方式：

1. 同一 Wi-Fi 临时试看：

```bash
pnpm dev:lan
```

然后让对方打开 `http://你的局域网IP:5174/`。

2. 部署公开静态网站：

```bash
pnpm build
```

把 `dist/` 目录部署到 Vercel、Netlify、Cloudflare Pages、GitHub Pages 或自己的服务器。别人可以直接打开网页使用导入、逐字稿编辑、故事版和导出功能。

如果部署到 GitHub Pages，使用：

```bash
pnpm build:pages
```

公开地址会是：

```text
https://lijiaxinhhh.github.io/documentary-script-editor/
```

3. 需要视频转文字时：

每个用户都应在自己的电脑上运行本机转写桥接服务：

```bash
pnpm bridge:transcription
```

网页里的“视频转文字 / Key”面板可以配置本机执行层地址，默认是 `http://127.0.0.1:8787`。

更多说明见 [`docs/share-and-deploy.md`](docs/share-and-deploy.md)。

## 使用

1. 点击“导入视频”选择一个本地视频文件；页面会自动打开“视频转文字与 Key 设置”。
2. 选择本地 Whisper / FunASR，或选择 OpenAI / 通义 / Deepgram 并输入自己的 Key。
3. 启动本机桥接服务后点击“创建转写任务”，转写结果会写回逐字稿。
4. 也可以点击“样例”载入内置模拟转写，或点击“导入 JSON”选择 `samples/demo-transcript.json`。
5. 点击逐字稿段落，视频会跳到对应时间；视频画面也会显示当前字幕。
6. 搜索关键词，可以从左侧命中结果跳转。
7. 在故事版画布顶部选择模板：宣传片、人物纪录片、纪录短片或纪录长片。
8. 点击“高亮”或“入稿”，把段落加入底部故事版画布；也可以添加图片资料卡和注释卡。
9. 用导出菜单生成本地项目 JSON、SRT、纸编辑 Markdown、场记 CSV、剪辑软件工程交换文件，或“剪辑软件导入说明”。
10. 点击“提交需求”填写试用反馈；反馈只保存在本机浏览器，可导出 JSON 或 CSV。

## 说明

- 素材默认不上传到这个网站，也不会经过第三方服务器。
- 本地 Whisper / FunASR 模式下，素材留在自己的电脑；需要启动本机桥接服务。
- OpenAI / 通义 / Deepgram 这类云模型需要使用自己的 Key，音频会直接发给对应模型服务商。
- 浏览器使用 File API 读取本地视频和 JSON。
- “本地项目 JSON”会保存逐字稿、选段、纸剪辑和故事版便签，但不会保存浏览器临时视频地址；恢复项目后页面会提示重新关联本地视频。
- 重新关联视频可以从顶部提示条、视频面板或素材卡片进入；选择同名或对应视频后，字幕、时间码和故事版会重新联动。
- 项目会自动保存最近版本到本机浏览器；刷新后可以用顶部“最近项目”恢复。
- 关联视频时如果文件名不一致或视频无法读取，页面会给出提示。
- “转写/Key”面板可以创建转写任务，并检查 `http://127.0.0.1:8787` 本机执行层；服务未启动时会明确显示“等待执行层”。
- 如果本机桥接服务在线，网站会把视频发送到 `POST /transcribe`；桥接服务会优先尝试调用 `whisper` CLI，其次调用 `mlx_whisper`，也支持 OpenAI、通义/百炼小文件直传、Deepgram 和 `TRANSCRIPTION_COMMAND` 自定义 ASR。
- OpenAI 分支可通过 `X-API-Key` 转发用户输入的 Key，并用官方 `audio/transcriptions` 接口返回 verbose JSON。
- 通义/百炼分支可通过 `X-API-Key` 转发用户输入的 Key，并用 Qwen3-ASR-Flash 的 OpenAI 兼容接口处理小音频。
- Deepgram 分支可通过 `X-API-Key` 转发用户输入的 Key，并用预录音接口返回分段、词级时间戳和可选发言人。
- 如果模型或自定义命令返回 `speaker` / `speaker_id` / `speakerId`，前端会自动生成发言人并显示在逐字稿中。
- 如果模型返回 `words`，前端会保存词级时间戳，后续可用于更精细的文字选段。
- 故事版画布支持栏目、便签、视频片段卡、缩放、拖拽移动和视频预览。
- 故事版画布支持图片资料卡、注释卡、栏目时长估算和整条粗剪时长估算。
- 故事版模板支持宣传片、人物纪录片、纪录短片、纪录长片。
- 当前 MVP 可以生成 Final Cut Pro FCPXML、Premiere Pro FCP7 XML、DaVinci Resolve EDL/FCPXML、剪映/CapCut 实验 FCPXML。
- 可以额外导出剪辑软件导入说明，列出素材重新链接原则、推荐导入顺序和人工检查清单。
- 纯浏览器无法读取真实本地绝对路径，工程文件导入剪辑软件后可能需要手动 relink 原素材。
- 通义/阿里云当前支持 Qwen3-ASR-Flash 小文件直传；长视频素材还需要下一轮接 DashScope Filetrans/OSS 异步任务。

## 测试

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 本机转写桥接服务

```bash
pnpm bridge:transcription
```

当前桥接服务提供：

- `GET /health`：让网站确认本机执行层在线，并返回 `ffmpeg` / `whisper` / `mlx_whisper` / `funasr` 探测结果。
- `POST /transcribe`：接收浏览器上传的视频。如果本机有 `whisper` CLI，会尝试生成逐字稿；否则尝试 `mlx_whisper`；也可以通过 `TRANSCRIPTION_COMMAND` 接任意自定义 ASR 命令。

当前这台机器已探测到 `ffmpeg` 和 `mlx_whisper`。`whisper` / `funasr` 命令尚未安装。

OpenAI 转写：

```bash
pnpm bridge:transcription
```

然后在网页里选择 OpenAI 并输入 Key。默认模型是 `whisper-1`，也可以通过环境变量调整：

```bash
OPENAI_TRANSCRIPTION_MODEL=whisper-1 pnpm bridge:transcription
```

如果要测试支持 diarized JSON 的 OpenAI 转写模型，可把 `OPENAI_TRANSCRIPTION_MODEL` 设置为对应模型名；桥接服务会在用户勾选“区分发言人”时请求 `diarized_json`。

通义/阿里云百炼小文件转写：

```bash
QWEN_ASR_MODEL=qwen3-asr-flash pnpm bridge:transcription
```

然后在网页里选择“通义/阿里云百炼”并输入 Key。默认小文件直传上限是 7MB，可用环境变量调整：

```bash
QWEN_ASR_MAX_BASE64_BYTES=7340032 pnpm bridge:transcription
```

这个路径适合快速验证 Key 和短音频；纪录片长素材建议先用本地 `mlx_whisper`，或下一轮接 DashScope Filetrans / OSS 异步任务。

Deepgram 转写：

```bash
DEEPGRAM_MODEL=nova-3 pnpm bridge:transcription
```

然后在网页里选择 Deepgram 并输入 Key。桥接服务会上传当前音视频到 Deepgram 预录音接口，并请求 `smart_format`、`utterances`、可选 `diarize` 和热词。

自定义命令例子：

```bash
TRANSCRIPTION_COMMAND='your-asr --input {input} --output-dir {outputDir} --language {language}' pnpm bridge:transcription
```

自定义命令需要在 `{outputDir}` 里生成一个 JSON 文件，格式兼容：

```json
{
  "segments": [
    { "start": 0, "end": 3.2, "text": "第一段文字" }
  ]
}
```
