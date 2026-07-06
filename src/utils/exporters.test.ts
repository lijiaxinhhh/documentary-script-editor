import { describe, expect, it } from "vitest";
import type { Project } from "../types/transcript";
import { exportPaperEditMarkdown, exportSrt, exportShotLogCsv } from "./exporters";
import { exportDaVinciEdl, exportFinalCutFcpxml, exportNleRelinkGuide, exportPremiereFcp7Xml } from "./nleExporters";

const project: Project = {
  id: "test-project",
  name: "测试纪录片",
  assets: [{ id: "asset-1", fileName: "interview one.mov", duration: 90 }],
  speakers: [{ id: "spk-1", name: "受访者甲" }],
  segments: [
    {
      id: "seg-1",
      assetId: "asset-1",
      speakerId: "spk-1",
      start: 1,
      end: 4.5,
      text: "这里是第一段关键表达。"
    },
    {
      id: "seg-2",
      assetId: "asset-1",
      speakerId: "spk-1",
      start: 6,
      end: 8,
      text: "这里是第二段。"
    }
  ],
  highlights: [
    {
      id: "hl-seg-1",
      segmentId: "seg-1",
      assetId: "asset-1",
      speakerId: "spk-1",
      start: 1,
      end: 4.5,
      text: "这里是第一段关键表达。",
      tags: ["opening"],
      note: "适合片头",
      status: "used",
      timingSource: "manual",
      reviewed: true
    }
  ],
  paperEdit: [{ id: "opening", title: "开场", highlightIds: ["hl-seg-1"] }]
};

describe("documentary exports", () => {
  it("exports speaker-aware SRT in timeline order", () => {
    const srt = exportSrt(project, "asset-1");

    expect(srt).toContain("1\n00:00:01,000 --> 00:00:04,500");
    expect(srt).toContain("受访者甲：这里是第一段关键表达。");
    expect(srt.indexOf("第一段")).toBeLessThan(srt.indexOf("第二段"));
  });

  it("exports paper edit markdown and shot log context", () => {
    const markdown = exportPaperEditMarkdown(project);
    const csv = exportShotLogCsv(project);

    expect(markdown).toContain("# 纸编辑：测试纪录片");
    expect(markdown).toContain("## 开场");
    expect(markdown).toContain("备注：适合片头");
    expect(csv).toContain("interview one.mov");
    expect(csv).toContain("opening");
  });

  it("exports rough-cut interchange files for editing software", () => {
    const fcpxml = exportFinalCutFcpxml(project);
    const premiereXml = exportPremiereFcp7Xml(project);
    const edl = exportDaVinciEdl(project);

    expect(fcpxml).toContain("<asset-clip");
    expect(fcpxml).toContain("测试纪录片 rough cut");
    expect(premiereXml).toContain("<xmeml version=\"4\">");
    expect(premiereXml).toContain("<clipitem id=\"video-1\">");
    expect(edl).toContain("TITLE: 测试纪录片");
    expect(edl).toContain("* FROM CLIP NAME: interview one.mov");
  });

  it("exports a relink guide for editing software handoff", () => {
    const guide = exportNleRelinkGuide(project);

    expect(guide).toContain("剪辑软件导入说明");
    expect(guide).toContain("Final Cut Pro");
    expect(guide).toContain("Premiere Pro");
    expect(guide).toContain("DaVinci Resolve");
    expect(guide).toContain("interview one.mov");
  });
});
