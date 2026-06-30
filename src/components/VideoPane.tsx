import { FileVideo2, Mic2, Play } from "lucide-react";
import { useRef, type RefObject } from "react";
import type { Asset, TranscriptSegment } from "../types/transcript";
import { formatDisplayTime } from "../utils/timecode";

type VideoPaneProps = {
  asset?: Asset;
  currentTime: number;
  currentSegment?: TranscriptSegment;
  currentSpeakerName: string;
  transcriptCount: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onOpenTranscription: () => void;
  onVideoFile: (file: File, assetId?: string) => void;
  onMediaError: (assetId: string) => void;
  onTimeUpdate: (time: number) => void;
  onDuration: (duration: number) => void;
};

export function VideoPane({
  asset,
  currentTime,
  currentSegment,
  currentSpeakerName,
  transcriptCount,
  videoRef,
  onOpenTranscription,
  onVideoFile,
  onMediaError,
  onTimeUpdate,
  onDuration
}: VideoPaneProps) {
  const relinkInputRef = useRef<HTMLInputElement>(null);
  const needsTranscript = Boolean(asset?.objectUrl && transcriptCount === 0);
  const needsRelink = Boolean(asset && !asset.objectUrl && transcriptCount > 0);

  return (
    <section className="video-pane">
      <header className="video-pane-header">
        <span>看片与字幕</span>
        <strong>{asset?.fileName ?? "等待素材"}</strong>
      </header>
      <div className="video-shell">
        {asset?.objectUrl ? (
          <video
            ref={videoRef}
            src={asset.objectUrl}
            controls
            onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => onDuration(event.currentTarget.duration)}
            onError={() => {
              if (asset) onMediaError(asset.id);
            }}
          />
        ) : (
          <div className="video-placeholder">
            <Play size={42} />
            <div>{needsRelink ? "逐字稿已恢复，等待重新关联本地视频" : "导入本地视频后开始联动预览"}</div>
          </div>
        )}
        {needsRelink && (
          <div className="video-next-step">
            <span>项目已恢复</span>
            <strong>重新关联本地视频</strong>
            <p>选择 {asset?.fileName ?? "对应视频"} 后，点击逐字稿会再次跳转到画面。</p>
            <button type="button" onClick={() => relinkInputRef.current?.click()}>
              <FileVideo2 size={16} />
              关联视频
            </button>
          </div>
        )}
        {(asset?.mediaWarning || asset?.mediaError) && (
          <div className={`media-alert ${asset.mediaError ? "error" : "warning"}`} role="status">
            {asset.mediaWarning && <div>{asset.mediaWarning}</div>}
            {asset.mediaError && <div>{asset.mediaError}</div>}
          </div>
        )}
        {needsTranscript && (
          <div className="video-next-step">
            <span>素材已导入</span>
            <strong>下一步：生成逐字稿</strong>
            <p>像 Reduct 一样先把视频变成可搜索、可高亮、可剪辑的文字。</p>
            <button type="button" onClick={onOpenTranscription}>
              <Mic2 size={16} />
              开始转写 / 输入 Key
            </button>
          </div>
        )}
        {currentSegment && (
          <div className="subtitle-overlay">
            <span>{currentSpeakerName ? `${currentSpeakerName}：` : ""}</span>
            {currentSegment.text}
          </div>
        )}
        <input
          ref={relinkInputRef}
          className="hidden-input"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onVideoFile(file, asset?.id);
            event.target.value = "";
          }}
        />
      </div>
      <div className="transport-bar">
        <span>{formatDisplayTime(currentTime)}</span>
        <span>{currentSegment ? "字幕跟随播放" : "无当前字幕"}</span>
      </div>
    </section>
  );
}
