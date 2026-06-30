import type { Highlight, Project, TranscriptSegment } from "../types/transcript";
import { formatDisplayTime, formatSrtTime } from "./timecode";

export function downloadTextFile(fileName: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportSrt(project: Project, assetId?: string): string {
  const segments = project.segments
    .filter((segment) => !assetId || segment.assetId === assetId)
    .sort((a, b) => a.start - b.start);

  return segments
    .map((segment, index) => {
      const speaker = speakerName(project, segment.speakerId);
      const text = speaker ? `${speaker}：${segment.text}` : segment.text;
      return `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${text}`;
    })
    .join("\n\n");
}

export function exportPaperEditMarkdown(project: Project): string {
  const highlightMap = new Map(project.highlights.map((highlight) => [highlight.id, highlight]));
  const assetMap = new Map(project.assets.map((asset) => [asset.id, asset]));
  const lines: string[] = [`# 纸编辑：${project.name}`, ""];

  project.paperEdit.forEach((group) => {
    lines.push(`## ${group.title}`, "");
    if (group.highlightIds.length === 0) {
      lines.push("_暂无片段_", "");
      return;
    }

    group.highlightIds.forEach((highlightId) => {
      const highlight = highlightMap.get(highlightId);
      if (!highlight) return;
      const speaker = speakerName(project, highlight.speakerId) || "未命名发言人";
      const asset = assetMap.get(highlight.assetId);
      lines.push(
        `### ${formatDisplayTime(highlight.start)} - ${formatDisplayTime(highlight.end)} | ${speaker} | ${
          asset?.fileName ?? "未知素材"
        }`,
        "",
        highlight.text,
        ""
      );
      if (highlight.note) {
        lines.push(`备注：${highlight.note}`, "");
      }
    });
  });

  return lines.join("\n");
}

export function exportShotLogCsv(project: Project): string {
  const header = ["file", "start", "end", "speaker", "text", "summary", "tags", "rating", "notes"];
  const assetMap = new Map(project.assets.map((asset) => [asset.id, asset]));
  const rows = project.segments
    .slice()
    .sort((a, b) => a.assetId.localeCompare(b.assetId) || a.start - b.start)
    .map((segment) => {
      const highlight = project.highlights.find((item) => item.segmentId === segment.id);
      return [
        assetMap.get(segment.assetId)?.fileName ?? "",
        formatDisplayTime(segment.start),
        formatDisplayTime(segment.end),
        speakerName(project, segment.speakerId),
        segment.text,
        "",
        highlight?.tags.join("|") ?? "",
        "",
        highlight?.note ?? ""
      ];
    });

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function segmentToHighlight(project: Project, segment: TranscriptSegment): Highlight {
  return {
    id: `hl_${segment.id}`,
    segmentId: segment.id,
    assetId: segment.assetId,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    speakerId: segment.speakerId,
    tags: []
  };
}

export function speakerName(project: Project, speakerId?: string): string {
  if (!speakerId) return "";
  return project.speakers.find((speaker) => speaker.id === speakerId)?.name ?? speakerId;
}

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
