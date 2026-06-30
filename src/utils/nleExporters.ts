import type { Asset, Highlight, Project } from "../types/transcript";

const FPS = 30;
const FCP_FRAME_DURATION = "100/3000s";

type TimelineClip = {
  index: number;
  highlight: Highlight;
  asset: Asset;
  sourceIn: number;
  sourceOut: number;
  duration: number;
  timelineIn: number;
  timelineOut: number;
};

export function exportFinalCutFcpxml(project: Project): string {
  return exportFcpxml(project, "1.10");
}

export function exportJianyingFcpxml(project: Project): string {
  return exportFcpxml(project, "1.9");
}

export function exportPremiereFcp7Xml(project: Project): string {
  const clips = timelineClips(project);
  const duration = Math.max(totalFrames(clips), 1);
  const videoClips = clips.map((clip) => fcp7ClipItem(project, clip, "video")).join("\n");
  const audioClips = clips.map((clip) => fcp7ClipItem(project, clip, "audio")).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>${xml(project.name)}_rough_cut</name>
    <duration>${duration}</duration>
    ${fcp7Rate()}
    <timecode>
      ${fcp7Rate(3)}
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            ${fcp7Rate(6)}
            <width>1920</width>
            <height>1080</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
            <colordepth>24</colordepth>
          </samplecharacteristics>
        </format>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
${videoClips}
        </track>
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            ${fcp7Rate(6)}
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
${audioClips}
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>
`;
}

export function exportDaVinciEdl(project: Project): string {
  const clips = timelineClips(project);
  const lines = [`TITLE: ${project.name}`, "FCM: NON-DROP FRAME", ""];

  clips.forEach((clip) => {
    const reel = sanitizeReelName(clip.asset.fileName);
    lines.push(
      `${String(clip.index).padStart(3, "0")}  ${reel.padEnd(8, " ").slice(0, 8)} V     C        ${framesToTc(
        clip.sourceIn
      )} ${framesToTc(clip.sourceOut)} ${framesToTc(clip.timelineIn)} ${framesToTc(clip.timelineOut)}`,
      `* FROM CLIP NAME: ${clip.asset.fileName}`,
      `* COMMENT: ${clip.highlight.text}`,
      ""
    );
  });

  return lines.join("\n");
}

export function exportNleRelinkGuide(project: Project): string {
  const assets = project.assets.length ? project.assets : [{ id: "offline", fileName: "offline-media.mov" }];
  const highlights = project.paperEdit.flatMap((group) => group.highlightIds).length
    ? project.paperEdit.flatMap((group) =>
        group.highlightIds
          .map((highlightId) => project.highlights.find((highlight) => highlight.id === highlightId))
          .filter(Boolean)
      )
    : project.highlights;
  const duration = highlights.reduce((total, highlight) => total + Math.max(0, (highlight?.end ?? 0) - (highlight?.start ?? 0)), 0);

  return [
    `# ${project.name} - 剪辑软件导入说明`,
    "",
    "## 这个压缩包/导出组里应该包含",
    "",
    "- 本地项目 JSON：回到这个网站继续编辑。",
    "- SRT：字幕或文本参考。",
    "- Markdown / CSV：纸剪辑和场记表。",
    "- FCPXML / XML / EDL：给 Final Cut、Premiere、DaVinci、剪映尝试导入的粗剪交换文件。",
    "",
    "## 素材重新链接原则",
    "",
    "浏览器不能读取并保存你电脑上的真实绝对路径，所以工程文件里的素材路径使用文件名占位。导入剪辑软件后，请在软件里重新链接到下列原始素材：",
    "",
    ...assets.map((asset, index) => `${index + 1}. ${asset.fileName}${asset.linkedFileName ? `（当前关联：${asset.linkedFileName}）` : ""}`),
    "",
    "## 推荐导入顺序",
    "",
    "1. Final Cut Pro：优先尝试 `_final_cut.fcpxml`。",
    "2. DaVinci Resolve：优先尝试 `_davinci.fcpxml`，不行再试 `_davinci.edl`。",
    "3. Premiere Pro：尝试 `_premiere_fcp7.xml`。",
    "4. 剪映 / CapCut：尝试 `_jianying_experimental.fcpxml`，这一路径仍是实验格式。",
    "",
    "## 当前粗剪统计",
    "",
    `- 视频片段：${project.highlights.length}`,
    `- 故事版栏目：${project.paperEdit.length}`,
    `- 粗剪时长约：${formatGuideDuration(duration)}`,
    "",
    "## 导入后请人工确认",
    "",
    "- 时间码是否和网站里的选段一致。",
    "- 是否所有素材都已重新链接。",
    "- 是否有音频缺失、画幅不对或离线媒体。",
    "- 如果某个软件导入失败，请换用另一个交换格式，并记录失败提示。"
  ].join("\n");
}

