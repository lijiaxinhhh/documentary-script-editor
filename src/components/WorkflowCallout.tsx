import { FileOutput, FileVideo2, KeyRound, ListVideo, MessageSquareText, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useRef } from "react";
import type { Asset } from "../types/transcript";

type WorkflowCalloutProps = {
  asset?: Asset;
  transcriptCount: number;
  highlightCount: number;
  providerLabel: string;
  transcriptionReady: boolean;
  onVideoFile: (file: File, assetId?: string) => void;
  onLoadDemo: () => void;
  onOpenTranscription: () => void;
  onOpenFeedback: () => void;
};

export function WorkflowCallout({
  asset,
  transcriptCount,
  highlightCount,
  providerLabel,
  transcriptionReady,
  onVideoFile,
  onLoadDemo,
  onOpenTranscription,
  onOpenFeedback
}: WorkflowCalloutProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const needsTranscription = Boolean(asset?.objectUrl && transcriptCount === 0);
  const needsRelink = Boolean(asset && !asset.objectUrl && transcriptCount > 0);
  const hasTranscript = transcriptCount > 0;

  return (
    <section
      className={`workflow-callout ${
        needsTranscription ? "needs-transcription" : needsRelink ? "needs-relink" : hasTranscript ? "ready" : ""
      }`}
    >
      <div className="workflow-callout-copy">
        <span className="section-eyebrow">
          {needsTranscription ? "下一步" : needsRelink ? "需要关联视频" : hasTranscript ? "文字剪辑已就绪" : "开始"}
        </span>
        <div className="workflow-title-row">
          <strong>
            {needsTranscription
              ? "把这个视频转成可搜索、可高亮、可剪辑的文字"
              : needsRelink
                ? "逐字稿和故事版已恢复，重新选择本地视频即可看片"
                : hasTranscript
                ? "点击文字跳到视频，高亮片段后拖入故事版"
                : "先导入本地视频，素材不会上传到这个网站"}
          </strong>
          <span className="workflow-local-badge">Local-first</span>
        </div>
        <p>
          {needsTranscription
            ? `${asset?.fileName ?? "当前素材"} 还没有逐字稿。先完成转写，再进入纸剪辑和故事版。`
            : needsRelink
              ? `${asset?.fileName ?? "当前素材"} 只有文字数据。选择同名或对应的视频文件后，字幕、时间码和故事版会重新联动。`
              : hasTranscript
              ? `${transcriptCount} 段逐字稿 · ${highlightCount} 个选段。你可以搜索原话、改发言人、入稿并导出剪辑工程。`
              : "参考 Reduct 的主路径：导入素材，生成 transcript，再用文字选择视频；同时保留纪录片故事版和剪辑软件导出。"}
        </p>
        <ul className="workflow-proof-list" aria-label="核心功能">
          <li>
            <ShieldCheck size={14} />
            <span>素材本地优先，云模型只读取你的 Key</span>
          </li>
          <li>
            <Search size={14} />
            <span>点击文字跳视频，选中原话生成片段</span>
          </li>
          <li>
            <FileOutput size={14} />
            <span>故事版组织粗剪，导出到 FCP / PR / 达芬奇 / 剪映</span>
          </li>
        </ul>
        <div className="workflow-format-rail" aria-label="剪辑软件格式列表">
          <span>FCPXML</span>
          <span>Premiere XML</span>
          <span>DaVinci EDL</span>
          <span>剪映 / CapCut</span>
        </div>
      </div>

      <div className="workflow-callout-actions">
        {!asset && (
          <>
            <button type="button" className="callout-primary" onClick={() => videoInputRef.current?.click()}>
              <FileVideo2 size={16} />
              导入视频
            </button>
            <button type="button" className="callout-secondary" onClick={onOpenTranscription}>
              <KeyRound size={16} />
              设置转写 Key
            </button>
            <button type="button" className="callout-secondary" onClick={onLoadDemo}>
              <ListVideo size={16} />
              载入样例
            </button>
          </>
        )}
        {needsTranscription && (
          <button type="button" className="callout-primary" onClick={onOpenTranscription}>
            <KeyRound size={16} />
            开始转写 / 输入 Key
          </button>
        )}
        {needsRelink && (
          <button type="button" className="callout-primary" onClick={() => videoInputRef.current?.click()}>
            <FileVideo2 size={16} />
            关联视频
          </button>
        )}
        {hasTranscript && (
          <button type="button" className="callout-secondary" onClick={onOpenTranscription}>
            <Sparkles size={16} />
            转写 / Key
          </button>
        )}
        <button type="button" className="callout-secondary" onClick={onOpenFeedback}>
          <MessageSquareText size={16} />
          提交需求
        </button>
      </div>

      <div className="workflow-callout-status">
        <span>
          <Search size={13} />
          Ctrl+F for video
        </span>
        <span>模型：{providerLabel}</span>
        <span className={transcriptionReady || needsRelink ? "status-ok" : "status-attention"}>
          {needsRelink ? "等待本地视频" : transcriptionReady ? "Key/本地模型已准备" : "等待 Key"}
        </span>
        {asset?.mediaWarning && <span>文件名不一致</span>}
        {asset?.mediaError && <span>视频无法读取</span>}
        <span>样例路径：采访整理 → 选段 → 故事版 → 导出</span>
      </div>

      <input
        ref={videoInputRef}
        className="hidden-input"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onVideoFile(file, needsRelink ? asset?.id : undefined);
          event.target.value = "";
        }}
      />
    </section>
  );
}
