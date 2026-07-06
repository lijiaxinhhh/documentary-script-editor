import type { Project, StoryNote } from "../types/transcript";
import type { FeedbackPayload } from "../types/feedback";
import { normalizeSelect } from "./selects";

export const localProjectSchema = "documentary-script-editor.local-project";
export const feedbackExportSchema = "documentary-script-editor.feedback";

export type LocalProjectFile = {
  schema: typeof localProjectSchema;
  version: 1;
  savedAt: string;
  project: Project;
  storyNotes: StoryNote[];
};

export function buildLocalProjectFile(project: Project, storyNotes: StoryNote[], savedAt = new Date().toISOString()): LocalProjectFile {
  return {
    schema: localProjectSchema,
    version: 1,
    savedAt,
    project: {
      ...project,
      assets: project.assets.map(({ objectUrl: _objectUrl, mediaWarning: _mediaWarning, mediaError: _mediaError, ...asset }) => asset)
    },
    storyNotes: storyNotes.map(({ objectUrl: _objectUrl, ...note }) => note)
  };
}

export function restoreLocalProjectFile(raw: unknown, currentProject: Project): { project: Project; storyNotes: StoryNote[] } {
  if (!isRecord(raw) || raw.schema !== localProjectSchema || !isRecord(raw.project)) {
    throw new Error("Not a local project file");
  }

  const project = raw.project;
  const currentAssets = Array.isArray(currentProject.assets) ? currentProject.assets : [];
  const restored: Project = {
    id: stringValue(project.id, "local-project"),
    name: stringValue(project.name, "未命名纪录片项目"),
    assets: arrayValue(project.assets).map((asset, index) => {
      const id = stringValue(asset.id, `asset_${index + 1}`);
      const fileName = stringValue(asset.fileName, `${id}.mp4`);
      const existing = currentAssets.find((item) => item.id === id || item.fileName === fileName);
      return {
        id,
        fileName,
        duration: numberOrUndefined(asset.duration),
        language: typeof asset.language === "string" ? asset.language : undefined,
        objectUrl: existing?.objectUrl,
        linkedFileName: typeof asset.linkedFileName === "string" ? asset.linkedFileName : undefined
      };
    }),
    speakers: arrayValue(project.speakers).map((speaker, index) => ({
      id: stringValue(speaker.id, `speaker_${index + 1}`),
      name: stringValue(speaker.name, `发言人 ${index + 1}`)
    })),
    segments: arrayValue(project.segments).map((segment, index) => ({
      id: stringValue(segment.id, `seg_${index + 1}`),
      assetId: stringValue(segment.assetId, "asset_1"),
      speakerId: typeof segment.speakerId === "string" ? segment.speakerId : undefined,
      start: numberValue(segment.start, 0),
      end: numberValue(segment.end, numberValue(segment.start, 0)),
      text: stringValue(segment.text, ""),
      words: Array.isArray(segment.words) ? segment.words : undefined
    })),
    highlights: [],
    paperEdit: arrayValue(project.paperEdit).map((group, index) => ({
      id: stringValue(group.id, `group_${index + 1}`),
      title: stringValue(group.title, `段落 ${index + 1}`),
      highlightIds: Array.isArray(group.highlightIds) ? group.highlightIds.map((id) => String(id)) : []
    }))
  };
  const segmentMap = new Map(restored.segments.map((segment) => [segment.id, segment]));
  restored.highlights = arrayValue(project.highlights).map((highlight, index) =>
    normalizeSelect(
      {
        ...highlight,
        id: stringValue(highlight.id, `highlight_${index + 1}`),
        segmentId: stringValue(highlight.segmentId, ""),
        assetId: stringValue(highlight.assetId, ""),
        start: numberValue(highlight.start, 0),
        end: numberValue(highlight.end, numberValue(highlight.start, 0)),
        text: stringValue(highlight.text, ""),
        speakerId: typeof highlight.speakerId === "string" ? highlight.speakerId : undefined,
        tags: Array.isArray(highlight.tags) ? highlight.tags.map((tag) => String(tag)) : [],
        note: typeof highlight.note === "string" ? highlight.note : undefined
      },
      segmentMap.get(stringValue(highlight.segmentId, ""))
    )
  );

  const storyNotes = arrayValue(raw.storyNotes).map((note, index) => ({
    id: stringValue(note.id, `note_${index + 1}`),
    groupId: stringValue(note.groupId, restored.paperEdit[0]?.id ?? "inbox"),
    text: stringValue(note.text, ""),
    color: note.color === "blue" || note.color === "green" || note.color === "white" ? note.color : "yellow",
    kind: note.kind === "image" || note.kind === "comment" ? note.kind : "note",
    fileName: typeof note.fileName === "string" ? note.fileName : undefined
  })) satisfies StoryNote[];

  return { project: restored, storyNotes };
}

export function exportFeedbackJson(feedback: FeedbackPayload[], exportedAt = new Date().toISOString()): string {
  return JSON.stringify(
    {
      schema: feedbackExportSchema,
      version: 1,
      exportedAt,
      feedback
    },
    null,
    2
  );
}

export function exportFeedbackCsv(feedback: FeedbackPayload[]): string {
  const header = ["role", "workflow", "painPoint", "idealOutput", "contact", "createdAt"];
  const rows = feedback.map((item) => [
    item.role,
    item.workflow,
    item.painPoint,
    item.idealOutput,
    item.contact,
    item.createdAt
  ]);
  return [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function csvValue(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
