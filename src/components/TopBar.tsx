import {
  Captions,
  Download,
  FileJson,
  FileVideo2,
  FolderClock,
  MessageSquareText,
  PanelBottomOpen,
  Search,
  Settings,
  Upload
} from "lucide-react";
import { useRef } from "react";

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
  | "nle-guide"
  | "relink-manifest";

type TopBarProps = {
  projectName: string;
  assetCount: number;
  segmentCount: number;
  highlightCount: number;
  transcriptionReady: boolean;
  hasRecentProject: boolean;
  exportReady: boolean;
  onProjectNameChange: (name: string) => void;
  onVideoFile: (file: File) => void;
  onJsonFile: (file: File) => void;
  onLoadDemo: () => void;
  onRestoreRecent: () => void;
  onOpenTranscription: () => void;
  onSearchFocus: () => void;
  onOpenStory: () => void;
  onOpenExport: () => void;
  onOpenFeedback: () => void;
};

export function TopBar({
  projectName,
  assetCount,
  segmentCount,
  highlightCount,
  transcriptionReady,
  hasRecentProject,
  exportReady,
  onProjectNameChange,
  onVideoFile,
  onJsonFile,
  onLoadDemo,
  onRestoreRecent,
  onOpenTranscription,
  onSearchFocus,
  onOpenStory,
  onOpenExport,
  onOpenFeedback
}: TopBarProps) {
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="top-command-bar">
      <div className="project-identity">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <span className="brand-label">本地纪录片工作台</span>
          <input
            aria-label="项目名称"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
          />
        </div>
      </div>

      <div className="project-status" aria-label="项目状态">
        <span>{assetCount} 素材</span>
        <span>{segmentCount} 段逐字稿</span>
        <span>{highlightCount} 选段</span>
        <span className={transcriptionReady ? "ready" : "muted"}>{transcriptionReady ? "转写就绪" : "待设置转写"}</span>
      </div>

      <nav className="command-actions" aria-label="主命令">
        <button type="button" className="primary-command" onClick={() => videoInputRef.current?.click()}>
          <FileVideo2 size={16} />
          导入视频
        </button>
        <button type="button" onClick={onOpenTranscription}>
          <Captions size={16} />
          转写助手
        </button>
        <button type="button" onClick={onSearchFocus}>
          <Search size={16} />
          搜索
        </button>
        <button type="button" onClick={onOpenStory}>
          <PanelBottomOpen size={16} />
          Paper Edit
        </button>
        <button type="button" disabled={!exportReady} onClick={onOpenExport} title={exportReady ? "查看 Export Assistant" : "先把 Select 加入 Paper Edit"}>
          <Download size={16} />
          Export
        </button>
        <details className="settings-menu">
          <summary aria-label="设置">
            <Settings size={16} />
            设置
          </summary>
          <div className="settings-popover">
            <button type="button" onClick={() => jsonInputRef.current?.click()}>
              <FileJson size={15} />
              导入 JSON
            </button>
            <button type="button" onClick={onLoadDemo}>
              <Upload size={15} />
              载入样例项目
            </button>
            {hasRecentProject && (
              <button type="button" onClick={onRestoreRecent}>
                <FolderClock size={15} />
                最近项目
              </button>
            )}
            <button type="button" onClick={onOpenFeedback}>
              <MessageSquareText size={15} />
              提交需求
            </button>
          </div>
        </details>
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
