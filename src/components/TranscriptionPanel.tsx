import { CheckCircle2, KeyRound, Mic2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { TranscriptionJob } from "../types/transcriptionJob";
import type { Asset } from "../types/transcript";

export type TranscriptionProvider = "local-whisper" | "local-funasr" | "qwen-aliyun" | "openai" | "deepgram";

export type TranscriptionSettings = {
  provider: TranscriptionProvider;
  apiKey: string;
  bridgeUrl: string;
  language: "zh" | "en" | "mixed" | "yue";
  speakerDiarization: boolean;
  wordTimestamps: boolean;
  fillerCleanup: boolean;
  hotwords: string;
};

type TranscriptionPanelProps = {
  open: boolean;
  asset?: Asset;
  settings: TranscriptionSettings;
  saved: boolean;
  jobs: TranscriptionJob[];
  onClose: () => void;
  onChange: (settings: TranscriptionSettings) => void;
  onSave: () => void;
  onCreateJob: () => Promise<string>;
  onRetryJob: (jobId: string) => void;
};

const providerNotes: Record<TranscriptionProvider, string> = {
  "local-whisper": "完全本地，不需要 Key。适合隐私优先的采访素材。",
  "local-funasr": "完全本地，不需要 Key。中文识别和热词方向更适合后续接入。",
  "qwen-aliyun": "输入你的通义/阿里云百炼 Key。小音频可直连 Qwen3-ASR-Flash，大素材建议先用本地 Whisper。",
  openai: "输入你的 OpenAI Key。音频会发送给 OpenAI 模型服务商。",
  deepgram: "输入你的 Deepgram Key。支持 smart_format、热词和可选发言人区分。"
};

export function TranscriptionPanel({
  open,
  asset,
  settings,
  saved,
  jobs,
  onClose,
  onChange,
  onSave,
  onCreateJob,
  onRetryJob
}: TranscriptionPanelProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [creatingJob, setCreatingJob] = useState(false);

  if (!open) return null;
  const requiresKey = !settings.provider.startsWith("local");

  async function prepareTranscription() {
    setCreatingJob(true);
    const message = await onCreateJob();
    setStatusMessage(message);
    setCreatingJob(false);
  }

  return (
    <div className="transcription-backdrop">
      <aside className="transcription-panel" aria-label="视频转文字与 Key 设置">
        <header className="transcription-header">
          <div>
            <span className="eyebrow">视频转文字</span>
            <h2>{asset ? "转写当前素材" : "模型与 Key"}</h2>
          </div>
          <button type="button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </header>

        <section className="transcription-card active-asset-card">
          <div className="card-title">
            <Mic2 size={18} />
            当前素材
          </div>
          <p>{asset ? asset.fileName : "还没有导入视频。先点顶部“导入视频”，再回来开始转写。"}</p>
        </section>

        <section className="transcription-runtime-note">
          <strong>本机执行层</strong>
          <p>网站会把任务保存到本机队列，并检查你电脑上的转写桥接服务。未启动时不会假装转写完成。</p>
        </section>

        <section className="transcription-card">
          <label className="field-label" htmlFor="provider">
            转写模型
          </label>
          <select
            id="provider"
            value={settings.provider}
            onChange={(event) => onChange({ ...settings, provider: event.target.value as TranscriptionProvider })}
          >
            <option value="local-whisper">本地 Whisper</option>
            <option value="local-funasr">本地 FunASR</option>
            <option value="qwen-aliyun">通义/阿里云百炼</option>
            <option value="openai">OpenAI</option>
            <option value="deepgram">Deepgram</option>
          </select>
          <p className="helper-text">{providerNotes[settings.provider]}</p>

          <label className="field-label" htmlFor="api-key">
            API Key
          </label>
          <div className="key-input">
            <KeyRound size={16} />
            <input
              id="api-key"
              type="password"
              value={settings.apiKey}
              disabled={!requiresKey}
              placeholder={requiresKey ? "粘贴你的 API Key" : "本地模型不需要 Key"}
              onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
            />
          </div>

          <label className="field-label" htmlFor="bridge-url">
            本机执行层地址
          </label>
          <input
            id="bridge-url"
            type="url"
            value={settings.bridgeUrl}
            placeholder="http://127.0.0.1:8787"
            onChange={(event) => onChange({ ...settings, bridgeUrl: event.target.value })}
          />
          <p className="helper-text">别人打开公开网站时，也会连接他自己电脑上的这个地址。</p>
        </section>

        <section className="transcription-card options-grid">
          <label>
            语言
            <select
              value={settings.language}
              onChange={(event) => onChange({ ...settings, language: event.target.value as TranscriptionSettings["language"] })}
            >
              <option value="zh">中文</option>
              <option value="mixed">中英混合</option>
              <option value="yue">粤语</option>
              <option value="en">英文</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.speakerDiarization}
              onChange={(event) => onChange({ ...settings, speakerDiarization: event.target.checked })}
            />
            区分发言人
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.wordTimestamps}
              onChange={(event) => onChange({ ...settings, wordTimestamps: event.target.checked })}
            />
            词/字级时间戳
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.fillerCleanup}
              onChange={(event) => onChange({ ...settings, fillerCleanup: event.target.checked })}
            />
            初步清理口头语
          </label>
        </section>

        <footer className="transcription-footer">
          <button type="button" className="primary-button" onClick={prepareTranscription}>
            {creatingJob ? "检查执行层..." : "创建转写任务"}
          </button>
          <button type="button" className="secondary-button" onClick={onSave}>
            保存 Key 和设置
          </button>
          {saved && (
            <span className="saved-hint">
              <CheckCircle2 size={16} />
              已保存到本机浏览器
            </span>
          )}
          {statusMessage && <p className="transcription-status">{statusMessage}</p>}
        </footer>

        <section className="transcription-card transcription-jobs">
          <div className="card-title">转写任务</div>
          {jobs.length === 0 ? (
            <p className="helper-text">当前素材还没有转写任务。</p>
          ) : (
            <div className="job-list">
              {jobs.map((job) => (
                <article key={job.id} className={`job-card ${job.status}`}>
                  <div>
                    <strong>{job.assetName}</strong>
                    <span>{providerLabel(job.provider)} · {job.language}</span>
                  </div>
                  <p>{job.message}</p>
                  <footer>
                    <span>{jobStatusLabel(job.status)}</span>
                    {job.status === "blocked" && (
                      <button type="button" className="secondary-button" onClick={() => onRetryJob(job.id)}>
                        重新检查
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="transcription-card">
          <label className="field-label" htmlFor="hotwords">
            热词表
          </label>
          <textarea
            id="hotwords"
            value={settings.hotwords}
            placeholder="人物名、地名、机构名、专业词；一行一个"
            onChange={(event) => onChange({ ...settings, hotwords: event.target.value })}
          />
        </section>

        <section className="privacy-note">
          <ShieldCheck size={18} />
          <div>
            <strong>隐私边界</strong>
            <p>本地 Whisper/FunASR 模式下素材不离开电脑。通义/阿里云、OpenAI、Deepgram 模式下，音频会发送给你选择的模型服务商，但不经过这个网站的服务器。</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function providerLabel(provider: TranscriptionProvider): string {
  return {
    "local-whisper": "本地 Whisper",
    "local-funasr": "本地 FunASR",
    "qwen-aliyun": "通义",
    openai: "OpenAI",
    deepgram: "Deepgram"
  }[provider];
}

function jobStatusLabel(status: TranscriptionJob["status"]) {
  return {
    queued: "已排队",
    blocked: "等待执行层",
    running: "转写中",
    done: "已完成",
    failed: "失败"
  }[status];
}
