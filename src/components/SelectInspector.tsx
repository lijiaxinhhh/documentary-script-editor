import { CheckCircle2, Clock3, FileVideo2, Play, RotateCcw, Scissors, Star, UserRound } from "lucide-react";
import type { Asset, Highlight, SelectStatus } from "../types/transcript";
import { selectDuration, statusLabel, timingSourceLabel } from "../utils/selects";
import { formatShortTime } from "../utils/timecode";

type SelectInspectorProps = {
  select?: Highlight;
  asset?: Asset;
  speakerName?: string;
  inPaper: boolean;
  onUpdate: (highlightId: string, patch: Partial<Highlight>) => void;
  onPlay: (highlight: Highlight) => void;
  onAddToPaper: (highlightId: string) => void;
};

const statusOptions: SelectStatus[] = ["selected", "maybe", "needs-review", "used", "rejected"];

export function SelectInspector({
  select,
  asset,
  speakerName,
  inPaper,
  onUpdate,
  onPlay,
  onAddToPaper
}: SelectInspectorProps) {
  if (!select) {
    return (
      <section className="select-inspector empty" aria-label="Select Inspector">
        <header className="inspector-header">
          <div>
            <span className="pane-title">Select Inspector</span>
            <strong>等待选段</strong>
          </div>
          <Scissors size={18} className="muted-icon" />
        </header>
        <div className="queue-empty">
          <Scissors size={18} />
          <strong>选中文字后创建 Select</strong>
          <span>这里会显示来源、时间码可信度、trim 和复核状态。</span>
        </div>
      </section>
    );
  }

  function trim(startDelta: number, endDelta: number) {
    if (!select) return;
    const nextStart = Math.max(0, Number((select.start + startDelta).toFixed(3)));
    const nextEnd = Number((select.end + endDelta).toFixed(3));
    if (nextEnd <= nextStart + 0.05) return;
    onUpdate(select.id, {
      start: nextStart,
      end: nextEnd,
      timingSource: "manual"
    });
  }

  function markReviewed() {
    if (!select) return;
    onUpdate(select.id, {
      reviewed: true,
      status: select.status === "needs-review" ? "selected" : select.status
    });
  }

  const needsReview = select.timingSource === "segment-estimate" || !select.reviewed;

  return (
    <section className="select-inspector" aria-label="Select Inspector">
      <header className="inspector-header">
        <div>
          <span className="pane-title">Select Inspector</span>
          <strong>{statusLabel(select.status)} · {formatShortTime(selectDuration(select))}</strong>
        </div>
        {select.reviewed ? <CheckCircle2 size={18} className="ok-icon" /> : <Clock3 size={18} className="warn-icon" />}
      </header>

      <div className="select-inspector-body">
        <p className="select-inspector-text">{select.text}</p>

        <div className="select-source-grid">
          <span>
            <FileVideo2 size={14} />
            {asset?.fileName ?? "未知素材"}
          </span>
          <span>
            <UserRound size={14} />
            {speakerName || "未命名发言人"}
          </span>
          <span>
            <Clock3 size={14} />
            {formatShortTime(select.start)} - {formatShortTime(select.end)}
          </span>
          <span className={needsReview ? "timing-badge warn" : "timing-badge"}>
            {timingSourceLabel(select.timingSource)}
            {needsReview ? " · needs review" : " · reviewed"}
          </span>
        </div>

        <label className="field-label" htmlFor="select-status">
          Select status
        </label>
        <select
          id="select-status"
          value={select.status}
          onChange={(event) =>
            onUpdate(select.id, {
              status: event.target.value as SelectStatus,
              reviewed: event.target.value === "needs-review" ? false : select.reviewed
            })
          }
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="select-rating">
          Rating
        </label>
        <div className="rating-row">
          <Star size={15} />
          <select
            id="select-rating"
            value={select.rating ?? ""}
            onChange={(event) =>
              onUpdate(select.id, {
                rating: event.target.value ? (Number(event.target.value) as Highlight["rating"]) : undefined
              })
            }
          >
            <option value="">Unrated</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </select>
        </div>

        <div className="trim-grid" aria-label="Trim controls">
          <button type="button" onClick={() => trim(-0.1, 0)}>
            start -0.1s
          </button>
          <button type="button" onClick={() => trim(0.1, 0)}>
            start +0.1s
          </button>
          <button type="button" onClick={() => trim(0, -0.1)}>
            end -0.1s
          </button>
          <button type="button" onClick={() => trim(0, 0.1)}>
            end +0.1s
          </button>
          <button type="button" onClick={() => trim(-0.5, 0)}>
            add 0.5s head
          </button>
          <button type="button" onClick={() => trim(0, 0.5)}>
            add 0.5s tail
          </button>
        </div>

        <label className="field-label" htmlFor="select-note">
          Notes
        </label>
        <textarea
          id="select-note"
          value={select.note ?? ""}
          placeholder="内容判断、情绪、上下文、剪辑备注"
          onChange={(event) => onUpdate(select.id, { note: event.target.value })}
        />

        <label className="field-label" htmlFor="reject-reason">
          Reject reason
        </label>
        <input
          id="reject-reason"
          value={select.rejectReason ?? ""}
          placeholder="不采用的原因"
          onChange={(event) => onUpdate(select.id, { rejectReason: event.target.value })}
        />
      </div>

      <footer className="select-inspector-actions">
        <button type="button" onClick={() => onPlay(select)}>
          <Play size={14} />
          播放 Select
        </button>
        <button type="button" onClick={markReviewed}>
          <CheckCircle2 size={14} />
          Mark reviewed
        </button>
        <button
          type="button"
          onClick={() => onAddToPaper(select.id)}
          disabled={select.status === "rejected" || inPaper}
          title={select.status === "rejected" ? "Rejected selects 需要先恢复状态" : undefined}
        >
          <RotateCcw size={14} />
          {inPaper ? "已在 Paper Edit" : "加入 Paper Edit"}
        </button>
      </footer>
    </section>
  );
}
