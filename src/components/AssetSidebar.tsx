import { FileVideo2, Mic2, Search } from "lucide-react";
import { useRef } from "react";
import type { Asset, FilterMode, Highlight, SearchResult, Speaker, TranscriptSegment } from "../types/transcript";
import { formatShortTime } from "../utils/timecode";

type AssetSidebarProps = {
  assets: Asset[];
  activeAssetId?: string;
  segments: TranscriptSegment[];
  highlights: Highlight[];
  speakers: Speaker[];
  query: string;
  filterMode: FilterMode;
  speakerFilter: string;
  searchResults: SearchResult[];
  onAssetSelect: (assetId: string) => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (mode: FilterMode) => void;
  onSpeakerFilterChange: (speakerId: string) => void;
  onJump: (segmentId: string, start: number) => void;
  onOpenTranscription: () => void;
  onVideoFile: (file: File, assetId?: string) => void;
};

export function AssetSidebar({
  assets,
  activeAssetId,
  segments,
  highlights,
  speakers,
  query,
  filterMode,
  speakerFilter,
  searchResults,
  onAssetSelect,
  onQueryChange,
  onFilterChange,
  onSpeakerFilterChange,
  onJump,
  onOpenTranscription,
  onVideoFile
}: AssetSidebarProps) {
  return (
    <aside className="sidebar">
      <section className="panel-section sidebar-overview">
        <span className="section-eyebrow">素材库</span>
        <div className="sidebar-metrics">
          <strong>{assets.length}</strong>
          <span>个素材</span>
          <strong>{highlights.length}</strong>
          <span>条选段</span>
        </div>
        <div className="asset-list">
          {assets.length === 0 ? (
            <div className="empty-state">导入视频后，这里会出现素材索引。</div>
          ) : (
            assets.map((asset) => {
              const count = highlights.filter((highlight) => highlight.assetId === asset.id).length;
              const transcriptCount = segments.filter((segment) => segment.assetId === asset.id).length;
              return (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  active={asset.id === activeAssetId}
                  highlightCount={count}
                  transcriptCount={transcriptCount}
                  onAssetSelect={onAssetSelect}
                  onOpenTranscription={onOpenTranscription}
                  onVideoFile={onVideoFile}
                />
              );
            })
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">检索文稿</div>
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索人物、主题或原话"
            aria-label="搜索逐字稿"
          />
        </label>
        <div className="filter-row">
          <select
            value={filterMode}
            aria-label="筛选逐字稿"
            onChange={(event) => onFilterChange(event.target.value as FilterMode)}
          >
            <option value="all">全部</option>
            <option value="highlighted">已高亮</option>
            <option value="paper">已入纸编辑</option>
            <option value="speaker">按发言人</option>
          </select>
          {filterMode === "speaker" && (
            <select
              value={speakerFilter}
              aria-label="选择发言人"
              onChange={(event) => onSpeakerFilterChange(event.target.value)}
            >
              <option value="">全部发言人</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>
                  {speaker.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="panel-section results-section">
        <div className="section-title">命中 {query.trim() ? searchResults.length : 0}</div>
        <div className="search-results" role="region" aria-label="搜索命中结果" tabIndex={0}>
          {!query.trim() ? (
            <div className="empty-state">输入关键词后，可按时间码跳转。</div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">没有找到匹配段落。</div>
          ) : (
            searchResults.map((result) => (
              <button
                key={result.segmentId}
                type="button"
                className="result-card"
                onClick={() => onJump(result.segmentId, result.start)}
              >
                <span className="result-time">{formatShortTime(result.start)}</span>
                <span className="result-speaker">{result.speakerName}</span>
                <span className="result-text">{result.text}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

type AssetCardProps = {
  asset: Asset;
  active: boolean;
  highlightCount: number;
  transcriptCount: number;
  onAssetSelect: (assetId: string) => void;
  onOpenTranscription: () => void;
  onVideoFile: (file: File, assetId?: string) => void;
};

function AssetCard({
  asset,
  active,
  highlightCount,
  transcriptCount,
  onAssetSelect,
  onOpenTranscription,
  onVideoFile
}: AssetCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const needsTranscript = Boolean(asset.objectUrl && transcriptCount === 0);
  const needsRelink = Boolean(!asset.objectUrl && transcriptCount > 0);

  return (
    <article className={`asset-card ${active ? "active" : ""}`}>
      <button type="button" className="asset-card-main" onClick={() => onAssetSelect(asset.id)}>
        <span className="asset-name">{asset.fileName}</span>
        <span className="asset-meta">
          {transcriptCount ? `已转写 ${transcriptCount} 段` : asset.objectUrl ? "素材已导入 · 待转写" : "等待视频"} · {highlightCount} 个选段
        </span>
        {asset.mediaWarning && <span className="asset-warning">{asset.mediaWarning}</span>}
        {asset.mediaError && <span className="asset-warning error">{asset.mediaError}</span>}
      </button>
      {needsTranscript && (
        <button type="button" className="asset-transcribe-action" onClick={onOpenTranscription}>
          <Mic2 size={14} />
          开始转写
        </button>
      )}
      {needsRelink && (
        <>
          <button type="button" className="asset-transcribe-action asset-relink-action" onClick={() => inputRef.current?.click()}>
            <FileVideo2 size={14} />
            关联视频
          </button>
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onVideoFile(file, asset.id);
              event.target.value = "";
            }}
          />
        </>
      )}
    </article>
  );
}
