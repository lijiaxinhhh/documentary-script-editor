import { CheckCircle2, FileJson, KeyRound, Laptop, Mic2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { TranscriptionJob } from "../types/transcriptionJob";
import type { Asset } from "../types/transcript";

export type TranscriptionProvider = "local-whisper" | "local-funasr" | "qwen-aliyun" | "openai" | "deepgram";

export type TranscriptionSettings = {
  provider: TranscriptionProvider;
  apiKey: string;
  bridgeUrl: string;
  bridgeToken: string;
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
  onSaveSettings: () => void;
  onSaveKey: () => void;
  onClearSaved: () => void;
  onCreateJob: () => Promise<string>;
  onRetryJob: (jobId: string) => void;
};

const providerNotes: Record<TranscriptionProvider, string> = {
  "local-whisper": "完全本地，不需要 Key。适合隐私优先的采访素材。",
  "local-funasr": "完全本地，不需要 Key。中文识别和热词方向更适合后续接入。",
  "qwen-aliyun": "音频会从本机助手发送给通义/阿里云百炼，不经过网站服务器。",
  openai: "音频会从本机助手发送给 OpenAI，不经过网站服务器。",
  deepgram: "音频会从本机助手发送给 Deepgram，不经过网站服务器。"
};

export function TranscriptionPanel({
  open,
  asset,
  settings,
  saved,
  jobs,
  onClose,
  onChange,
  onSaveSettings,
  onSaveKey,
  onClearSaved,
  onCreateJob,
  onRetryJob
}: TranscriptionPanelProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [creatingJob, setCreatingJob] = useState(false);

  if (!open) return null;
  const requiresKey = !settings.provider.startsWith("local");
  const latestJob = jobs[0];
  const assistantState = latestJob?.status === "running" || latestJob?.status === "done" ? "已连接" : latestJob?.status === "blocked" ? "需要启动" : "未连接";
  const apiKeyState = settings.apiKey.trim() ? (saved ? "已保存到浏览器" : "仅本次会话") : "未保存";
  const transcriptionPath = requiresKey ? "本机助手 + 云模型" : "完全本地";

  async function prepareTranscription() {
    setCreatingJob(true);
    const message = await onCreateJob();
    setStatusMessage(message);
    setCreatingJob(false);
  }

  return (
    <div className="transcription-backdrop">
      <aside className="transcription-panel" aria-label="转写助手 / 隐私路径">
        <header className="transcription-header">
          <div>
            <span className="eyebrow">转写助手 / 隐私路径</span>
            <h2>{asset ? "为当前素材生成逐字稿" : "选择转写路径"}</h2>
          </div>
          <button type="button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </header>

        <section className="privacy-status-grid" aria-label="隐私状态">
          <StatusPill icon={<Mic2 size={15} />} label="当前素材" value={asset ? "本地浏览器读取" : "未选择"} />
          <StatusPill icon={<ShieldCheck size={15} />} label="转写路径" value={transcriptionPath} />
          <StatusPill icon={<KeyRound size={15} />} label="API Key" value={apiKeyState} />
          <StatusPill icon={<Laptop size={15} />} label="本机助手" value={assistantState} />
        </section>

        <section className="transcription-card active-asset-card">
          <div className="card-title">
            <Mic2 size={18} />
            当前素材
          </div>
          <p>{asset ? asset.fileName : "还没有导入视频。先点顶部“导入视频”，或导入已有逐字稿 JSON。"}</p>
        </section>

        <section className="transcription-paths">
          <article className="transcription-path-card">
            <div className="card-title">
              <FileJson size={17} />
              1. 我有逐字稿
            </div>
            <p>当前稳定支持导入本地项目 JSON 或 transcript JSON。SRT / CSV 入口会保留到下一轮解析器。</p>
            <span className="helper-text">从顶部“设置 → 导入 JSON”进入。</span>
          </article>

          <article className={`transcription-path-card ${settings.provider.startsWith("local") ? "active" : ""}`}>
            <div className="card-title">
              <Laptop size={17} />
              2. 本机助手转写
            </div>
            <p>默认推荐。素材由浏览器发送到你自己电脑上的本机助手，不需要 Key。</p>
            <div className="button-row">
              <button type="button" onClick={() => onChange({ ...settings, provider: "local-whisper" })}>
                本地 Whisper
              </button>
              <button type="button" onClick={() => onChange({ ...settings, provider: "local-funasr" })}>
                本地 FunASR
              </button>
            </div>
          </article>

          <article className={`transcription-path-card ${requiresKey ? "active" : ""}`}>
            <div className="card-title">
              <KeyRound size={17} />
              3. 使用我的云服务 Key
            </div>
            <p>音频会从本机助手发送给你选择的服务商，不经过这个网站服务器。Key 默认只留在本次会话。</p>
            <label className="field-label" htmlFor="provider">
              云服务商
            </label>
            <select
              id="provider"
              value={settings.provider}
              onChange={(event) => onChange({ ...settings, provider: event.target.value as TranscriptionProvider })}
            >
              <option value="local-whisper">不使用云服务</option>
              <option value="local-funasr">不使用云服务（FunASR）</option>
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
                placeholder={requiresKey ? "仅本次会话使用，除非你明确保存" : "本地路径不需要 Key"}
                onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
              />
            </div>
            <button type="button" className="secondary-button" onClick={onSaveKey} disabled={!requiresKey || !settings.apiKey.trim()}>
              保存 Key 到本机浏览器
            </button>
          </article>
        </section>

        <details className="transcription-card advanced-card">
          <summary>
            <SlidersHorizontal size={16} />
            高级设置
          </summary>
          <label className="field-label" htmlFor="bridge-url">
            本机助手地址
          </label>
          <input
            id="bridge-url"
            type="url"
            value={settings.bridgeUrl}
            placeholder="http://127.0.0.1:8787"
            onChange={(event) => onChange({ ...settings, bridgeUrl: event.target.value })}
          />
          <label className="field-label" htmlFor="bridge-token">
            本机助手配对码
          </label>
          <input
            id="bridge-token"
            type="password"
            value={settings.bridgeToken}
            placeholder="可选；建议和 TRANSCRIPTION_BRIDGE_TOKEN 一致"
            onChange={(event) => onChange({ ...settings, bridgeToken: event.target.value })}
          />
          <p className="helper-text">无配对码时本地开发仍可用；公开网站使用时建议给本机助手设置配对码。</p>
        </details>

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

        <footer className="transcription-footer">
          <button type="button" className="primary-button" onClick={prepareTranscription}>
            {creatingJob ? "检查本机助手..." : "创建转写任务"}
          </button>
          <button type="button" className="secondary-button" onClick={onSaveSettings}>
            保存非敏感设置
          </button>
          <button type="button" className="secondary-button" onClick={onClearSaved}>
            清除已保存 Key 和设置
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
            <p className="helper-text">当前素材还没有转写任务。本机助手未连接时，任务会保存为可重试状态。</p>
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

        <section className="privacy-note">
          <ShieldCheck size={18} />
          <div>
            <strong>隐私边界</strong>
            <p>素材不上传到网站服务器。本地路径留在你的电脑；云模型路径只由本机助手把音频发给你选择的服务商。</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="privacy-status-pill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
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
    blocked: "本机助手未连接",
    running: "转写中",
    done: "已完成",
    failed: "失败"
  }[status];
}
