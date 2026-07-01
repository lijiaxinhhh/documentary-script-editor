import {
  Ban,
  Check,
  FileVideo2,
  Highlighter,
  KeyRound,
  MessageSquarePlus,
  Pencil,
  Play,
  Plus,
  Scissors,
  Tag,
  Upload,
  UserRound,
  X
} from "lucide-react";
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
  onVideoFile?: (file: File) => void;
  onLoadDemo?: () => void;
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
  onOpenTranscription,
  onVideoFile,
  onLoadDemo
}: TranscriptPaneProps) {
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [selectionToolbar, setSelectionToolbar] = useState<{
    segmentId: string;
    start: number;
    text: string;
    x: number;
    y: number;
  }>();
  const [mutedSegmentIds, setMutedSegmentIds] = useState<Set<string>>(() => new Set());
  const activeRef = useRef<HTMLDivElement | null>(null);
  const paneRef = useRef<HTMLElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const speakerMap = useMemo(() => new Map(speakers.map((speaker) => [speaker.id, speaker.name])), [speakers]);
  const highlightedSegments = useMemo(
    () => new Set(highlights.map((highlight) => highlight.segmentId)),
    [highlights]
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSegmentId]);

  function clearSelectionToolbar() {
    setSelectionToolbar(undefined);
    window.getSelection()?.removeAllRanges();
  }

  function handleSelection(segment: TranscriptSegment) {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() ?? "";
      if (!selectedText || !segment.text.includes(selectedText) || !selection?.rangeCount) {
        setSelectionToolbar(undefined);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const paneRect = paneRef.current?.getBoundingClientRect();
      setSelectionToolbar({
        segmentId: segment.id,
        start: segment.start,
        text: selectedText,
        x: Math.max(18, rect.left + rect.width / 2 - (paneRect?.left ?? 0)),
        y: Math.max(54, rect.top - (paneRect?.top ?? 0) - 46)
      });
    }, 0);
  }

  function makeClipFromSelection() {
    if (!selectionToolbar) return;
    onHighlightText(selectionToolbar.segmentId, selectionToolbar.text);
    onAddTextToPaper(selectionToolbar.segmentId, selectionToolbar.text);
    clearSelectionToolbar();
  }

  return (
    <section className="transcript-pane" ref={paneRef}>
      <header className="transcript-pane-header">
        <div>
          <span className="pane-title">逐字稿</span>
          <span className="pane-count">{segments.length} 段</span>
          {segments.length > 0 && <span className="pane-hint">选中文字，生成可剪视频片段</span>}
        </div>
        <button type="button" onClick={onOpenTranscription} title="视频转文字与 Key 设置">
          <KeyRound size={14} />
          转写预检
        </button>
      </header>
      <div className="segments-list">
        {segments.length === 0 ? (
          <div className="empty-state large transcript-empty">
            <strong>导入本地视频，生成可剪的逐字稿。</strong>
            <p>点击文字跳视频，选择文字生成粗剪片段，再整理故事结构。</p>
            <div className="empty-actions">
              <button type="button" className="empty-primary-action" onClick={() => importInputRef.current?.click()}>
                <FileVideo2 size={16} />
                导入本地视频
              </button>
              <button type="button" onClick={onLoadDemo}>
                <Upload size={16} />
                载入样例项目
              </button>
            </div>
            <span>模型和本机执行层会在“转写预检”里设置。</span>
            <input
              ref={importInputRef}
              className="hidden-input"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && onVideoFile) onVideoFile(file);
                event.target.value = "";
              }}
            />
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
            const isMuted = mutedSegmentIds.has(segment.id);
            return (
              <article
                key={segment.id}
                ref={isActive ? activeRef : undefined}
                className={`segment-card ${isActive ? "active" : ""} ${isHighlighted ? "highlighted" : ""} ${isMuted ? "muted" : ""}`}
              >
                <div className="segment-meta-row">
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
                  <span className="asset-source">原素材片段</span>
                </div>
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
                  <p
                    className="segment-text"
                    onClick={() => onSeek(segment.id, segment.start)}
                    onMouseUp={() => handleSelection(segment)}
                    onKeyUp={() => handleSelection(segment)}
                  >
                    {markQuery(segment.text, query)}
                  </p>
                )}
                <div className="segment-actions segment-quick-actions">
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
      {selectionToolbar && (
        <div
          className="selection-toolbar"
          style={{ left: selectionToolbar.x, top: selectionToolbar.y }}
          role="toolbar"
          aria-label="选中文字工具栏"
        >
          <button type="button" onClick={() => onSeek(selectionToolbar.segmentId, selectionToolbar.start)}>
            <Play size={14} />
            播放
          </button>
          <button type="button" className="toolbar-primary" onClick={makeClipFromSelection}>
            <Scissors size={14} />
            设为片段
          </button>
          <button
            type="button"
            onClick={() => {
              setMutedSegmentIds((current) => new Set([...current, selectionToolbar.segmentId]));
              clearSelectionToolbar();
            }}
          >
            <Ban size={14} />
            跳过
          </button>
          <button
            type="button"
            onClick={() => {
              onHighlightText(selectionToolbar.segmentId, selectionToolbar.text);
              clearSelectionToolbar();
            }}
          >
            <Tag size={14} />
            打标签
          </button>
          <button
            type="button"
            onClick={() => {
              onAddTextToPaper(selectionToolbar.segmentId, selectionToolbar.text);
              clearSelectionToolbar();
            }}
          >
            <MessageSquarePlus size={14} />
            加入故事
          </button>
        </div>
      )}
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
