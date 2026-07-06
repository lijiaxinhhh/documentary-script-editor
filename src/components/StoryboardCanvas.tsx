import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Columns3,
  GripVertical,
  Highlighter,
  ImagePlus,
  MessageSquareText,
  Minus,
  Play,
  Plus,
  StickyNote,
  Trash2,
  Video
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Highlight, PaperEditGroup, Speaker, StoryNote } from "../types/transcript";
import { storyboardTemplates } from "../data/storyboardTemplates";
import { formatShortTime } from "../utils/timecode";

type StoryboardCanvasProps = {
  groups: PaperEditGroup[];
  highlights: Highlight[];
  notes: StoryNote[];
  speakers: Speaker[];
  assets: Asset[];
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onMoveHighlight: (highlightId: string, targetGroupId: string, targetIndex?: number) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onSeek: (highlight: Highlight) => void;
  onHighlightNoteChange: (highlightId: string, note: string) => void;
  onAddNote: (groupId: string) => void;
  onAddComment: (groupId: string) => void;
  onAddImage: (groupId: string, file: File) => void;
  onEditNote: (noteId: string, text: string) => void;
  onRelinkImage: (noteId: string, file: File) => void;
  onMoveNote: (noteId: string, targetGroupId: string) => void;
  onRemoveNote: (noteId: string) => void;
  onApplyTemplate: (templateId: string) => void;
};

export function StoryboardCanvas({
  groups,
  highlights,
  notes,
  speakers,
  assets,
  onAddGroup,
  onRenameGroup,
  onMoveHighlight,
  onRemoveHighlight,
  onSeek,
  onHighlightNoteChange,
  onAddNote,
  onAddComment,
  onAddImage,
  onEditNote,
  onRelinkImage,
  onMoveNote,
  onRemoveNote,
  onApplyTemplate
}: StoryboardCanvasProps) {
  const [draggingId, setDraggingId] = useState<string>();
  const [zoom, setZoom] = useState(0.84);
  const [noteId, setNoteId] = useState<string>();
  const [noteDraft, setNoteDraft] = useState("");
  const [imageTarget, setImageTarget] = useState<{ groupId?: string; noteId?: string }>();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const highlightMap = useMemo(() => new Map(highlights.map((highlight) => [highlight.id, highlight])), [highlights]);
  const speakerMap = useMemo(() => new Map(speakers.map((speaker) => [speaker.id, speaker.name])), [speakers]);
  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const unsortedCount = groups.find((group) => group.id === "inbox")?.highlightIds.length ?? 0;
  const groupIds = useMemo(() => new Set(groups.map((group) => group.id)), [groups]);
  const totalDuration = highlights.reduce((total, highlight) => total + Math.max(0, highlight.end - highlight.start), 0);

  function requestImage(groupId: string) {
    setImageTarget({ groupId });
    imageInputRef.current?.click();
  }

  function requestImageRelink(noteId: string) {
    setImageTarget({ noteId });
    imageInputRef.current?.click();
  }

  function findGroupIdForHighlight(highlightId: string) {
    return groups.find((group) => group.highlightIds.includes(highlightId))?.id;
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    setDraggingId(undefined);
    if (!overId || activeId === overId) return;

    const targetGroupId = groupIds.has(overId) ? overId : findGroupIdForHighlight(overId);
    if (!targetGroupId) return;
    const targetGroup = groups.find((group) => group.id === targetGroupId);
    const targetIndex = targetGroup?.highlightIds.indexOf(overId);
    onMoveHighlight(activeId, targetGroupId, targetIndex !== undefined && targetIndex >= 0 ? targetIndex : undefined);
  }

  return (
    <section className="storyboard-shell">
      <div className="story-toolbar" aria-label="Paper Edit 工具栏">
        <button type="button" title="便签" onClick={() => onAddNote(groups[0]?.id ?? "inbox")}>
          <StickyNote size={18} />
          <span>便签</span>
        </button>
        <button type="button" title="栏目" onClick={onAddGroup}>
          <Columns3 size={18} />
          <span>栏目</span>
        </button>
        <button type="button" title="即将支持直接添加片段" disabled>
          <Video size={18} />
          <span>Select</span>
        </button>
        <button type="button" title="添加图片资料卡" onClick={() => requestImage(groups[0]?.id ?? "inbox")}>
          <ImagePlus size={18} />
          <span>图片</span>
        </button>
        <button type="button" title="添加注释卡" onClick={() => onAddComment(groups[0]?.id ?? "inbox")}>
          <MessageSquareText size={18} />
          <span>注释</span>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(undefined)}
      >
        <div className="storyboard-panel">
          <div className="storyboard-header">
            <div>
              <span className="pane-title">Paper Edit</span>
              <span className="board-count">{highlights.length} 个 Select · {notes.length} 张便签</span>
              <span className="board-count">Assembly 约 {formatShortTime(totalDuration)}</span>
            </div>
            <div className="story-controls">
              <select
                aria-label="Paper Edit 模板"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) onApplyTemplate(event.target.value);
                  event.target.value = "";
                }}
              >
                <option value="">选择结构模板</option>
                {storyboardTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <span>{unsortedCount} Unsorted Selects</span>
              <button type="button" onClick={() => setZoom((value) => Math.max(0.68, value - 0.08))} title="缩小">
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(1.12, value + 0.08))} title="放大">
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="story-canvas">
            <div className="story-lane" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              {groups.map((group, groupIndex) => {
                const groupNotes = notes.filter((note) => note.groupId === group.id);
                return (
                  <StoryColumn
                    key={group.id}
                    group={group}
                    groupIndex={groupIndex}
                    groupNotes={groupNotes}
                    highlights={highlightMap}
                    speakers={speakerMap}
                    assets={assetMap}
                    groups={groups}
                    draggingId={draggingId}
                    onAddNote={onAddNote}
                    onAddComment={onAddComment}
                    onAddImage={requestImage}
                    onRenameGroup={onRenameGroup}
                    onSeek={onSeek}
                    onMoveHighlight={onMoveHighlight}
                    onRemoveHighlight={onRemoveHighlight}
                    onEditNote={onEditNote}
                    onRelinkImage={requestImageRelink}
                    onMoveNote={onMoveNote}
                    onRemoveNote={onRemoveNote}
                    onPrepareNote={(highlight) => {
                      setNoteId(highlight.id);
                      setNoteDraft(highlight.note ?? "");
                    }}
                  />
                );
              })}
              <button type="button" className="add-column-card" onClick={onAddGroup}>
                <Plus size={18} />
                新增结构段
              </button>
            </div>
          </div>
        </div>
      </DndContext>

      {noteId && (
        <div className="story-note-popover">
          <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} autoFocus />
          <button
            type="button"
            onClick={() => {
              onHighlightNoteChange(noteId, noteDraft);
              setNoteId(undefined);
            }}
          >
            保存备注
          </button>
        </div>
      )}
      <input
        ref={imageInputRef}
        className="hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && imageTarget?.noteId) onRelinkImage(imageTarget.noteId, file);
          if (file && imageTarget?.groupId) onAddImage(imageTarget.groupId, file);
          event.target.value = "";
          setImageTarget(undefined);
        }}
      />
    </section>
  );
}

