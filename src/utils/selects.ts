import type { Highlight, Project, SelectStatus, TimingSource, TranscriptSegment } from "../types/transcript";

export const selectStatuses: SelectStatus[] = ["selected", "maybe", "needs-review", "used", "rejected"];

export function normalizeSelect(highlight: Partial<Highlight>, segment?: TranscriptSegment): Highlight {
  const start = numberValue(highlight.start, segment?.start ?? 0);
  const end = Math.max(start + 0.05, numberValue(highlight.end, segment?.end ?? start + 0.05));
  const text = stringValue(highlight.text, segment?.text ?? "");
  const status = normalizeStatus(highlight.status);
  const timingSource = normalizeTimingSource(highlight.timingSource, highlight.createdFromTextSelection);
  const reviewed =
    typeof highlight.reviewed === "boolean"
      ? highlight.reviewed
      : timingSource === "segment-estimate"
        ? false
        : true;

  return {
    id: stringValue(highlight.id, `hl_${segment?.id ?? Date.now()}`),
    segmentId: stringValue(highlight.segmentId, segment?.id ?? ""),
    assetId: stringValue(highlight.assetId, segment?.assetId ?? ""),
    start,
    end,
    text,
    speakerId: typeof highlight.speakerId === "string" ? highlight.speakerId : segment?.speakerId,
    tags: Array.isArray(highlight.tags) ? highlight.tags.map((tag) => String(tag)) : [],
    note: typeof highlight.note === "string" ? highlight.note : undefined,
    status,
    timingSource,
    reviewed,
    rating: normalizeRating(highlight.rating),
    rejectReason: typeof highlight.rejectReason === "string" ? highlight.rejectReason : undefined,
    createdFromTextSelection: Boolean(highlight.createdFromTextSelection),
    inPadding: numberOrUndefined(highlight.inPadding),
    outPadding: numberOrUndefined(highlight.outPadding),
    originalStart: numberOrUndefined(highlight.originalStart) ?? start,
    originalEnd: numberOrUndefined(highlight.originalEnd) ?? end
  };
}

export function normalizeProjectSelects(project: Project): Project {
  const segmentMap = new Map(project.segments.map((segment) => [segment.id, segment]));
  const highlights = project.highlights.map((highlight) => normalizeSelect(highlight, segmentMap.get(highlight.segmentId)));
  const highlightIds = new Set(highlights.map((highlight) => highlight.id));
  return {
    ...project,
    highlights,
    paperEdit: project.paperEdit.map((group) => ({
      ...group,
      highlightIds: group.highlightIds.filter((id) => highlightIds.has(id))
    }))
  };
}

export function selectDuration(highlight: Highlight): number {
  return Math.max(0, highlight.end - highlight.start);
}

export function isRejected(highlight: Highlight | undefined): boolean {
  return highlight?.status === "rejected";
}

export function canEnterPaperEdit(highlight: Highlight | undefined): boolean {
  return Boolean(highlight && highlight.status !== "rejected");
}

export function isExportableSelect(highlight: Highlight | undefined): highlight is Highlight {
  return Boolean(highlight && highlight.status !== "rejected");
}

export function statusLabel(status: SelectStatus): string {
  return {
    selected: "Selected",
    maybe: "Maybe",
    rejected: "Rejected",
    used: "Used",
    "needs-review": "Needs review"
  }[status];
}

export function statusDescription(status: SelectStatus): string {
  return {
    selected: "可进入 Paper Edit 的候选选段",
    maybe: "先留作备选，不急着进入结构",
    rejected: "明确排除，默认不会入结构或导出",
    used: "已进入 Paper Edit",
    "needs-review": "时间码由文字比例估算，需要人工复核"
  }[status];
}

export function timingSourceLabel(source: TimingSource): string {
  return {
    word: "word timing",
    "segment-estimate": "estimated timing",
    manual: "manual timing"
  }[source];
}

function normalizeStatus(value: unknown): SelectStatus {
  return value === "maybe" || value === "rejected" || value === "used" || value === "needs-review"
    ? value
    : "selected";
}

function normalizeTimingSource(value: unknown, createdFromTextSelection?: unknown): TimingSource {
  if (value === "word" || value === "manual" || value === "segment-estimate") return value;
  return createdFromTextSelection ? "segment-estimate" : "segment-estimate";
}

function normalizeRating(value: unknown): Highlight["rating"] {
  const rating = Number(value);
  return rating === 1 || rating === 2 || rating === 3 || rating === 4 || rating === 5 ? rating : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
