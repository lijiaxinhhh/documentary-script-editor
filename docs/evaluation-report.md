# MVP 评估报告

生成日期：2026-07-01

## 本轮结论

这轮不再按“继续美化旧界面”处理，而是按最新设计尸检结论重选主范式：本地优先的纪录片纸面剪辑工作台。

核心变化是：Reduct 作为中心文字剪视频手势，Milanote 作为下游 Story Drawer，导出变成 readiness inspector，转写 Key 进入“转写预检”，不再把 API、格式、故事版和产品说明全部摊在第一屏。

## 已完成内容

- 删除第一屏 `WorkflowCallout` 和五步 workflow chip，第一屏回到真实编辑器空状态。
- 重建 `TopBar` 为 64-72px 命令栏：项目名、素材状态、导入、转写、搜索、故事、导出、设置。
- 新增 `RoughCutQueue`：从逐字稿选段生成粗剪队列，显示片段数、预计时长、timecode、speaker 和素材来源。
- 新增 `ExportInspector`：无 rough cut 时禁用导出；有片段后显示选段数量、时长、素材关联、relink 风险和目标格式。
- 重做 `TranscriptPane` 的核心手势：选中文字出现浮动工具条，可播放、设为片段、跳过、打标签、加入故事。
- 逐字稿保留稿纸感，已入粗剪的片段在文本里有琥珀标记；跳过片段用 muted/strike 表示，不真实删除文本。
- 故事版从常驻主屏降级为底部 `Story Drawer`，有片段后出现，展开后才进入 Milanote-like board。
- 新增 Premiere 式可拉伸工作台：素材库 / 逐字稿 / 检查器可横向拖拽，右侧视频 / 粗剪 / 导出可纵向拖拽，Story Drawer 可上下拉伸，布局尺寸会保存在本机浏览器。
- 移动端改为任务 tab：Transcript / Video / Story / Export，不再硬挤三栏。
- 保留本地转写预检面板：本机 bridge、provider、API Key、发言人区分、词级时间戳、热词和隐私边界仍在二级流程里。
- 恢复项目状态继续显示“需要关联视频”，避免把无本地 blob 的项目假装成可播放。
- 重写 `src/styles.css`，统一暗色工具 chrome + 暖色纸面 transcript 的 token，不再叠旧 Oryzo/工作流样式。
- 更新 e2e：覆盖 first-screen hierarchy、demo load、text selection to clip、rough cut queue、story drawer、export disabled/enabled、mobile tab、恢复项目 relink、转写桥接和 Key 转发。

## 改动文件

- `src/App.tsx`
- `src/components/TopBar.tsx`
- `src/components/TranscriptPane.tsx`
- `src/components/AssetSidebar.tsx`
- `src/components/RoughCutQueue.tsx`
- `src/components/ExportInspector.tsx`
- `src/components/WorkflowCallout.tsx`（删除）
- `src/styles.css`
- `tests/e2e/core-path.spec.ts`
- `docs/evaluation-report.md`

## 运行过的命令和结果

- `pnpm typecheck`：通过。
- `pnpm test`：通过，2 个测试文件、8 个测试通过。
- `pnpm test:e2e`：通过，9 个 e2e 全部通过；新增覆盖桌面面板拖拽缩放。
- `pnpm build`：通过，CSS 约 22.62 kB，JS 约 326.21 kB。
- Playwright 视觉 QA：通过。已检查桌面空项目、桌面样例选段后、移动端空项目。
- axe 基础无障碍扫描：通过，当前没有禁用 color-contrast。

## 视觉对照

- 概念图路径：`/Users/lijiaxin/.codex/generated_images/019efe21-8984-7881-aa11-1a047690a051/ig_0c97e399ca3cbe57016a44b5864ab88191b3dd2272a5420304.png`
- 桌面空项目截图：`/var/folders/bb/l1cmpxkn23q8c6ntkrjbbp0h0000gn/T/documentary-editor-qa-final/desktop-empty-final.png`
- 桌面样例截图：`/var/folders/bb/l1cmpxkn23q8c6ntkrjbbp0h0000gn/T/documentary-editor-qa-final/desktop-sample-final.png`
- 移动端截图：`/var/folders/bb/l1cmpxkn23q8c6ntkrjbbp0h0000gn/T/documentary-editor-qa-final/mobile-empty-final.png`

对照检查：

- Copy：首屏只强调“导入本地视频，生成可剪的逐字稿”，没有 provider 列表、localhost、导出格式或故事模板。
- Layout：桌面为左素材、中逐字稿、右监看/粗剪/导出；故事版默认不占主屏。
- Color：已锁定暗色 chrome + 暖色 paper + 琥珀 accent。
- Interaction：文本选择能生成粗剪片段，导出从禁用变为可用。
- Resizing：桌面工作台支持横向/纵向拖拽分隔条，separator 带完整 ARIA 属性，键盘方向键也能调整。
- Mobile：使用底部任务 tab，390px 视口无横向溢出。

## UX 评分

- Design quality：78/100  
  主视觉范式已经从功能陈列收束为纸面剪辑工作台。仍可继续提高字体细节、视频监看区真实素材表现和故事卡视觉质感。

- Originality：74/100  
  Reduct/Milanote/NLE 的关系被重新排序，不再是参考拼贴。后续需要加入更明确的纪录片创作特征，例如人物线、主题线、证据线。

- Craft：80/100  
  组件边界、token、响应式和状态层级更清楚；旧 CSS 大量清除。仍需进一步拆分样式和增加真实媒体缩略图。

- Functionality：82/100  
  主路径已跑通：样例项目 -> 选中文字 -> 粗剪队列 -> 故事抽屉 -> 导出准备。转写桥接和 Key 转发测试仍保留。

- Documentary workflow fit：79/100  
  更接近“看素材、剪文字、攒粗剪、组织故事、导出 NLE”的真实路径。下一轮重点应是真实长采访素材和 NLE 导入验收。

综合评分：79/100。

## 还没做但建议下一轮做

1. 用真实采访视频跑完整链路：导入、转写、选段、故事、FCP/PR/DaVinci 导入。
2. 给选中文字做更细的 range 级 strike/muted，而不是当前 segment 级 muted。
3. 粗剪队列加入拖拽排序、片段 trim、story function 标注。
4. Story Drawer 里的卡片补真实视频缩略图、speaker 色条、章节目的。
5. 做一个公开网站的只读 demo 模式，让别人不用本地 bridge 也能体验完整路径。

## 需要人工确认的问题

- 第一优先 NLE 是 Final Cut、Premiere、DaVinci 还是剪映？
- 公开网站要先做 demo 体验，还是先打包成本地桌面软件？
- Story 模板里，宣传片、人物纪录片、纪录短片、纪录长片的结构是否需要你提供自己的创作方法论？