type StoryColumnProps = {
  group: PaperEditGroup;
  groupIndex: number;
  groupNotes: StoryNote[];
  highlights: Map<string, Highlight>;
  speakers: Map<string, string>;
  assets: Map<string, Asset>;
  groups: PaperEditGroup[];
  draggingId?: string;
  onAddNote: (groupId: string) => void;
  onAddComment: (groupId: string) => void;
  onAddImage: (groupId: string) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onSeek: (highlight: Highlight) => void;
  onMoveHighlight: (highlightId: string, targetGroupId: string, targetIndex?: number) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onEditNote: (noteId: string, text: string) => void;
  onRelinkImage: (noteId: string) => void;
  onMoveNote: (noteId: string, targetGroupId: string) => void;
  onRemoveNote: (noteId: string) => void;
  onPrepareNote: (highlight: Highlight) => void;
};

function StoryColumn({
  group,
  groupIndex,
  groupNotes,
  highlights,
  speakers,
  assets,
  groups,
  draggingId,
  onAddNote,
  onAddComment,
  onAddImage,
  onRenameGroup,
  onSeek,
  onMoveHighlight,
  onRemoveHighlight,
  onEditNote,
  onRelinkImage,
  onMoveNote,
  onRemoveNote,
  onPrepareNote
}: StoryColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: group.id });
  const groupDuration = group.highlightIds.reduce((total, highlightId) => {
    const highlight = highlights.get(highlightId);
    return total + (highlight ? Math.max(0, highlight.end - highlight.start) : 0);
  }, 0);

  return (
    <div ref={setNodeRef} className={`story-column ${isOver ? "drag-over" : ""}`}>
      <div className="story-column-top">
        <button
          type="button"
          className="story-title-button"
          onClick={() => {
            const title = window.prompt("结构段名称", group.title);
            if (title?.trim()) onRenameGroup(group.id, title.trim());
          }}
        >
          {groupIndex + 1}. {group.title}
        </button>
        <span>{group.highlightIds.length + groupNotes.length} 张卡片 · {formatShortTime(groupDuration)}</span>
      </div>

      <div className="story-column-actions">
        <button type="button" onClick={() => onAddNote(group.id)}>
          <StickyNote size={14} />
          便签
        </button>
        <button type="button" onClick={() => onAddImage(group.id)}>
          <ImagePlus size={14} />
          图片
        </button>
        <button type="button" onClick={() => onAddComment(group.id)}>
          <MessageSquareText size={14} />
          注释
        </button>
      </div>

      <SortableContext items={group.highlightIds} strategy={verticalListSortingStrategy}>
        <div className="story-items">
          {group.highlightIds.map((highlightId, index) => {
            const highlight = highlights.get(highlightId);
            if (!highlight) return null;
            const asset = assets.get(highlight.assetId);
            const speaker = highlight.speakerId ? speakers.get(highlight.speakerId) : "";
            return (
              <VideoStoryCard
                key={highlight.id}
                highlight={highlight}
                asset={asset}
                speaker={speaker}
                groups={groups}
                currentGroupId={group.id}
                onSeek={() => onSeek(highlight)}
                onMove={(targetGroupId) => onMoveHighlight(highlight.id, targetGroupId)}
                onRemove={() => onRemoveHighlight(highlight.id)}
                onNote={() => onPrepareNote(highlight)}
              />
            );
          })}

          {groupNotes.map((note) => (
            <article key={note.id} className={`story-note ${note.color} ${note.kind ?? "note"}`}>
              <div className="story-note-top">
                {note.kind === "image" ? (
                  <ImagePlus size={14} />
                ) : note.kind === "comment" ? (
                  <MessageSquareText size={14} />
                ) : (
                  <Highlighter size={14} />
                )}
                <select value={note.groupId} onChange={(event) => onMoveNote(note.id, event.target.value)}>
                  {groups.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.title}
                    </option>
                  ))}
                </select>
              </div>
              {note.kind === "image" && (
                <button type="button" className="story-image-frame" onClick={() => onRelinkImage(note.id)}>
                  {note.objectUrl ? (
                    <img src={note.objectUrl} alt={note.text || note.fileName || "故事版图片"} />
                  ) : (
                    <span>
                      <ImagePlus size={20} />
                      重新关联图片
                    </span>
                  )}
                </button>
              )}
              {note.kind === "image" && note.fileName && <small className="story-note-file">{note.fileName}</small>}
              <p
                onClick={() => {
                  const next = window.prompt(note.kind === "comment" ? "注释内容" : note.kind === "image" ? "图片说明" : "便签内容", note.text);
                  if (next !== null) onEditNote(note.id, next);
                }}
              >
                {note.text}
              </p>
              <button type="button" onClick={() => onRemoveNote(note.id)} title="删除便签">
                <Trash2 size={14} />
              </button>
            </article>
          ))}

          {group.highlightIds.length === 0 && groupNotes.length === 0 && (
            <div className={`drop-hint ${draggingId ? "drop-hint-active" : ""}`}>拖入 Select 或便签</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

type VideoStoryCardProps = {
  highlight: Highlight;
  asset?: Asset;
  speaker?: string;
  groups: PaperEditGroup[];
  currentGroupId: string;
  onSeek: () => void;
  onMove: (groupId: string) => void;
  onRemove: () => void;
  onNote: () => void;
};

function VideoStoryCard({
  highlight,
  asset,
  speaker,
  groups,
  currentGroupId,
  onSeek,
  onMove,
  onRemove,
  onNote
}: VideoStoryCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: highlight.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !asset?.objectUrl) return;
    const seek = () => {
      try {
        video.currentTime = highlight.start;
      } catch {
        // Some browsers reject early seeks before metadata is ready.
      }
    };
    if (video.readyState >= 1) seek();
    video.addEventListener("loadedmetadata", seek);
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [asset?.objectUrl, highlight.start]);

  return (
    <article
      ref={setNodeRef}
      className={`story-video-card ${isDragging ? "dragging" : ""}`}
      style={style}
    >
      <div className="story-card-media" onClick={onSeek}>
        {asset?.objectUrl ? (
          <video ref={videoRef} src={asset.objectUrl} muted playsInline preload="metadata" />
        ) : (
          <div className="story-video-placeholder">
            <Video size={22} />
          </div>
        )}
        <button type="button" className="story-play" onClick={onSeek} title="预览 Select">
          <Play size={15} />
        </button>
      </div>
      <div className="story-card-body">
        <div className="story-card-topline story-card-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
          <span>{formatShortTime(highlight.start)} - {formatShortTime(highlight.end)}</span>
        </div>
        <strong>{speaker || "未命名发言人"}</strong>
        <p>{highlight.text}</p>
        <div className="story-card-badges">
          <small>{highlight.status}</small>
          <small>{highlight.timingSource}</small>
        </div>
        {highlight.note && <div className="paper-note">{highlight.note}</div>}
      </div>
      <div className="paper-actions">
        <button type="button" onClick={onSeek} title="预览">
          <Play size={14} />
        </button>
        <button type="button" onClick={onNote} title="备注">
          <MessageSquareText size={14} />
        </button>
        <select value={currentGroupId} onChange={(event) => onMove(event.target.value)}>
          {groups.map((target) => (
            <option key={target.id} value={target.id}>
              {target.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRemove} title="移除">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}
