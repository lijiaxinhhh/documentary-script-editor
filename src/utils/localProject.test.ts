import { describe, expect, it } from "vitest";
import type { FeedbackPayload } from "../types/feedback";
import type { Project, StoryNote } from "../types/transcript";
import {
  buildLocalProjectFile,
  exportFeedbackCsv,
  exportFeedbackJson,
  feedbackExportSchema,
  localProjectSchema,
  restoreLocalProjectFile
} from "./localProject";

const project: Project = {
  id: "local-project",
  name: "人物纪录片",
  assets: [
    {
      id: "asset-1",
      fileName: "interview.mov",
      objectUrl: "blob:http://local-video",
      duration: 42,
      mediaWarning: "文件名不一致",
      mediaError: "视频无法读取"
    }
  ],
  speakers: [{ id: "spk-1", name: "人物 A" }],
  segments: [
    {
      id: "seg-1",
      assetId: "asset-1",
      speakerId: "spk-1",
      start: 1,
      end: 3,
      text: "我第一次意识到问题是在那个晚上。"
    }
  ],
  highlights: [
    {
      id: "hl-1",
      segmentId: "seg-1",
      assetId: "asset-1",
      speakerId: "spk-1",
      start: 1,
      end: 3,
      text: "我第一次意识到问题是在那个晚上。",
      tags: ["opening"]
    }
  ],
  paperEdit: [{ id: "opening", title: "开场", highlightIds: ["hl-1"] }]
};

const notes: StoryNote[] = [
  { id: "note-1", groupId: "opening", kind: "comment", text: "这里可以用作片头主题句。", color: "yellow" },
  {
    id: "image-1",
    groupId: "opening",
    kind: "image",
    text: "童年照片",
    color: "blue",
    fileName: "childhood.jpg",
    objectUrl: "blob:http://local-image"
  }
];

describe("local project files", () => {
  it("builds a restorable project file without browser-only object URLs", () => {
    const file = buildLocalProjectFile(project, notes, "2026-06-26T08:00:00.000Z");

    expect(file.schema).toBe(localProjectSchema);
    expect(file.project.assets[0].fileName).toBe("interview.mov");
    expect(file.project.assets[0].objectUrl).toBeUndefined();
    expect(file.project.assets[0].mediaWarning).toBeUndefined();
    expect(file.project.assets[0].mediaError).toBeUndefined();
    expect(file.storyNotes[0].text).toContain("片头");
    expect(file.storyNotes[1].kind).toBe("image");
    expect(file.storyNotes[1].fileName).toBe("childhood.jpg");
    expect(file.storyNotes[1].objectUrl).toBeUndefined();
  });

  it("restores project data and relinks matching in-session video object URLs", () => {
    const file = buildLocalProjectFile(project, notes);
    const restored = restoreLocalProjectFile(file, project);

    expect(restored.project.name).toBe("人物纪录片");
    expect(restored.project.highlights[0].id).toBe("hl-1");
    expect(restored.project.assets[0].objectUrl).toBe("blob:http://local-video");
    expect(restored.storyNotes[0].groupId).toBe("opening");
    expect(restored.storyNotes[1].kind).toBe("image");
    expect(restored.storyNotes[1].fileName).toBe("childhood.jpg");
    expect(restored.storyNotes[1].objectUrl).toBeUndefined();
  });
});

describe("feedback export", () => {
  const feedback: FeedbackPayload[] = [
    {
      role: "剪辑师",
      workflow: "先转写，再做纸剪辑",
      painPoint: "导出到 PR 时，素材需要重新链接",
      idealOutput: "PR XML, FCPXML",
      contact: "editor@example.com",
      createdAt: "2026-06-26T08:00:00.000Z"
    }
  ];

  it("exports feedback as schema-marked JSON", () => {
    const parsed = JSON.parse(exportFeedbackJson(feedback, "2026-06-26T09:00:00.000Z"));

    expect(parsed.schema).toBe(feedbackExportSchema);
    expect(parsed.feedback[0].role).toBe("剪辑师");
  });

  it("exports feedback as CSV with escaped values", () => {
    const csv = exportFeedbackCsv(feedback);

    expect(csv).toContain("role,workflow,painPoint,idealOutput,contact,createdAt");
    expect(csv).toContain("\"PR XML, FCPXML\"");
    expect(csv).toContain("editor@example.com");
  });
});
