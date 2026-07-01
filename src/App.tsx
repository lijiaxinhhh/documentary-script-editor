import { useEffect, useMemo, useRef, useState } from "react";
import { AssetSidebar } from "./components/AssetSidebar";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { StoryboardCanvas } from "./components/StoryboardCanvas";
import { TopBar, type ExportType } from "./components/TopBar";
import { TranscriptionPanel, type TranscriptionSettings } from "./components/TranscriptionPanel";
import { TranscriptPane } from "./components/TranscriptPane";
import { VideoPane } from "./components/VideoPane";
import { WorkflowCallout } from "./components/WorkflowCallout";
import { defaultGroups, demoProject } from "./data/demoTranscript";
import { storyboardTemplates } from "./data/storyboardTemplates";
import type { FeedbackPayload } from "./types/feedback";
import type { TranscriptionJob } from "./types/transcriptionJob";
import type { Asset, FilterMode, Highlight, Project, SearchResult, StoryNote, TranscriptSegment } from "./types/transcript";
import { downloadTextFile, exportPaperEditMarkdown, exportShotLogCsv, exportSrt, segmentToHighlight, speakerName } from "./utils/exporters";
import { buildLocalProjectFile, exportFeedbackCsv, exportFeedbackJson, localProjectSchema, restoreLocalProjectFile } from "./utils/localProject";
import { exportDaVinciEdl, exportFinalCutFcpxml, exportJianyingFcpxml, exportNleRelinkGuide, exportPremiereFcp7Xml } from "./utils/nleExporters";

const emptyProject: Project = {
  id: "local-project",
  name: "未命名纪录片项目",
  assets: [],
  speakers: [],
  segments: [],
  highlights: [],
  paperEdit: defaultGroups.map((group) => ({ ...group, highlightIds: [] }))
};

const defaultTranscriptionSettings: TranscriptionSettings = {
  provider: "qwen-aliyun",
  apiKey: "",
  bridgeUrl: "http://127.0.0.1:8787",
  language: "zh",
  speakerDiarization: true,
  wordTimestamps: true,
  fillerCleanup: false,
  hotwords: ""
};

const transcriptionStorageKey = "documentary-script-editor.transcription-settings";
const feedbackStorageKey = "documentary-script-editor.feedback";
const recentProjectStorageKey = "documentary-script-editor.recent-project";
const transcriptionJobsStorageKey = "documentary-script-editor.transcription-jobs";

const transcriptionProviderNames: Record<TranscriptionSettings["provider"], string> = {
  "local-whisper": "本地 Whisper",
  "local-funasr": "本地 FunASR",
  "qwen-aliyun": "通义",
  openai: "OpenAI",
  deepgram: "Deepgram"
};

type BridgeSegment = {
  start: number;
  end: number;
  text: string;
  speakerId?: string;
  words?: Array<{ start: number; end: number; text: string }>;
};

