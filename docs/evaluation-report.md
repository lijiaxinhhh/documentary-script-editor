# MVP 评估报告

生成日期：2026-06-29

## 已完成内容

- 更新产品文档：明确网站类型、目标用户、JTBD、核心任务、用户旅程、MVP 范围和不做项。
- 更新 UX rubric：把功能完整性、可理解性、信息架构、转化路径、视觉一致性、无障碍、错误恢复和性能风险量化为 1-5 分。
- 更新评估计划：加入人工检查、Playwright、axe、单元测试，以及 Generator / Evaluator / Repair 循环。
- 改造首屏工作流入口：突出本地优先、输入 Key、文字剪视频、故事版组织和剪辑软件导出。
- 新增“提交需求”反馈面板：包含身份、真实工作流、痛点、理想输出和联系方式；当前只保存到本机浏览器，不做云端提交。
- 新增反馈导出：已保存的需求可导出为 JSON 或 CSV。
- 新增本地项目文件：导出/导入本地项目 JSON，恢复逐字稿、选段、纸剪辑和故事版便签；浏览器临时视频地址不会写入文件。
- 新增素材重新关联流程：恢复项目后，顶部提示条、视频面板和素材卡片都会提示“关联视频”；选择本地视频后恢复字幕和时间码联动。
- 新增关联校验：关联文件名不一致、视频时长和项目记录差异过大，或视频无法读取时显示提示。
- 新增最近项目：项目有素材/逐字稿后会自动保存到本机浏览器，刷新后可用“最近项目”恢复。
- 新增转写任务队列：转写面板可创建任务，检查本机 `localhost:8787` 执行层；未连接时显示“等待执行层”和“重新检查”。
- 新增本机转写桥接服务：`pnpm bridge:transcription` 启动 `localhost:8787`，`/health` 返回 runtime 探测结果，`/transcribe` 可接收视频并在有 `whisper` CLI 时尝试生成逐字稿。
- 前端转写任务现在会真实 POST 视频到本机桥接服务；成功时写回逐字稿，runtime 缺失时进入 blocked/failed 状态。
- 桥接服务支持 `TRANSCRIPTION_COMMAND` 自定义 ASR 命令；只要输出 Whisper 风格 JSON，前端即可写回逐字稿。
- 桥接服务新增 `mlx_whisper` fallback；当前机器已可用 `mlx_whisper` 跑真实短音频冒烟。
- OpenAI Key 路径已接通：网页输入的 Key 会通过本机桥的 `X-API-Key` 发往 OpenAI `audio/transcriptions` 接口，返回结果写回逐字稿。
- 通义/百炼 Key 路径已接通小文件模式：网页输入的 Key 会通过本机桥发往 Qwen3-ASR-Flash 的 OpenAI 兼容接口；长素材异步 Filetrans/OSS 仍待接。
- Deepgram Key 路径已接通：网页输入的 Key 会通过本机桥发往 Deepgram 预录音接口，并请求 smart_format、utterances、热词和可选 diarize。
- 转写结果现在会标准化 `speaker` / `speaker_id` / `speakerId` 和 `words`，前端会自动生成发言人并保存词级时间戳。
- 故事版新增图片资料卡、注释卡、栏目时长估算和整条粗剪时长估算。
- 本地项目 JSON 会保存图片/注释卡元数据，但不会保存浏览器临时图片 object URL；恢复后可重新关联图片。
- 导出菜单新增“剪辑软件导入说明”，列出素材重新链接原则、推荐导入顺序和人工检查清单。
- 完成新一轮 UI 迭代：顶部栏改为更稳的两行结构，工作区统一为暗色剪辑台风格，故事版改为暗色画布 + 纸质卡片，滚动条、按钮层级、面板边框和移动端布局全部重新打磨。
- 完成 Build Web Apps 视觉优化轮：先生成工作台概念图，再把主工作区改为“左素材 / 中纸稿逐字稿 / 右视频字幕 / 下故事版”的产品结构。
- 强化关键入口：顶部主按钮固定为“视频转文字 / Key”，空项目开工区新增“设置转写 Key”，导出区域改为“导出工程 + 格式”。
- 优化移动端：顶部切为单列布局，工作流步骤和工具按钮可横向轻扫，Playwright 验证 390px 视口无横向溢出。
- 补充可访问性语义：筛选下拉有 `aria-label`，搜索结果滚动区可键盘聚焦，主要表单字段有 label。
- 新增单元测试：覆盖 SRT、Markdown、CSV、Final Cut、Premiere、DaVinci EDL、剪辑软件导入说明、本地项目、图片卡元数据、反馈导出核心结构。
- 新增 Playwright e2e：覆盖载入样例、入稿、故事版出现视频卡片、图片资料卡、反馈表单错误/成功状态、反馈导出按钮、本地项目下载、剪辑软件导入说明下载、恢复项目后关联视频、最近项目恢复、转写任务执行层未连接状态、OpenAI Key 转发、通义/百炼 Key 转发、Deepgram Key 转发、移动端横向溢出、基础 axe 扫描。

## 改动文件