function exportFcpxml(project: Project, version: string): string {
  const clips = timelineClips(project);
  const assets = uniqueAssets(clips);
  const duration = Math.max(totalFrames(clips), 1);
  const assetResources = assets
    .map(
      (asset, index) => `    <asset id="asset-${index + 1}" name="${xml(asset.fileName)}" start="0s" duration="${fcpxTime(
        secondsToFrames(asset.duration || maxSourceEnd(clips, asset.id) || 3600)
      )}" hasVideo="1" hasAudio="1" format="format-1">
      <media-rep kind="original-media" src="${xml(fileUrl(asset.fileName))}"/>
    </asset>`
    )
    .join("\n");
  const assetIds = new Map(assets.map((asset, index) => [asset.id, `asset-${index + 1}`]));
  const spine = clips
    .map((clip) => {
      const speaker = clip.highlight.speakerId
        ? project.speakers.find((item) => item.id === clip.highlight.speakerId)?.name
        : "";
      const name = `${speaker ? `${speaker} - ` : ""}${clip.highlight.text.slice(0, 42)}`;
      return `            <asset-clip name="${xml(name)}" ref="${assetIds.get(clip.asset.id)}" offset="${fcpxTime(
        clip.timelineIn
      )}" start="${fcpxTime(clip.sourceIn)}" duration="${fcpxTime(clip.duration)}"/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="${version}">
  <resources>
    <format id="format-1" name="FFVideoFormat1080p30" frameDuration="${FCP_FRAME_DURATION}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
${assetResources}
  </resources>
  <library>
    <event name="${xml(project.name)}">
      <project name="${xml(project.name)} rough cut">
        <sequence format="format-1" duration="${fcpxTime(duration)}" tcStart="0s" tcFormat="NDF">
          <spine>
${spine}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}

function timelineClips(project: Project): TimelineClip[] {
  const highlightMap = new Map(project.highlights.map((highlight) => [highlight.id, highlight]));
  const assetMap = new Map(project.assets.map((asset) => [asset.id, asset]));
  const ordered = project.paperEdit.flatMap((group) => group.highlightIds).map((id) => highlightMap.get(id));
  const highlights = (ordered.filter(Boolean) as Highlight[]).length
    ? (ordered.filter(Boolean) as Highlight[])
    : project.highlights.slice().sort((a, b) => a.start - b.start);

  let timelineIn = 0;
  return highlights
    .map((highlight, index) => {
      const asset = assetMap.get(highlight.assetId) ?? {
        id: highlight.assetId,
        fileName: "offline-media.mov"
      };
      const sourceIn = secondsToFrames(highlight.start);
      const sourceOut = Math.max(secondsToFrames(highlight.end), sourceIn + 1);
      const duration = sourceOut - sourceIn;
      const clip: TimelineClip = {
        index: index + 1,
        highlight,
        asset,
        sourceIn,
        sourceOut,
        duration,
        timelineIn,
        timelineOut: timelineIn + duration
      };
      timelineIn += duration;
      return clip;
    });
}

function fcp7ClipItem(project: Project, clip: TimelineClip, mediaType: "video" | "audio"): string {
  const clipId = `${mediaType}-${clip.index}`;
  const fileId = `${mediaType}-file-${clip.index}`;
  const sourceDuration = Math.max(secondsToFrames(clip.asset.duration || 0), clip.sourceOut, clip.duration);
  const audioInfo =
    mediaType === "audio"
      ? `
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>`
      : `
            <sourcetrack>
              <mediatype>video</mediatype>
            </sourcetrack>`;
  const mediaBlock =
    mediaType === "audio"
      ? `<audio>
                <samplecharacteristics>
                  ${fcp7Rate(9)}
                  <depth>16</depth>
                  <samplerate>48000</samplerate>
                </samplecharacteristics>
                <channelcount>2</channelcount>
              </audio>`
      : `<video>
                <samplecharacteristics>
                  ${fcp7Rate(9)}
                  <width>1920</width>
                  <height>1080</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                  <colordepth>24</colordepth>
                </samplecharacteristics>
              </video>`;
  const speaker = clip.highlight.speakerId
    ? project.speakers.find((item) => item.id === clip.highlight.speakerId)?.name
    : "";

  return `          <clipitem id="${clipId}">
            <name>${xml(`${speaker ? `${speaker} - ` : ""}${clip.asset.fileName}`)}</name>
            ${fcp7Rate(6)}
            <duration>${sourceDuration}</duration>
            <start>${clip.timelineIn}</start>
            <end>${clip.timelineOut}</end>
            <in>${clip.sourceIn}</in>
            <out>${clip.sourceOut}</out>
            <enabled>TRUE</enabled>
            <masterclipid>master-${clip.index}</masterclipid>
            <file id="${fileId}">
              <name>${xml(clip.asset.fileName)}</name>
              ${fcp7Rate(7)}
              <duration>${sourceDuration}</duration>
              <pathurl>${xml(fileUrl(clip.asset.fileName))}</pathurl>
              <media>
                ${mediaBlock}
              </media>
            </file>${audioInfo}
          </clipitem>`;
}

function uniqueAssets(clips: TimelineClip[]): Asset[] {
  const assets = new Map<string, Asset>();
  clips.forEach((clip) => assets.set(clip.asset.id, clip.asset));
  return [...assets.values()];
}

function maxSourceEnd(clips: TimelineClip[], assetId: string): number {
  return Math.max(0, ...clips.filter((clip) => clip.asset.id === assetId).map((clip) => clip.highlight.end));
}

function totalFrames(clips: TimelineClip[]): number {
  return clips.reduce((total, clip) => Math.max(total, clip.timelineOut), 0);
}

function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

function fcpxTime(frames: number): string {
  return `${frames * 100}/3000s`;
}

function framesToTc(frames: number): string {
  const safeFrames = Math.max(0, frames);
  const hours = Math.floor(safeFrames / (FPS * 3600));
  const minutes = Math.floor((safeFrames % (FPS * 3600)) / (FPS * 60));
  const seconds = Math.floor((safeFrames % (FPS * 60)) / FPS);
  const frame = safeFrames % FPS;
  return [hours, minutes, seconds, frame].map((part) => String(part).padStart(2, "0")).join(":");
}

function fileUrl(fileName: string): string {
  return `file://localhost/${encodeURI(fileName)}`;
}

function sanitizeReelName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase() || "AX";
}

function fcp7Rate(indent = 4): string {
  const pad = " ".repeat(indent);
  return `<rate>
${pad}  <timebase>${FPS}</timebase>
${pad}  <ntsc>FALSE</ntsc>
${pad}</rate>`;
}

function xml(value: string | number | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatGuideDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
