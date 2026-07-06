import { Ban, Clock3, Play, Plus, Scissors, StretchHorizontal } from "lucide-react";
import type { Asset, Highlight, SelectStatus, Speaker } from "../types/transcript";
import { selectDuration, statusLabel, timingSourceLabel } from "../utils/selects";
import { formatShortTime } from "../utils/timecode";

type RoughCutQueueProps = {
  highlights: Highlight[];
  paperHighlightIds: Set<string>;
  activeSelectId?: string;
  statusFilter: SelectStatus | "all";
  speakers: Speaker[];
  assets: Asset[];
  onSeek: (highlight: Highlight) => void;
  onSelect: (highlightId: string) => void;
  onStatusFilterChange: (status: SelectStatus | "all") => void;
  onStatusChange: (highlightId: string, status: SelectStatus) => void;
  onAddToPaper: (highlightId: string) => void;
  onOpenStory: () => void;
  onOpenExport: () => void;
};

export function RoughCutQueue({
  highlights,
  paperHighlightIds,
  activeSelectId,
  statusFilter,
  speakers,
  assets,
  onSeek,
  onSelect,
  onStatusFilterChange,
  onStatusChange,
  onAddToPaper,
  onOpenStory,
  onOpenExport
}: RoughCutQueueProps) {
  const clips = highlights.filter((highlight) => {
    if (statusFilter === "rejected") return highlight.status === "rejected";
    if (statusFilter !== "all") return highlight.status === statusFilter;
    return highlight.status !== "rejected";
  });
  const speakerMap = new Map(speakers.map((speaker) => [speaker.id, speaker.name]));
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const duration = clips.reduce((total, highlight) => total + selectDuration(highlight), 0);

  return (
    <section className="rough-cut-queue selects-queue" aria-label="Selects Queue">
      <header className="inspector-header">
        <div>
          <span className="pane-title">Selects</span>
          <strong>{clips.length} 个选段 · {formatShortTime(duration)}</strong>
        </div>
        <button type="button" onClick={onOpenStory}>
          <StretchHorizontal size={15} />
          Paper Edit
        </button>
      </header>

      <div className="select-filter-row">
        <select
          aria-label="筛选 Selects"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as SelectStatus | "all")}
        >
          <option value="all">All active</option>
          <option value="selected">Selected</option>
          <option value="maybe">Maybe</option>
          <option value="needs-review">Needs review</option>
          <option value="used">Used</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {clips.length === 0 ? (
        <div className="queue-empty">
          <Scissors size={18} />
          <strong>还没有 Select</strong>
          <span>在逐字稿中选中文字，点击“加入 Selects”。</span>
        </div>
      ) : (
        <div className="queue-list">
          {clips.map((highlight, index) => {
            const inPaper = paperHighlightIds.has(highlight.id);
            return (
            <article key={highlight.id} className={`queue-card ${highlight.id === activeSelectId ? "active" : ""}`}>
              <button type="button" className="queue-play" onClick={() => onSeek(highlight)} title="播放这个片段">
                <Play size={13} />
              </button>
              <button type="button" className="queue-card-main" onClick={() => onSelect(highlight.id)}>
                <span className="queue-meta">
                  {index + 1}. {formatShortTime(highlight.start)} - {formatShortTime(highlight.end)}
                </span>
                <p>{highlight.text}</p>
                <span className="queue-source">
                  {highlight.speakerId ? speakerMap.get(highlight.speakerId) ?? highlight.speakerId : "未命名"} ·{" "}
                  {assetMap.get(highlight.assetId)?.fileName ?? "未知素材"}
                </span>
                <span className="queue-badges">
                  <small>{inPaper ? "Used in Paper Edit" : statusLabel(highlight.status)}</small>
                  <small className={highlight.timingSource === "segment-estimate" || !highlight.reviewed ? "warn" : ""}>
                    <Clock3 size={12} />
                    {timingSourceLabel(highlight.timingSource)}
                  </small>
                </span>
              </button>
              <div className="queue-card-actions">
                <button type="button" onClick={() => onAddToPaper(highlight.id)} disabled={highlight.status === "rejected" || inPaper}>
                  <Plus size={13} />
                  Paper
                </button>
                <button type="button" onClick={() => onStatusChange(highlight.id, "maybe")} disabled={highlight.status === "maybe"}>
                  Maybe
                </button>
                <button type="button" onClick={() => onStatusChange(highlight.id, "rejected")}>
                  <Ban size={13} />
                  Reject
                </button>
              </div>
            </article>
          );
          })}
        </div>
      )}

      <footer className="queue-footer">
        <button type="button" onClick={onOpenExport} disabled={paperHighlightIds.size === 0}>
          查看 Export Assistant
        </button>
      </footer>
    </section>
  );
}
