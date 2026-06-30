import { GripVertical, MessageSquareText, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Asset, Highlight, PaperEditGroup, Speaker } from "../types/transcript";
import { formatShortTime } from "../utils/timecode";

type PaperEditBoardProps = {
  groups: PaperEditGroup[];
  highlights: Highlight[];
  speakers: Speaker[];
  assets: Asset[];
  onMove: (highlightId: string, targetGroupId: string, targetIndex?: number) => void;
  onRemove: (highlightId: string) => void;
  onSeek: (highlight: Highlight) => void;
  onNoteChange: (highlightId: string, note: string) => void;
};

export function PaperEditBoard({
  groups,
  highlights,
  speakers,
  assets,
  onMove,
  onRemove,
  onSeek,
  onNoteChange
}: PaperEditBoardProps) {
  const [draggingId, setDraggingId] = useState<string>();
  const [noteId, setNoteId] = useState<string>();
  const [noteDraft, setNoteDraft] = useState("");

  const highlightMap = useMemo(() => new Map(highlights.map((highlight) => [highlight.id, highlight])), [highlights]);
  const speakerMap = useMemo(() => new Map(speakers.map((speaker) => [speaker.id, speaker.name])), [speakers]);
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset.fileName])), [assets]);

  return (
    <section className="paper-board">
      <div className="board-header">
        <div>
          <span className="pane-title">纸编辑板</span>
          <span className="board-count">{highlights.length} 个可用片段</span>
        </div>
      </div>
      <div className="board-groups">
        {groups.map((group) => (
          <div
            key={group.id}
            className="board-group"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggingId) onMove(draggingId, group.id);
              setDraggingId(undefined);
            }}
          >
            <div className="group-title">{group.title}</div>
            <div className="group-items">
              {group.highlightIds.length === 0 ? (
                <div className="drop-hint">拖入片段</div>
              ) : (
                group.highlightIds.map((highlightId, index) => {
                  const highlight = highlightMap.get(highlightId);
                  if (!highlight) return null;
                  const speaker = highlight.speakerId ? speakerMap.get(highlight.speakerId) : "";
                  return (
                    <article
                      key={highlight.id}
                      className="paper-card"
                      draggable
                      onDragStart={() => setDraggingId(highlight.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggingId) onMove(draggingId, group.id, index);
                        setDraggingId(undefined);
                      }}
                    >
                      <div className="paper-card-top">
                        <GripVertical size={15} />
                        <span>{formatShortTime(highlight.start)} - {formatShortTime(highlight.end)}</span>
                      </div>
                      <p>{highlight.text.slice(0, 58)}{highlight.text.length > 58 ? "..." : ""}</p>
                      <div className="paper-meta">
                        <span>{speaker || "未命名"}</span>
                        <span>{assetMap.get(highlight.assetId) ?? "未知素材"}</span>
                      </div>
                      {noteId === highlight.id ? (
                        <div className="note-editor">
                          <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                          <button
                            type="button"
                            onClick={() => {
                              onNoteChange(highlight.id, noteDraft);
                              setNoteId(undefined);
                            }}
                          >
                            保存备注
                          </button>
                        </div>
                      ) : highlight.note ? (
                        <div className="paper-note">{highlight.note}</div>
                      ) : null}
                      <div className="paper-actions">
                        <button type="button" onClick={() => onSeek(highlight)} title="预览">
                          <Play size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNoteId(highlight.id);
                            setNoteDraft(highlight.note ?? "");
                          }}
                          title="备注"
                        >
                          <MessageSquareText size={14} />
                        </button>
                        <select value={group.id} onChange={(event) => onMove(highlight.id, event.target.value)}>
                          {groups.map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.title}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => onRemove(highlight.id)} title="移除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