- `package.json`
- `pnpm-lock.yaml`
- `src/App.tsx`
- `src/components/TopBar.tsx`
- `src/components/WorkflowCallout.tsx`
- `src/components/StoryboardCanvas.tsx`
- `src/components/FeedbackPanel.tsx`
- `src/components/AssetSidebar.tsx`
- `src/types/feedback.ts`
- `src/types/transcriptionJob.ts`
- `src/types/transcript.ts`
- `scripts/transcription-bridge.mjs`
- `src/styles.css`
- `src/utils/exporters.test.ts`
- `src/utils/localProject.ts`
- `src/utils/localProject.test.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `tests/e2e/core-path.spec.ts`
- `docs/product-spec.md`
- `docs/ux-rubric.md`
- `docs/evaluation-plan.md`
- `docs/evaluation-report.md`
- `dist/*`（`pnpm build` 生成的构建产物）

## 运行过的命令和结果

- `pnpm add -D vitest @playwright/test @axe-core/playwright`：通过。只新增测试开发依赖，没有新增 production dependency。
- `node --check scripts/transcription-bridge.mjs`：通过。
- `pnpm typecheck`：通过。
- `pnpm test`：通过，2 个测试文件、8 个测试通过。
- `pnpm test:e2e`：通过，9 个 e2e 通过。
- `pnpm exec playwright install chromium`：通过。
- `pnpm build`：通过，产物约 `318.50 kB` JS、`47.98 kB` CSS。
- Playwright 视觉 QA：通过；桌面 1440×900 无横向溢出，移动 390×844 无横向溢出，顶部 Key 按钮、转写设置入口、样例载入后逐字稿/视频/故事版布局均可见。
- `pnpm bridge:transcription` + `/health`：通过；当前探测到 `ffmpeg=true`，`whisperCli=false`，`mlxWhisper=true`，`funasr=false`。
- `POST /transcribe?provider=local-whisper`：真实短音频冒烟通过；`mlx_whisper` 返回 `segments`，桥接服务响应 `runtime=mlx-whisper`。
- `TRANSCRIPTION_COMMAND` 自定义 runtime 冒烟：通过；桥接服务返回 `segments:[{start,end,text}]`。
- `POST /transcribe?provider=openai` 缺少 Key 冒烟：返回 `MISSING_API_KEY`，不会误判为已完成。
- `POST /transcribe?provider=qwen-aliyun` 缺少 Key 冒烟：返回 `MISSING_API_KEY`，不会误判为已完成。
- `POST /transcribe?provider=deepgram` 缺少 Key 冒烟：返回 `MISSING_API_KEY`，不会误判为已完成。
- `curl -I http://127.0.0.1:5174/`：通过，返回 HTTP 200。
- `git status --short`：失败，当前目录不是 git 仓库。

## UX 评分

- 功能完整性：4/5  
  已跑通理解价值、导入视频、创建转写任务、OpenAI Key 转发、通义/百炼小文件 runner、Deepgram runner、本地 mlx_whisper 短音频冒烟、入稿、故事版图片/注释、反馈和导出测试。长素材通义 Filetrans/OSS 仍待接。

- 可理解性：4/5  
  首屏能看到本地优先、视频转文字 / Key、文字剪视频、故事版和导出方向；移动端已压缩顶部高度，但后续仍可继续降低说明文字密度。

- 信息架构：4/5  
  主工作区已按素材、逐字稿、视频字幕、故事版分层；转写入口和导出入口更像真实工作台命令。

- 转化路径：4/5  
  主要 CTA 包含导入视频、载入样例、开始转写 / 输入 Key、提交需求。

- 视觉一致性：4/5  
  已从早期原型感改为更统一的暗色剪辑工作台，逐字稿改为纸稿表面，故事版改为暗色画布 + 纸质卡片。后续仍可继续做品牌级图标、动效和空状态插画。

- 无障碍：4/5  
  表单 label、按钮名称、键盘焦点、滚动区域和基础 axe 检查已处理。自动化测试暂未强制 color-contrast 规则。

- 错误恢复：4/5  
  JSON 导入、反馈表单缺字段、转写 Key 缺失、执行层未连接、runtime 缺失都有提示。

- 性能风险：4/5  
  未新增运行时重型库；新增的 Vitest、Playwright、axe 都是 devDependencies。当前 JS 构建体积可接受。

## 未完成但建议下一轮做

1. 接通通义/阿里云长素材 Filetrans/OSS 异步 runner，并明确云模型的上传边界、费用和报错。
2. 用真实采访短视频跑一条完整 `mlx_whisper` 转写，并根据结果调模型大小、语言、热词和时间戳。
3. 做真实工程文件兼容测试：拿 Final Cut、Premiere、DaVinci、剪映分别导入样例产物并记录 relink 行为。
4. 做真实工程文件兼容测试后，把各软件的导入失败提示写进导入说明模板。
5. 强化故事版体验：继续支持连接线、分镜占位、章节目的标注和更细的结构统计。

## 需要人工确认的问题

- 反馈表单现在只保存到本机浏览器；下一轮是否需要接真实收集渠道，例如 Notion、飞书、多维表或一个本地收集文件夹？
- 真实 ASR 优先接哪条线：本地 Whisper/FunASR，还是先接通义/阿里云？
- 导出兼容性里，哪个剪辑软件应作为第一优先验收对象？
- 你希望这个产品最后是纯本地网页、Electron/Tauri 桌面软件，还是“本地服务 + 浏览器前端”？