export default function App() {
  const [project, setProject] = useState<Project>(emptyProject);
  const [activeAssetId, setActiveAssetId] = useState<string>();
  const [currentTime, setCurrentTime] = useState(0);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [speakerFilter, setSpeakerFilter] = useState("");
  const [focusedSegmentId, setFocusedSegmentId] = useState<string>();
  const [transcriptionOpen, setTranscriptionOpen] = useState(false);
  const [transcriptionSaved, setTranscriptionSaved] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(() => readFeedbackItems().length);
  const [hasRecentProject, setHasRecentProject] = useState(() => Boolean(window.localStorage.getItem(recentProjectStorageKey)));
  const [transcriptionJobs, setTranscriptionJobs] = useState<TranscriptionJob[]>(() => readTranscriptionJobs());
  const [transcriptionSettings, setTranscriptionSettings] = useState<TranscriptionSettings>(() => {
    try {
      const saved = window.localStorage.getItem(transcriptionStorageKey);
      return saved ? { ...defaultTranscriptionSettings, ...JSON.parse(saved) } : defaultTranscriptionSettings;
    } catch {
      return defaultTranscriptionSettings;
    }
  });
  const [storyNotes, setStoryNotes] = useState<StoryNote[]>([
    {
      id: "note_story_intent",
      groupId: "opening",
      kind: "comment",
      color: "white",
      text: "主题不一定要直接说出来。让观众通过场景和人物行动感受到它。"
    },
    {
      id: "note_broll_pool",
      groupId: "background",
      kind: "note",
      color: "blue",
      text: "可用 B-roll：旧照片、工作空间细节、环境大全景。"
    }
  ]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeAsset = useMemo(
    () => project.assets.find((asset) => asset.id === activeAssetId) ?? project.assets[0],
    [activeAssetId, project.assets]
  );

  const paperHighlightIds = useMemo(
    () => new Set(project.paperEdit.flatMap((group) => group.highlightIds)),
    [project.paperEdit]
  );

  const activeSegments = useMemo(() => {
    const assetId = activeAsset?.id;
    const highlighted = new Set(project.highlights.map((highlight) => highlight.segmentId));
    const paperSegmentIds = new Set(
      project.highlights
        .filter((highlight) => paperHighlightIds.has(highlight.id))
        .map((highlight) => highlight.segmentId)
    );
    return project.segments
      .filter((segment) => !assetId || segment.assetId === assetId)
      .filter((segment) => {
        if (filterMode === "highlighted") return highlighted.has(segment.id);
        if (filterMode === "paper") return paperSegmentIds.has(segment.id);
        if (filterMode === "speaker" && speakerFilter) return segment.speakerId === speakerFilter;
        return true;
      })
      .sort((a, b) => a.start - b.start);
  }, [activeAsset?.id, filterMode, paperHighlightIds, project.highlights, project.segments, speakerFilter]);

  const activeAssetTranscriptCount = useMemo(
    () => project.segments.filter((segment) => segment.assetId === activeAsset?.id).length,
    [activeAsset?.id, project.segments]
  );
  const transcriptionReady = transcriptionSettings.provider.startsWith("local") || Boolean(transcriptionSettings.apiKey.trim());
  const transcriptionProviderLabel = transcriptionProviderNames[transcriptionSettings.provider];

  const currentSegment = useMemo(() => {
    const segments = project.segments
      .filter((segment) => segment.assetId === activeAsset?.id)
      .sort((a, b) => a.start - b.start);
    return segments.find((segment) => segment.start <= currentTime && currentTime < segment.end);
  }, [activeAsset?.id, currentTime, project.segments]);

  const activeSegmentId = focusedSegmentId ?? currentSegment?.id;

  const searchResults = useMemo<SearchResult[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return project.segments
      .filter((segment) => segment.assetId === activeAsset?.id)
      .filter((segment) => segment.text.toLowerCase().includes(trimmed))
      .map((segment) => ({
        segmentId: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        speakerName: speakerName(project, segment.speakerId) || "未命名"
      }));
  }, [activeAsset?.id, project, query]);

  function seekTo(segmentId: string, start: number) {
    setFocusedSegmentId(segmentId);
    const video = videoRef.current;
    if (video) {
      video.currentTime = start;
      void video.play().catch(() => undefined);
    }
    setCurrentTime(start);
  }

  function importVideo(file: File, targetAssetId?: string) {
    const objectUrl = URL.createObjectURL(file);
    setProject((current) => {
      const matchingAsset =
        (targetAssetId ? current.assets.find((asset) => asset.id === targetAssetId) : undefined) ??
        current.assets.find((asset) => asset.fileName === file.name) ??
        (current.assets.length === 1 && !current.assets[0].objectUrl ? current.assets[0] : undefined);
      const assetId = matchingAsset?.id ?? `asset_${Date.now()}`;
      const expectedFileName = matchingAsset?.fileName;
      const mediaWarning =
        targetAssetId && expectedFileName && expectedFileName !== file.name
          ? `文件名不一致：项目需要 ${expectedFileName}，当前关联 ${file.name}。`
          : undefined;
      const nextAsset: Asset = {
        id: assetId,
        fileName: matchingAsset?.fileName && matchingAsset.fileName !== "interview_01.mp4" ? matchingAsset.fileName : file.name,
        objectUrl,
        duration: matchingAsset?.duration,
        linkedFileName: file.name,
        mediaWarning,
        mediaError: undefined
      };
      const assets = matchingAsset
        ? current.assets.map((asset) => (asset.id === matchingAsset.id ? { ...asset, ...nextAsset } : asset))
        : [...current.assets, nextAsset];
      setActiveAssetId(assetId);
      return { ...current, assets };
    });
    if (!targetAssetId) setTranscriptionOpen(true);
  }

  function markMediaError(assetId: string) {
    setProject((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              mediaError: "视频无法读取。请确认文件格式正确，或重新关联同一条素材。"
            }
          : asset
      )
    }));
  }

  async function importJson(file: File) {
    try {
      const raw = JSON.parse(await file.text());
      if (raw?.schema === localProjectSchema) {
        const restored = restoreLocalProjectFile(raw, project);
        setProject(restored.project);
        setStoryNotes(restored.storyNotes);
        setActiveAssetId(restored.project.assets[0]?.id);
        setFocusedSegmentId(undefined);
        setCurrentTime(0);
        return;
      }
      const normalized = normalizeProject(raw, project);
      setProject(normalized);
      setActiveAssetId(normalized.assets[0]?.id);
      setFocusedSegmentId(undefined);
      setCurrentTime(0);
    } catch {
      window.alert("这个 JSON 无法识别。请导入包含 assets / speakers / segments 的逐字稿文件。");
    }
  }

  function loadDemoTranscript() {
    setProject((current) => ({
      ...demoProject,
      assets: demoProject.assets.map((asset) => {
        const existing = current.assets.find((item) => item.fileName === asset.fileName || item.id === asset.id);
        return existing?.objectUrl ? { ...asset, objectUrl: existing.objectUrl, duration: existing.duration } : asset;
      })
    }));
    setActiveAssetId("interview-01");
    setFocusedSegmentId(undefined);
    setCurrentTime(0);
  }

  function handleExport(type: ExportType) {
    const baseName = safeFileName(project.name);
    if (type === "project") {
      const projectFile = buildLocalProjectFile(project, storyNotes);
      downloadTextFile(`${baseName}_local_project.json`, JSON.stringify(projectFile, null, 2), "application/json;charset=utf-8");
    }
    if (type === "srt") {
      downloadTextFile(`${baseName}.srt`, exportSrt(project, activeAsset?.id), "text/plain;charset=utf-8");
    }
    if (type === "markdown") {
      downloadTextFile(`${baseName}_paper_edit.md`, exportPaperEditMarkdown(project), "text/markdown;charset=utf-8");
    }
    if (type === "csv") {
      downloadTextFile(`${baseName}_shot_log.csv`, exportShotLogCsv(project), "text/csv;charset=utf-8");
    }
    if (type === "finalcut") {
      downloadTextFile(`${baseName}_final_cut.fcpxml`, exportFinalCutFcpxml(project), "application/xml;charset=utf-8");
    }
    if (type === "premiere") {
      downloadTextFile(`${baseName}_premiere_fcp7.xml`, exportPremiereFcp7Xml(project), "application/xml;charset=utf-8");
    }
    if (type === "davinci") {
      downloadTextFile(`${baseName}_davinci.fcpxml`, exportFinalCutFcpxml(project), "application/xml;charset=utf-8");
    }
    if (type === "davinci-edl") {
      downloadTextFile(`${baseName}_davinci.edl`, exportDaVinciEdl(project), "text/plain;charset=utf-8");
    }
    if (type === "jianying") {
      downloadTextFile(`${baseName}_jianying_experimental.fcpxml`, exportJianyingFcpxml(project), "application/xml;charset=utf-8");
    }
    if (type === "nle-guide") {
      downloadTextFile(`${baseName}_nle_import_guide.md`, exportNleRelinkGuide(project), "text/markdown;charset=utf-8");
    }
  }

  function updateSegmentText(segmentId: string, text: string) {
    setProject((current) => ({
      ...current,
      segments: current.segments.map((segment) => (segment.id === segmentId ? { ...segment, text } : segment)),
      highlights: current.highlights.map((highlight) => {
        if (highlight.segmentId !== segmentId) return highlight;
        const previousSegment = current.segments.find((segment) => segment.id === segmentId);
        const isWholeSegmentHighlight = highlight.id === `hl_${segmentId}` || highlight.text === previousSegment?.text;
        return isWholeSegmentHighlight ? { ...highlight, text } : highlight;
      })
    }));
  }

  function renameSpeaker(speakerId: string, name: string) {
    setProject((current) => ({
      ...current,
      speakers: current.speakers.map((speaker) => (speaker.id === speakerId ? { ...speaker, name } : speaker))
    }));
  }

  function addHighlight(segmentId: string) {
    setProject((current) => ensureHighlight(current, segmentId).project);
  }

  function addTextHighlight(segmentId: string, text: string) {
    setProject((current) => addSelectionHighlight(current, segmentId, text).project);
  }

  function addToPaper(segmentId: string) {
    setProject((current) => {
      const ensured = ensureHighlight(current, segmentId);
      const highlightId = ensured.highlight.id;
      if (ensured.project.paperEdit.some((group) => group.highlightIds.includes(highlightId))) {
        return ensured.project;
      }
      return {
        ...ensured.project,
        paperEdit: ensured.project.paperEdit.map((group) =>
          group.id === "inbox" ? { ...group, highlightIds: [...group.highlightIds, highlightId] } : group
        )
      };
    });
  }

  function addTextToPaper(segmentId: string, text: string) {
    setProject((current) => {
      const ensured = addSelectionHighlight(current, segmentId, text);
      const highlightId = ensured.highlight.id;
      if (ensured.project.paperEdit.some((group) => group.highlightIds.includes(highlightId))) {
        return ensured.project;
      }
      return {
        ...ensured.project,
        paperEdit: ensured.project.paperEdit.map((group) =>
          group.id === "inbox" ? { ...group, highlightIds: [...group.highlightIds, highlightId] } : group
        )
      };
    });
  }

  function moveHighlight(highlightId: string, targetGroupId: string, targetIndex?: number) {
    setProject((current) => {
      const without = current.paperEdit.map((group) => ({
        ...group,
        highlightIds: group.highlightIds.filter((id) => id !== highlightId)
      }));
      return {
        ...current,
        paperEdit: without.map((group) => {
          if (group.id !== targetGroupId) return group;
          const next = group.highlightIds.slice();
          const index = typeof targetIndex === "number" ? targetIndex : next.length;
          next.splice(index, 0, highlightId);
          return { ...group, highlightIds: next };
        })
      };
    });
  }

  function removeFromPaper(highlightId: string) {
    setProject((current) => ({
      ...current,
      paperEdit: current.paperEdit.map((group) => ({
        ...group,
        highlightIds: group.highlightIds.filter((id) => id !== highlightId)
      }))
    }));
  }

  function updateHighlightNote(highlightId: string, note: string) {
    setProject((current) => ({
      ...current,
      highlights: current.highlights.map((highlight) =>
        highlight.id === highlightId ? { ...highlight, note } : highlight
      )
    }));
  }

  function addStoryNote(groupId: string) {
    const text = window.prompt("便签内容", "新的故事想法");
    if (!text?.trim()) return;
    const colors: StoryNote["color"][] = ["yellow", "blue", "green", "white"];
    setStoryNotes((current) => [
      ...current,
      {
        id: `note_${Date.now()}`,
        groupId,
        kind: "note",
        color: colors[current.length % colors.length],
        text: text.trim()
      }
    ]);
  }

  function addStoryComment(groupId: string) {
    const text = window.prompt("注释内容", "这里需要补充资料、转场或情绪说明");
    if (!text?.trim()) return;
    setStoryNotes((current) => [
      ...current,
      {
        id: `comment_${Date.now()}`,
        groupId,
        kind: "comment",
        color: "white",
        text: text.trim()
      }
    ]);
  }

  function addStoryImage(groupId: string, file: File) {
    const objectUrl = URL.createObjectURL(file);
    setStoryNotes((current) => [
      ...current,
      {
        id: `image_${Date.now()}`,
        groupId,
        kind: "image",
        color: "blue",
        fileName: file.name,
        objectUrl,
        text: file.name.replace(/\.[^.]+$/, "")
      }
    ]);
  }

  function relinkStoryImage(noteId: string, file: File) {
    const objectUrl = URL.createObjectURL(file);
    setStoryNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
              ...note,
              kind: "image",
              fileName: file.name,
              objectUrl,
              text: note.text || file.name.replace(/\.[^.]+$/, "")
            }
          : note
      )
    );
  }

  function addStoryGroup() {
    const title = window.prompt("栏目名称", "新故事段落");
    if (!title?.trim()) return;
    setProject((current) => ({
      ...current,
      paperEdit: [
        ...current.paperEdit,
        {
          id: `group_${Date.now()}`,
          title: title.trim(),
          highlightIds: []
        }
      ]
    }));
  }

  function renameStoryGroup(groupId: string, title: string) {
    setProject((current) => ({
      ...current,
      paperEdit: current.paperEdit.map((group) => (group.id === groupId ? { ...group, title } : group))
    }));
  }

  function applyStoryboardTemplate(templateId: string) {
    const template = storyboardTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const existingHighlightIds = project.paperEdit.flatMap((group) => group.highlightIds);
    const groups = template.groups.map((title, index) => ({
      id: `${template.id}_${index}`,
      title,
      highlightIds: index === 0 ? existingHighlightIds : []
    }));
    const notes = template.notes.map((note, index) => ({
      id: `note_${template.id}_${index}`,
      groupId: groups.find((group) => group.title === note.groupTitle)?.id ?? groups[0].id,
      text: note.text,
      color: note.color
    }));
    setProject((current) => ({ ...current, paperEdit: groups }));
    setStoryNotes(notes);
  }

  useEffect(() => {
    if (!transcriptionSaved) return;
    const timer = window.setTimeout(() => setTranscriptionSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [transcriptionSaved]);

  useEffect(() => {
    if (!feedbackSaved) return;
    const timer = window.setTimeout(() => setFeedbackSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [feedbackSaved]);

  useEffect(() => {
    if (!shouldAutosaveProject(project)) return;
    const timer = window.setTimeout(() => {
      const projectFile = buildLocalProjectFile(project, storyNotes);
      window.localStorage.setItem(recentProjectStorageKey, JSON.stringify(projectFile));
      setHasRecentProject(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project, storyNotes]);

  useEffect(() => {
    window.localStorage.setItem(transcriptionJobsStorageKey, JSON.stringify(transcriptionJobs));
  }, [transcriptionJobs]);

  function saveTranscriptionSettings() {
    window.localStorage.setItem(transcriptionStorageKey, JSON.stringify(transcriptionSettings));
    setTranscriptionSaved(true);
  }

  async function createTranscriptionJob() {
    if (!activeAsset) {
      return "请先导入或选择一个素材。";
    }
    if (!activeAsset.objectUrl) {
      return "这个项目只有逐字稿数据。请先关联本地视频，再创建转写任务。";
    }
    const requiresKey = !transcriptionSettings.provider.startsWith("local");
    if (requiresKey && !transcriptionSettings.apiKey.trim()) {
      return "这个模型需要先输入 API Key。";
    }

    saveTranscriptionSettings();
    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}`;
    const bridgeUrl = normalizeBridgeUrl(transcriptionSettings.bridgeUrl);
    const bridgeOnline = await checkTranscriptionBridge(bridgeUrl);
    const job: TranscriptionJob = {
      id: jobId,
      assetId: activeAsset.id,
      assetName: activeAsset.fileName,
      provider: transcriptionSettings.provider,
      language: transcriptionSettings.language,
      status: bridgeOnline ? "running" : "blocked",
      message: bridgeOnline
        ? "正在把素材发送到本机转写执行层。"
        : `本机转写执行层未连接。任务已保存；启动 ${bridgeUrl} 桥接服务后可重试。`,
      createdAt: now,
      updatedAt: now
    };
    setTranscriptionJobs((current) => [job, ...current].slice(0, 20));
    if (!bridgeOnline) return job.message;

    const result = await submitTranscriptionToBridge(activeAsset, transcriptionSettings);
    const updatedAt = new Date().toISOString();
    if (result.ok) {
      applyTranscriptionResult(activeAsset.id, result.segments);
      const message = `转写完成，生成 ${result.segments.length} 段逐字稿。`;
      setTranscriptionJobs((current) =>
        current.map((item) => (item.id === jobId ? { ...item, status: "done", message, updatedAt } : item))
      );
      return message;
    }

    const blocked = result.code === "ASR_RUNTIME_NOT_CONFIGURED";
    const message = result.message || "转写失败。";
    setTranscriptionJobs((current) =>
      current.map((item) =>
        item.id === jobId ? { ...item, status: blocked ? "blocked" : "failed", message, updatedAt } : item
      )
    );
    return message;
  }

  async function retryTranscriptionBridgeCheck(jobId: string) {
    const bridgeUrl = normalizeBridgeUrl(transcriptionSettings.bridgeUrl);
    const bridgeOnline = await checkTranscriptionBridge(bridgeUrl);
    const now = new Date().toISOString();
    setTranscriptionJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: bridgeOnline ? "queued" : "blocked",
              message: bridgeOnline
                ? "本机转写执行层已连接，任务已重新加入队列。"
                : `本机转写执行层仍未连接。请确认 ${bridgeUrl} 服务已启动。`,
              updatedAt: now
            }
          : job
      )
    );
  }

  function applyTranscriptionResult(assetId: string, segments: BridgeSegment[]) {
    const defaultSpeakerId = "spk_auto_asr";
    setProject((current) => {
      const speakerIds = new Set<string>();
      segments.forEach((segment) => {
        speakerIds.add(segment.speakerId ? asrSpeakerId(segment.speakerId) : defaultSpeakerId);
      });
      const newSpeakers = Array.from(speakerIds)
        .filter((speakerId) => !current.speakers.some((speaker) => speaker.id === speakerId))
        .map((speakerId) => ({
          id: speakerId,
          name: speakerId === defaultSpeakerId ? "自动转写" : `自动转写 ${speakerId.replace("spk_asr_", "")}`
        }));
      const nextSegments = segments.map((segment, index) => ({
        id: `asr_${assetId}_${index + 1}`,
        assetId,
        speakerId: segment.speakerId ? asrSpeakerId(segment.speakerId) : defaultSpeakerId,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        words: segment.words
      }));
      return {
        ...current,
        speakers: [...current.speakers, ...newSpeakers],
        segments: [...current.segments.filter((segment) => segment.assetId !== assetId), ...nextSegments],
        highlights: current.highlights.filter((highlight) => highlight.assetId !== assetId),
        paperEdit: current.paperEdit.map((group) => ({
          ...group,
          highlightIds: group.highlightIds.filter((highlightId) =>
            current.highlights.some((highlight) => highlight.id === highlightId && highlight.assetId !== assetId)
          )
        }))
      };
    });
  }

  function saveFeedback(payload: FeedbackPayload) {
    const feedbackItems = readFeedbackItems();
    window.localStorage.setItem(feedbackStorageKey, JSON.stringify([...feedbackItems, payload]));
    setFeedbackCount(feedbackItems.length + 1);
    setFeedbackSaved(true);
  }

  function exportStoredFeedback(format: "json" | "csv") {
    const feedbackItems = readFeedbackItems();
    if (feedbackItems.length === 0) {
      window.alert("还没有已保存的反馈。");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadTextFile(`documentary_editor_feedback_${stamp}.json`, exportFeedbackJson(feedbackItems), "application/json;charset=utf-8");
    } else {
      downloadTextFile(`documentary_editor_feedback_${stamp}.csv`, exportFeedbackCsv(feedbackItems), "text/csv;charset=utf-8");
    }
  }

  function restoreRecentProject() {
    try {
      const saved = window.localStorage.getItem(recentProjectStorageKey);
      if (!saved) {
        window.alert("还没有最近项目。");
        return;
      }
      const restored = restoreLocalProjectFile(JSON.parse(saved), project);
      setProject(restored.project);
      setStoryNotes(restored.storyNotes);
      setActiveAssetId(restored.project.assets[0]?.id);
      setFocusedSegmentId(undefined);
      setCurrentTime(0);
    } catch {
      window.alert("最近项目无法恢复。请改用导入本地项目 JSON。");
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        projectName={project.name}
        assetCount={project.assets.length}
        segmentCount={project.segments.length}
        highlightCount={project.highlights.length}
        storyGroupCount={project.paperEdit.length}
        transcriptionProviderLabel={transcriptionProviderLabel}
        transcriptionReady={transcriptionReady}
        hasRecentProject={hasRecentProject}
        onProjectNameChange={(name) => setProject((current) => ({ ...current, name }))}
        onVideoFile={importVideo}
        onJsonFile={importJson}
        onLoadDemo={loadDemoTranscript}
        onRestoreRecent={restoreRecentProject}
        onExport={handleExport}
        onOpenTranscription={() => setTranscriptionOpen(true)}
      />
      <TranscriptionPanel
        open={transcriptionOpen}
        asset={activeAsset}
        settings={transcriptionSettings}
        saved={transcriptionSaved}
        jobs={transcriptionJobs.filter((job) => !activeAsset || job.assetId === activeAsset.id)}
        onClose={() => setTranscriptionOpen(false)}
        onChange={setTranscriptionSettings}
        onSave={saveTranscriptionSettings}
        onCreateJob={createTranscriptionJob}
        onRetryJob={retryTranscriptionBridgeCheck}
      />
      <FeedbackPanel
        open={feedbackOpen}
        saved={feedbackSaved}
        feedbackCount={feedbackCount}
        onClose={() => setFeedbackOpen(false)}
        onSave={saveFeedback}
        onExportJson={() => exportStoredFeedback("json")}
        onExportCsv={() => exportStoredFeedback("csv")}
      />
      <main className="workspace">
        <WorkflowCallout
          asset={activeAsset}
          transcriptCount={activeAssetTranscriptCount}
          highlightCount={project.highlights.length}
          providerLabel={transcriptionProviderLabel}
          transcriptionReady={transcriptionReady}
          onVideoFile={importVideo}
          onLoadDemo={loadDemoTranscript}
          onOpenTranscription={() => setTranscriptionOpen(true)}
          onOpenFeedback={() => setFeedbackOpen(true)}
        />
        <AssetSidebar
          assets={project.assets}
          activeAssetId={activeAsset?.id}
          segments={project.segments}
          highlights={project.highlights}
          speakers={project.speakers}
        query={query}
          filterMode={filterMode}
          speakerFilter={speakerFilter}
          searchResults={searchResults}
          onAssetSelect={(assetId) => {
            setActiveAssetId(assetId);
            setFocusedSegmentId(undefined);
            setCurrentTime(0);
          }}
          onQueryChange={setQuery}
          onFilterChange={setFilterMode}
          onSpeakerFilterChange={setSpeakerFilter}
          onJump={seekTo}
          onOpenTranscription={() => setTranscriptionOpen(true)}
          onVideoFile={importVideo}
        />
        <TranscriptPane
          segments={activeSegments}
          speakers={project.speakers}
          activeSegmentId={activeSegmentId}
          query={query}
          highlights={project.highlights}
          paperHighlightIds={paperHighlightIds}
          onSeek={seekTo}
          onEditSegment={updateSegmentText}
          onRenameSpeaker={renameSpeaker}
          onHighlight={addHighlight}
          onHighlightText={addTextHighlight}
          onAddToPaper={addToPaper}
          onAddTextToPaper={addTextToPaper}
          onOpenTranscription={() => setTranscriptionOpen(true)}
        />
        <VideoPane
          asset={activeAsset}
          currentTime={currentTime}
          currentSegment={currentSegment}
          currentSpeakerName={speakerName(project, currentSegment?.speakerId)}
          transcriptCount={activeAssetTranscriptCount}
          videoRef={videoRef}
          onOpenTranscription={() => setTranscriptionOpen(true)}
          onVideoFile={importVideo}
          onMediaError={markMediaError}
          onTimeUpdate={(time) => {
            setCurrentTime(time);
            setFocusedSegmentId(undefined);
          }}
          onDuration={(duration) => {
            if (!activeAsset) return;
            setProject((current) => ({
              ...current,
              assets: current.assets.map((asset) =>
                asset.id === activeAsset.id
                  ? {
                      ...asset,
                      duration,
                      mediaError: undefined,
                      mediaWarning: mediaDurationWarning(asset.mediaWarning, asset.duration, duration)
                    }
                  : asset
              )
            }));
          }}
        />
      </main>
      <StoryboardCanvas
        groups={project.paperEdit}
        highlights={project.highlights}
        notes={storyNotes}
        speakers={project.speakers}
        assets={project.assets}
        onAddGroup={addStoryGroup}
        onRenameGroup={renameStoryGroup}
        onMoveHighlight={moveHighlight}
        onRemoveHighlight={removeFromPaper}
        onSeek={(highlight) => seekTo(highlight.segmentId, highlight.start)}
        onHighlightNoteChange={updateHighlightNote}
        onAddNote={addStoryNote}
        onAddComment={addStoryComment}
        onAddImage={addStoryImage}
        onEditNote={(noteId, text) =>
          setStoryNotes((current) => current.map((note) => (note.id === noteId ? { ...note, text } : note)))
        }
        onRelinkImage={relinkStoryImage}
        onMoveNote={(noteId, groupId) =>
          setStoryNotes((current) => current.map((note) => (note.id === noteId ? { ...note, groupId } : note)))
        }
        onRemoveNote={(noteId) => setStoryNotes((current) => current.filter((note) => note.id !== noteId))}
        onApplyTemplate={applyStoryboardTemplate}
      />
    </div>
  );
}

function ensureHighlight(project: Project, segmentId: string): { project: Project; highlight: Highlight } {
  const segment = project.segments.find((item) => item.id === segmentId);
  if (!segment) throw new Error(`Missing segment ${segmentId}`);
  const existing = project.highlights.find(
    (highlight) => highlight.id === `hl_${segmentId}` || (highlight.segmentId === segmentId && highlight.text === segment.text)
  );
  if (existing) return { project, highlight: existing };
  const highlight = segmentToHighlight(project, segment);
  return { project: { ...project, highlights: [...project.highlights, highlight] }, highlight };
}

function addSelectionHighlight(project: Project, segmentId: string, selectedText: string): { project: Project; highlight: Highlight } {
  const segment = project.segments.find((item) => item.id === segmentId);
  if (!segment) throw new Error(`Missing segment ${segmentId}`);
  const text = selectedText.trim();
  if (!text || text === segment.text) return ensureHighlight(project, segmentId);
  const existing = project.highlights.find((highlight) => highlight.segmentId === segmentId && highlight.text === text);
  if (existing) return { project, highlight: existing };
  const timing = estimateSelectionTiming(segment, text);
  const highlight: Highlight = {
    id: `hl_${segment.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    segmentId: segment.id,
    assetId: segment.assetId,
    start: timing.start,
    end: timing.end,
    text,
    speakerId: segment.speakerId,
    tags: ["text-selection"]
  };
  return { project: { ...project, highlights: [...project.highlights, highlight] }, highlight };
}

function estimateSelectionTiming(segment: TranscriptSegment, selectedText: string) {
  const startIndex = Math.max(0, segment.text.indexOf(selectedText));
  const endIndex = startIndex + selectedText.length;
  const duration = Math.max(0.1, segment.end - segment.start);

  if (segment.words?.length) {
    let cursor = 0;
    const overlapping = segment.words.filter((word) => {
      const wordIndex = segment.text.indexOf(word.text, cursor);
      if (wordIndex === -1) return false;
      cursor = wordIndex + word.text.length;
      const wordEnd = wordIndex + word.text.length;
      return wordIndex < endIndex && wordEnd > startIndex;
    });
    if (overlapping.length > 0) {
      return {
        start: overlapping[0].start,
        end: overlapping[overlapping.length - 1].end
      };
    }
  }

  const textLength = Math.max(1, segment.text.length);
  const startRatio = startIndex / textLength;
  const endRatio = Math.min(1, endIndex / textLength);
  return {
    start: segment.start + duration * startRatio,
    end: segment.start + duration * Math.max(endRatio, startRatio + 0.05)
  };
}

function normalizeProject(raw: any, current: Project): Project {
  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  const rawSegments = Array.isArray(raw.segments) ? raw.segments : [];
  const importedAssets = rawAssets.map((asset: any) => {
    const id = String(asset.id ?? asset.assetId ?? `asset_${asset.fileName ?? Date.now()}`);
    const existing = current.assets.find((item) => item.id === id || item.fileName === asset.fileName);
    return {
      id,
      fileName: String(asset.fileName ?? asset.filename ?? `${id}.mp4`),
      duration: Number(asset.duration ?? existing?.duration ?? 0),
      language: asset.language,
      objectUrl: existing?.objectUrl
    };
  });
  const fallbackAssetId = String(rawSegments[0]?.assetId ?? importedAssets[0]?.id ?? "asset_1");
  const assets = importedAssets.length
    ? importedAssets
    : rawSegments.length
      ? [
          {
            id: fallbackAssetId,
            fileName: String(raw.fileName ?? raw.filename ?? "imported_transcript.mp4"),
            duration: 0
          }
        ]
      : [];
  const speakers = (Array.isArray(raw.speakers) ? raw.speakers : []).map((speaker: any) => ({
    id: String(speaker.id ?? speaker.speakerId),
    name: String(speaker.name ?? speaker.label ?? speaker.speakerId ?? "未命名")
  }));
  const segments = rawSegments.map((segment: any, index: number) => ({
    id: String(segment.id ?? `seg_${index + 1}`),
    assetId: String(segment.assetId ?? assets[0]?.id ?? "asset_1"),
    speakerId: segment.speakerId ? String(segment.speakerId) : undefined,
    start: Number(segment.start ?? 0),
    end: Number(segment.end ?? segment.start ?? 0),
    text: String(segment.text ?? ""),
    words: Array.isArray(segment.words) ? segment.words : undefined
  })) satisfies TranscriptSegment[];

  return {
    id: String(raw.projectId ?? raw.id ?? "local-project"),
    name: String(raw.name ?? current.name ?? "未命名纪录片项目"),
    assets,
    speakers,
    segments,
    highlights: [],
    paperEdit: defaultGroups.map((group) => ({ ...group, highlightIds: [] }))
  };
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_") || "documentary_project";
}

function readFeedbackItems(): FeedbackPayload[] {
  try {
    const existing = window.localStorage.getItem(feedbackStorageKey);
    return existing ? (JSON.parse(existing) as FeedbackPayload[]) : [];
  } catch {
    return [];
  }
}

function readTranscriptionJobs(): TranscriptionJob[] {
  try {
    const saved = window.localStorage.getItem(transcriptionJobsStorageKey);
    return saved ? (JSON.parse(saved) as TranscriptionJob[]) : [];
  } catch {
    return [];
  }
}

async function checkTranscriptionBridge(bridgeUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${bridgeUrl}/health`, {
      method: "GET",
      cache: "no-store"
    });
    return response.ok;
  } catch {
    return false;
  }
}

function normalizeBridgeUrl(value: string): string {
  const trimmed = value.trim() || defaultTranscriptionSettings.bridgeUrl;
  return trimmed.replace(/\/+$/, "");
}

async function submitTranscriptionToBridge(
  asset: Asset,
  settings: TranscriptionSettings
): Promise<
  | { ok: true; segments: BridgeSegment[] }
  | { ok: false; code?: string; message: string }
> {
  if (!asset.objectUrl) {
    return { ok: false, message: "素材还没有关联本地视频。" };
  }

  try {
    const bridgeUrl = normalizeBridgeUrl(settings.bridgeUrl);
    const mediaResponse = await fetch(asset.objectUrl);
    const mediaBlob = await mediaResponse.blob();
    const params = new URLSearchParams({
      provider: settings.provider,
      language: settings.language,
      fileName: asset.linkedFileName ?? asset.fileName,
      speakerDiarization: String(settings.speakerDiarization),
      wordTimestamps: String(settings.wordTimestamps),
      fillerCleanup: String(settings.fillerCleanup)
    });
    if (settings.hotwords.trim()) params.set("hotwords", settings.hotwords.trim());
    const response = await fetch(`${bridgeUrl}/transcribe?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": mediaBlob.type || "application/octet-stream",
        ...(settings.apiKey.trim() ? { "X-API-Key": settings.apiKey.trim() } : {})
      },
      body: mediaBlob
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.ok === false) {
      return {
        ok: false,
        code: typeof payload?.code === "string" ? payload.code : undefined,
        message: typeof payload?.message === "string" ? payload.message : "本机转写执行层返回错误。"
      };
    }

    const segments = Array.isArray(payload?.segments)
      ? payload.segments
          .map((segment: any) => ({
            start: Number(segment.start ?? 0),
            end: Number(segment.end ?? segment.start ?? 0),
            text: String(segment.text ?? "").trim(),
            speakerId:
              typeof segment.speakerId === "string" || typeof segment.speakerId === "number"
                ? String(segment.speakerId)
                : undefined,
            words: Array.isArray(segment.words)
              ? segment.words
                  .map((word: any) => ({
                    start: Number(word.start ?? 0),
                    end: Number(word.end ?? word.start ?? 0),
                    text: String(word.text ?? word.word ?? "").trim()
                  }))
                  .filter((word: { text: string }) => word.text)
              : undefined
          }))
          .filter((segment: { text: string }) => segment.text)
      : [];

    if (segments.length === 0) {
      return { ok: false, message: "执行层没有返回可用逐字稿。" };
    }

    return { ok: true, segments };
  } catch {
    return { ok: false, code: "BRIDGE_UNREACHABLE", message: "无法连接本机转写执行层。" };
  }
}

function shouldAutosaveProject(project: Project): boolean {
  return (
    project.assets.length > 0 ||
    project.segments.length > 0 ||
    project.highlights.length > 0 ||
    project.paperEdit.some((group) => group.highlightIds.length > 0)
  );
}

function formatAssetDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function mediaDurationWarning(existingWarning: string | undefined, expectedDuration: number | undefined, actualDuration: number): string | undefined {
  if (!expectedDuration || Math.abs(expectedDuration - actualDuration) <= 2) return existingWarning;
  const durationWarning = `视频时长和项目记录相差较大：项目约 ${formatAssetDuration(expectedDuration)}，当前视频约 ${formatAssetDuration(actualDuration)}。请确认是否关联了正确版本。`;
  if (!existingWarning || existingWarning.includes("视频时长和项目记录")) return durationWarning;
  return `${existingWarning} ${durationWarning}`;
}

function asrSpeakerId(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `spk_asr_${normalized || "speaker"}`;
}
