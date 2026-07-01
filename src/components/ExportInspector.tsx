import { AlertTriangle, CheckCircle2, Download, Lock } from "lucide-react";
import type { ExportType } from "./TopBar";
import type { Project } from "../types/transcript";
import { formatShortTime } from "../utils/timecode";

type ExportInspectorProps = {
  project: Project;
  paperHighlightIds: Set<string>;
  onExport: (type: ExportType) => void;
};

const exportOptions: Array<{ type: ExportType; label: string; note: string }> = [
  { type: "finalcut", label: "Final Cut FCPXML", note: "主推荐" },
  { type: "premiere", label: "Premiere XML", note: "FCP7 XML" },
  { type: "davinci-edl", label: "DaVinci EDL", note: "剪辑点草稿" },
  { type: "davinci", label: "DaVinci FCPXML", note: "可导入" },
  { type: "jianying", label: "剪映 / CapCut", note: "实验性" },
  { type: "nle-guide", label: "导出导入说明", note: "relink 指南" }
];

export function ExportInspector({ project, paperHighlightIds, onExport }: ExportInspectorProps) {
  const clips = project.highlights.filter((highlight) => paperHighlightIds.has(highlight.id));
  const duration = clips.reduce((total, highlight) => total + Math.max(0, highlight.end - highlight.start), 0);
  const clipAssetIds = new Set(clips.map((highlight) => highlight.assetId));
  const usedAssets = project.assets.filter((asset) => clipAssetIds.has(asset.id));
  const linkedAssets = usedAssets.filter((asset) => Boolean(asset.objectUrl || asset.linkedFileName));
  const ready = clips.length > 0;
  const relinkRisk = usedAssets.some((asset) => !asset.objectUrl);

  return (
    <section className="export-inspector" aria-label="导出准备度">
      <header className="inspector-header">
        <div>
          <span className="pane-title">导出准备度</span>
          <strong>{ready ? "可生成粗剪工程" : "导出不可用"}</strong>
        </div>
        {ready ? <CheckCircle2 size={18} className="ok-icon" /> : <Lock size={18} className="muted-icon" />}
      </header>

      {!ready ? (
        <div className="export-locked">
          <strong>还没有粗剪片段</strong>
          <span>选中逐字稿文字并设为片段后，才能导出到剪辑软件。</span>
        </div>
      ) : (
        <>
          <div className="readiness-list">
            <span>
              <CheckCircle2 size={14} />
              {clips.length} 个选段
            </span>
            <span>
              <CheckCircle2 size={14} />
              预计时长 {formatShortTime(duration)}
            </span>
            <span>
              <CheckCircle2 size={14} />
              {linkedAssets.length}/{usedAssets.length} 个源视频已关联
            </span>
            <span className={relinkRisk ? "warn" : ""}>
              {relinkRisk ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {relinkRisk ? "浏览器路径需要在剪辑软件中 relink" : "当前素材已关联"}
            </span>
          </div>

          <div className="export-grid">
            {exportOptions.map((option) => (
              <button key={option.type} type="button" onClick={() => onExport(option.type)}>
                <Download size={14} />
                <span>{option.label}</span>
                <small>{option.note}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
