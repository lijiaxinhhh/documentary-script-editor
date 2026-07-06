import { AlertTriangle, CheckCircle2, Download, FileWarning, Lock } from "lucide-react";
import type { ReactNode } from "react";
import type { ExportType } from "./TopBar";
import type { Project } from "../types/transcript";
import { isExportableSelect, selectDuration } from "../utils/selects";
import { formatShortTime } from "../utils/timecode";

type ExportInspectorProps = {
  project: Project;
  paperHighlightIds: Set<string>;
  onExport: (type: ExportType) => void;
};

type ExportOption = {
  type: ExportType;
  label: string;
  note: string;
  primary?: boolean;
  experimental?: boolean;
};

const exportOptions: ExportOption[] = [
  { type: "finalcut", label: "Final Cut FCPXML Beta", note: "主推荐交换文件", primary: true },
  { type: "markdown", label: "Markdown Paper Edit", note: "给导演/剪辑师复核" },
  { type: "relink-manifest", label: "Relink manifest CSV", note: "素材重连清单" },
  { type: "premiere", label: "Premiere XML", note: "FCP7 XML", experimental: true },
  { type: "davinci", label: "DaVinci FCPXML", note: "复用 FCPXML exporter", experimental: true },
  { type: "davinci-edl", label: "DaVinci EDL", note: "剪辑点草稿", experimental: true },
  { type: "jianying", label: "剪映 / CapCut", note: "实验 FCPXML", experimental: true },
  { type: "nle-guide", label: "NLE import guide", note: "格式假设与人工检查" }
];

export function ExportInspector({ project, paperHighlightIds, onExport }: ExportInspectorProps) {
  const highlightMap = new Map(project.highlights.map((highlight) => [highlight.id, highlight]));
  const clips = project.paperEdit
    .flatMap((group) => group.highlightIds)
    .map((highlightId) => highlightMap.get(highlightId))
    .filter(isExportableSelect);
  const paperIdCount = paperHighlightIds.size;
  const rejectedIncluded = project.paperEdit
    .flatMap((group) => group.highlightIds)
    .map((highlightId) => highlightMap.get(highlightId))
    .some((highlight) => highlight?.status === "rejected");
  const duration = clips.reduce((total, highlight) => total + selectDuration(highlight), 0);
  const clipAssetIds = new Set(clips.map((highlight) => highlight.assetId));
  const usedAssets = project.assets.filter((asset) => clipAssetIds.has(asset.id));
  const linkedAssets = usedAssets.filter((asset) => Boolean(asset.objectUrl || asset.linkedFileName));
  const missingAssets = usedAssets.filter((asset) => !asset.objectUrl && !asset.linkedFileName);
  const estimatedCount = clips.filter((highlight) => highlight.timingSource === "segment-estimate").length;
  const needsReviewCount = clips.filter((highlight) => !highlight.reviewed || highlight.status === "needs-review").length;
  const ready = clips.length > 0;
  const relinkRisk = usedAssets.some((asset) => !asset.objectUrl || asset.mediaWarning);

  return (
    <section className="export-inspector" aria-label="Export Assistant">
      <header className="inspector-header">
        <div>
          <span className="pane-title">Export Assistant</span>
          <strong>{ready ? "Paper Edit 可生成交换文件" : "等待 Paper Edit"}</strong>
        </div>
        {ready ? <CheckCircle2 size={18} className="ok-icon" /> : <Lock size={18} className="muted-icon" />}
      </header>

      {!ready ? (
        <div className="export-locked">
          <strong>Paper Edit 里还没有 Select</strong>
          <span>先把已复核的 Select 加入 Paper Edit，导出时间线才有可信顺序。</span>
        </div>
      ) : (
        <>
          <div className="readiness-list export-preflight">
            <CheckRow ok>{clips.length} 个 Paper Edit clips（{paperIdCount} 个结构引用）</CheckRow>
            <CheckRow ok>总时长 {formatShortTime(duration)}</CheckRow>
            <CheckRow ok>{usedAssets.length} 个源素材参与导出</CheckRow>
            <CheckRow ok={missingAssets.length === 0} warning={missingAssets.length > 0}>
              {linkedAssets.length}/{usedAssets.length} 个素材已关联；{missingAssets.length} 个 offline
            </CheckRow>
            <CheckRow ok={!relinkRisk} warning={relinkRisk}>
              {relinkRisk ? "存在 relink risk，请导出素材重连清单" : "当前 relink 风险较低"}
            </CheckRow>
            <CheckRow ok={estimatedCount === 0} warning={estimatedCount > 0}>
              {estimatedCount} 个 estimated timing clips
            </CheckRow>
            <CheckRow ok={needsReviewCount === 0} warning={needsReviewCount > 0}>
              {needsReviewCount} 个 needs-review clips
            </CheckRow>
            <CheckRow ok={!rejectedIncluded} warning={rejectedIncluded}>
              {rejectedIncluded ? "Paper Edit 中发现 rejected 引用，导出会跳过" : "Rejected selects 未进入导出"}
            </CheckRow>
            <CheckRow warning>时间线假设：1080p / 30fps / NDF / 音视频同源</CheckRow>
          </div>

          <div className="export-grid assistant-grid">
            {exportOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                className={`${option.primary ? "primary-export" : ""} ${option.experimental ? "experimental-export" : ""}`}
                onClick={() => onExport(option.type)}
              >
                {option.experimental ? <FileWarning size={14} /> : <Download size={14} />}
                <span>{option.label}</span>
                <small>{option.experimental ? `Experimental · ${option.note}` : option.note}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CheckRow({
  ok,
  warning,
  children
}: {
  ok?: boolean;
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={warning ? "warn" : ""}>
      {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {children}
    </span>
  );
}
