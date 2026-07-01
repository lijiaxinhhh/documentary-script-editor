import { Download, FileJson, Film, FlaskConical, History, KeyRound } from "lucide-react";
import { useRef, useState } from "react";

type TopBarProps = {
  projectName: string;
  assetCount: number;
  segmentCount: number;
  highlightCount: number;
  storyGroupCount: number;
  transcriptionProviderLabel: string;
  transcriptionReady: boolean;
  hasRecentProject: boolean;
  onProjectNameChange: (name: string) => void;
  onVideoFile: (file: File) => void;
  onJsonFile: (file: File) => void;
  onLoadDemo: () => void;
  onRestoreRecent: () => void;
  onExport: (type: ExportType) => void;
  onOpenTranscription: () => void;
};

export type ExportType =
  | "project"
  | "srt"
  | "markdown"
  | "csv"
  | "finalcut"
  | "premiere"
  | "davinci"
  | "davinci-edl"
  | "jianying"
  | "nle-guide";

export function TopBar({
  projectName,
  assetCount,
  segmentCount,
  highlightCount,
  storyGroupCount,
  transcriptionProviderLabel,
  transcriptionReady,
  hasRecentProject,
  onProjectNameChange,
  onVideoFile,
  onJsonFile,
  onLoadDemo,
  onRestoreRecent,
  onExport,
  onOpenTranscription
}: TopBarProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(projectName);
  const transcriptionButtonLabel = assetCount > 0 && segmentCount === 0 ? "开始转写 / Key" : "视频转文字 / Key";

  return (
    <header className="topbar">
      <div className="project-title">
        <span className="app-mark">本地纪录片工作台</span>
        {editingTitle ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onProjectNameChange(draftTitle.trim() || "未命名纪录片项目");
              setEditingTitle(false);
            }}
          >
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              autoFocus
              onBlur={() => {
                onProjectNameChange(draftTitle.trim() || "未命名纪录片项目");
                setEditingTitle(false);
              }}
            />
          </form>
        ) : (
          <button
            className="title-button"
            type="button"
            onClick={() => {
              setDraftTitle(projectName);
              setEditingTitle(true);
            }}
          >
            {projectName}
          </button>
        )}
        <div className="project-status-row" aria-label="隐私与本地状态">
          <span>本地优先</span>
          <span>素材不上云</span>
          <span>Key 存本机</span>
        </div>
      </div>

      <div className="workflow-strip" aria-label="工作流程">
        <span className={`workflow-chip ${assetCount ? "ready" : ""}`}>
          <b>1</b>
          <span>素材</span>
          <small>{assetCount} 个</small>
        </span>
        <span className={`workflow-chip ${segmentCount ? "ready" : transcriptionReady ? "armed" : ""}`}>
          <b>2</b>
          <span>转写</span>
          <small>{segmentCount ? `${segmentCount} 段` : transcriptionProviderLabel}</small>
        </span>
        <span className={`workflow-chip ${highlightCount ? "ready" : ""}`}>
          <b>3</b>
          <span>选段</span>
          <small>{highlightCount} 条</small>
        </span>
        <span className={`workflow-chip ${storyGroupCount > 1 ? "ready" : ""}`}>
          <b>4</b>
          <span>故事版</span>
          <small>{storyGroupCount} 栏</small>
        </span>
        <span className={`workflow-chip ${highlightCount ? "armed" : ""}`}>
          <b>5</b>
          <span>导出</span>
          <small>FCP / PR / 达芬奇 / 剪映</small>
        </span>
      </div>

      <nav className="topbar-actions" aria-label="主工具栏">
        <div className="action-cluster">
          <button type="button" onClick={() => videoInputRef.current?.click()} title="导入本地视频">
            <Film size={17} />
            <span>导入视频</span>
          </button>
          <button type="button" onClick={() => jsonInputRef.current?.click()} title="导入逐字稿或本地项目 JSON">
            <FileJson size={17} />
            <span>导入 JSON</span>
          </button>
          <button type="button" onClick={onLoadDemo} title="载入样例转写">
            <FlaskConical size={17} />
            <span>样例</span>
          </button>
          {hasRecentProject && (
            <button type="button" onClick={onRestoreRecent} title="恢复本机最近项目">
              <History size={17} />
              <span>最近项目</span>
            </button>
          )}
        </div>
        <button type="button" className="primary-toolbar-button" onClick={onOpenTranscription} title="视频转文字与 Key 设置">
          <KeyRound size={17} />
          <span>{transcriptionButtonLabel}</span>
        </button>
        <div className="export-group">
          <Download size={17} />
          <span className="export-group-label">导出工程</span>
          <select
            aria-label="导出"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as ExportType | "";
              if (value) onExport(value);
              event.target.value = "";
            }}
          >
            <option value="">格式</option>
            <option value="project">本地项目 JSON</option>
            <option value="srt">字幕 SRT</option>
            <option value="markdown">纸编辑 Markdown</option>
            <option value="csv">场记 CSV</option>
            <option value="finalcut">Final Cut Pro FCPXML</option>
            <option value="premiere">Premiere Pro XML</option>
            <option value="davinci">DaVinci Resolve FCPXML</option>
            <option value="davinci-edl">DaVinci Resolve EDL</option>
            <option value="jianying">剪映/CapCut 实验 FCPXML</option>
            <option value="nle-guide">剪辑软件导入说明</option>
          </select>
        </div>
      </nav>

      <input
        ref={videoInputRef}
        className="hidden-input"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onVideoFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={jsonInputRef}
        className="hidden-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onJsonFile(file);
          event.target.value = "";
        }}
      />
    </header>
  );
}
