# MVP 评估报告

生成日期：2026-07-05

## 本轮结论

本轮把项目从“文稿高亮 + 故事抽屉 + 过度承诺导出”重构为本地优先的纪录片纸剪辑工作台：Transcript 负责生成 Select / Maybe / Reject，Select Inspector 负责复核和 trim，Paper Edit Spine 决定导出时间线，Export Assistant 诚实展示 Beta / Experimental 和 relink 风险。

## 已完成内容

- `Highlight` 升级为 Select / Clip Range 模型，新增 status、timingSource、reviewed、rating、rejectReason、padding、original in/out 等字段，并兼容旧 JSON。
- 逐字稿浮动工具条改为“播放选中范围 / 加入 Selects / 标为 Maybe / Reject / 添加标签备注”。
- 新增 `SelectInspector`：显示文本、素材、speaker、source timecode、duration、timingSource、status、rating、notes、reject reason、trim、play、mark reviewed。
- `RoughCutQueue` 改为 `Selects Queue`：展示 active selects，支持筛选、播放、加入 Paper Edit、Maybe、Reject。
- 底部常驻 `Paper Edit Spine`，只有 Paper Edit 中的非 rejected selects 进入 NLE 时间线。
- 转写面板改为“转写助手 / 隐私路径”，默认本机助手，Key 默认仅本次会话，显式按钮才保存到浏览器。
- 本机桥接服务新增 `TRANSCRIPTION_BRIDGE_TOKEN` / `X-Bridge-Token` 配对码。
- `ExportInspector` 改为 `Export Assistant`：Final Cut FCPXML Beta 主推，Premiere / DaVinci / 剪映标记 Experimental，新增 Relink manifest CSV。
- NLE 导出移除“没有 Paper Edit 就导出全部 highlights”的危险回退。
- README、产品规格、评估计划和 e2e 测试已同步到新工作流。

## 改动文件

- `src/App.tsx`
- `src/types/transcript.ts`
- `src/utils/selects.ts`
- `src/utils/exporters.ts`
- `src/utils/nleExporters.ts`
- `src/utils/localProject.ts`
- `src/components/TranscriptPane.tsx`
- `src/components/RoughCutQueue.tsx`
- `src/components/SelectInspector.tsx`
- `src/components/StoryboardCanvas.tsx`
- `src/components/TranscriptionPanel.tsx`
- `src/components/ExportInspector.tsx`
- `src/components/TopBar.tsx`
- `src/components/AssetSidebar.tsx`
- `src/styles.css`
- `scripts/transcription-bridge.mjs`
- `tests/e2e/core-path.spec.ts`
- `README.md`
- `docs/product-spec.md`
- `docs/ux-rubric.md`
- `docs/evaluation-plan.md`

## 运行过的命令和结果

- `pnpm typecheck`：通过。
- `pnpm test`：通过，2 个测试文件、8 个测试通过。
- `pnpm test:e2e`：通过，11 个 e2e 全部通过。

## UX 评分

- 功能完整性：4.3/5
- 可理解性：4.2/5
- 信息架构：4.2/5
- 转化路径：4.0/5
- 视觉一致性：3.8/5
- 无障碍：4.0/5
- 错误恢复：4.2/5
- 性能风险：4.2/5

## 仍有限制

- FCPXML / XML / EDL 仍是 1080p、30fps、NDF 的 MVP 假设，没有自动处理 23.976/25/29.97、混合帧率、复杂音轨和多机位。
- DaVinci FCPXML 仍复用 Final Cut exporter，因此只标记为 Experimental。
- SRT / CSV 逐字稿导入入口还没有完整解析器，当前稳定路径仍是 JSON。
- Select Inspector 还没有波形和逐帧预览，先用可靠 trim controls。
- 真实 NLE 导入仍需要用实际素材人工验收。
