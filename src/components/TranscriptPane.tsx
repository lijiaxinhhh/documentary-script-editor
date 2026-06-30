import { Check, Highlighter, KeyRound, Pencil, Play, Plus, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Highlight, Speaker, TranscriptSegment } from "../types/transcript";
import { formatShortTime } from "../utils/timecode";

type TranscriptPaneProps = {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  activeSegmentId?: string;
  query: string;
  highlights: Highlight[];
  paperHighlightIds: Set<string>;
  onSeek: (segmentId: string, start: number) => void;
  onEditSegment: (segmentId: string, text: string) => void;
  onRenameSpeaker: (speakerId: string, name: string) => void;
  onHighlight: (segmentId: string) => void;
  onHighlightText: (segmentId: string, text: string) => void;
  onAddToPaper: (segmentId: string) => void;
  onAddTextToPaper: (segmentId: string, text: string) => void;
  onOpenTranscription: () => void;
};

export function TranscriptPane({
  segments,
  speakers,
  activeSegmentId,
  query,
  highlights,
  paperHighlightIds,
  onSeek,
  onEditSegment,
  onRenameSpeaker,
  onHighlight,
  onHighlightText,
  onAddToPaper,
  onAddTextToPaper,
  onOpenTranscription
}: TranscriptPaneProps) {
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState("");
  const activeRef = useRef<HTMLDivElement | null>(null);

  const speakerMap = useMemo(() => new Map(speakers.map((speaker) => [speaker.id, speaker.name])), [speakers]);
  const highlightedSegments = useMemo(
    () => new Set(highlights.map((highlight) => highlight.segmentId)),
    [highlights]
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSegmentId]);

  return (
    <section className="transcript-pane">
      <header className="transcript-pane-header">
        <div>
          <span className="pane-title">逐字稿</span>
          <span className="pane-count">{segments.length} 段</span>
          {segments.length > 0 && <span className="pane-hint">选中文字后可高亮或入稿</span>}
        </div>
        <button type="button" onClick={onOpenTranscription} title="视频转文字与 Key 设置">
          <KeyRound size={14} />
          转写设置
        </button>
      </header>
      <div className="segments-list">
        {segments.length === 0 ? (
          <div className="empty-state large transcript-empty">
            <p>还没有逐字稿。</p>
            <strong>先转写，才能像编辑文字一样剪视频。</strong>
            <button type="button" className="empty-primary-action" onClick={onOpenTranscription}>
              <KeyRound size={16} />
              开始转写 / 输入 Key
            </button>
            <span>也可以导入已有转写 JSON 或载入样例稿。</span>
          </div>
        ) : (
          segments.map((segment) => {
            const speakerName = segment.speakerId ? speakerMap.get(segment.speakerId) ?? segment.speakerId : "未命名";
            const isActive = segment.id === activeSegmentId;
            const isHighlighted = highlightedSegments.has(segment.id);
            const segmentHighlightIds = highlights
              .filter((highlight) => highlight.segmentId === segment.id)
              .map((highlight) => highlight.id);
            const inPaper = segmentHighlightIds.some((highlightId) => paperHighlightIds.has(highlightId));
            return (
              <article
                key={segment.id}
                ref={isActive ? activeRef : undefined}
                className={`segment-card ${isActive ? "active" : ""} ${isHighlighted ? "highlighted" : ""}`}
              >
                <button
                  type="button"
                  className="segment-time"
                  onClick={() => onSeek(segment.id, segment.start)}
                  title="跳到这句话"
                >
                  {formatShortTime(segment.start)} - {formatShortTime(segment.end)}
                </button>
                <button
                  type="button"
                  className="speaker-pill"
                  onClick={() => {
                    if (!segment.speakerId) return;
                    const next = window.prompt("发言人名称", speakerName);
                    if (next?.trim()) onRenameSpeaker(segment.speakerId, next.trim());
                  }}
                  title="改发言人"
                >
                  <UserRound size={14} />
                  {speakerName}
                </button>
                {editingId === segment.id ? (
                  <div className="segment-editor">
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
                    <div className="segment-actions">
                      <button
                        type="button"
                        onClick={() => {
                          onEditSegment(segment.id, draft.trim() || segment.text);
                          setEditingId(undefined);
                        }}
                      >
                        <Check size={15} />
                        保存
                      </button>
                      <button type="button" onClick={() => setEditingId(undefined)}>
                        <X size={15} />
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="segment-text" onClick={() => onSeek(segment.id, segment.start)}>
                    {markQuery(segment.text, query)}
                  </p>
                )}
                <div className="segment-actions">
                  <button type="button" onClick={() => onSeek(segment.id, segment.start)} title="播放">
                    <Play size={15} />
                    播放
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(segment.id);
                      setDraft(segment.text);
                    }}
                    title="改文字"
                  >
                    <Pencil size={15} />
                    改稿
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = getSelectedTextInsideSegment(segment.text);
                      if (selected) onHighlightText(segment.id, selected);
                      else onHighlight(segment.id);
                    }}
                    title="高亮选中文字或整段"
                  >
                    <Highlighter size={15} />
                    {isHighlighted ? "已高亮" : "高亮"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = getSelectedTextInsideSegment(segment.text);
                      if (selected) onAddTextToPaper(segment.id, selected);
                      else onAddToPaper(segment.id);
                    }}
                    title="把选中文字或整段加入故事版"
                  >
                    <Plus size={15} />
                    {inPaper ? "已入稿" : "入稿"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function getSelectedTextInsideSegment(segmentText: string) {
  const selected = window.getSelection()?.toString().trim();
  if (!selected) return "";
  return segmentText.includes(selected) ? selected : "";
}

function markQuery(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}
