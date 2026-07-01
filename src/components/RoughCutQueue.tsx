import { Play, Scissors, StretchHorizontal } from "lucide-react";
import type { Asset, Highlight, Speaker } from "../types/transcript";
import { formatShortTime } from "../utils/timecode";

type RoughCutQueueProps = {
  highlights: Highlight[];
  paperHighlightIds: Set<string>;
  speakers: Speaker[];
  assets: Asset[];
  onSeek: (highlight: Highlight) => void;
  onOpenStory: () => void;
  onOpenExport: () => void;
};

export function RoughCutQueue({
  highlights,
  paperHighlightIds,
  speakers,
  assets,
  onSeek,
  onOpenStory,
  onOpenExport
}: RoughCutQueueProps) {
  const clips = highlights.filter((highlight) => paperHighlightIds.has(highlight.id));
  const speakerMap = new Map(speakers.map((speaker) => [speaker.id, speaker.name]));
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const duration = clips.reduce((total, highlight) => total + Math.max(0, highlight.end - highlight.start), 0);

  return (
    <section className="rough-cut-queue" aria-label="粗剪队列">
      <header className="inspector-header">
        <div>
          <span className="pane-title">粗剪队列</span>
          <strong>{clips.length} 段 · {formatShortTime(duration)}</strong>
        </div>
        <button type="button" onClick={onOpenStory} disabled={clips.length === 0}>
          <StretchHorizontal size={15} />
          展开
        </button>
      </header>

      {clips.length === 0 ? (
        <div className="queue-empty">
          <Scissors size={18} />
          <strong>还没有粗剪片段</strong>
          <span>在逐字稿中选中文字，点击“设为片段”。</span>
        </div>
      ) : (
        <div className="queue-list">
          {clips.map((highlight, index) => (
            <article key={highlight.id} className="queue-card">
              <button type="button" className="queue-play" onClick={() => onSeek(highlight)} title="播放这个片段">
                <Play size={13} />
              </button>
              <div>
                <span className="queue-meta">
                  {index + 1}. {formatShortTime(highlight.start)} - {formatShortTime(highlight.end)}
                </span>
                <p>{highlight.text}</p>
                <span className="queue-source">
                  {highlight.speakerId ? speakerMap.get(highlight.speakerId) ?? highlight.speakerId : "未命名"} ·{" "}
                  {assetMap.get(highlight.assetId)?.fileName ?? "未知素材"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="queue-footer">
        <button type="button" onClick={onOpenExport} disabled={clips.length === 0}>
          查看导出准备度
        </button>
      </footer>
    </section>
  );
}
