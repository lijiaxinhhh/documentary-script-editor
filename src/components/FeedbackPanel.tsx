import { CheckCircle2, MessageSquareText, X } from "lucide-react";
import { useState } from "react";
import type { FeedbackPayload } from "../types/feedback";

type FeedbackPanelProps = {
  open: boolean;
  saved: boolean;
  feedbackCount: number;
  onClose: () => void;
  onSave: (payload: FeedbackPayload) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
};

const defaultDraft = {
  role: "纪录片导演",
  workflow: "",
  painPoint: "",
  idealOutput: "",
  contact: ""
};

export function FeedbackPanel({ open, saved, feedbackCount, onClose, onSave, onExportJson, onExportCsv }: FeedbackPanelProps) {
  const [draft, setDraft] = useState(defaultDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function updateField(field: keyof typeof defaultDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  function submitFeedback() {
    if (!draft.workflow.trim() || !draft.painPoint.trim()) {
      setError("请至少填写真实工作流和最痛的卡点。");
      return;
    }

    setSaving(true);
    window.setTimeout(() => {
      onSave({
        role: draft.role,
        workflow: draft.workflow.trim(),
        painPoint: draft.painPoint.trim(),
        idealOutput: draft.idealOutput.trim(),
        contact: draft.contact.trim(),
        createdAt: new Date().toISOString()
      });
      setSaving(false);
    }, 280);
  }

  return (
    <div className="feedback-backdrop">
      <aside className="feedback-panel" aria-label="提交需求和工作流建议">
        <header className="feedback-header">
          <div>
            <span className="eyebrow">需求验证</span>
            <h2>提交你的纪录片工作流</h2>
          </div>
          <button type="button" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </header>

        <section className="feedback-intro">
          <MessageSquareText size={18} />
          <p>
            这些内容只会保存到这台电脑的浏览器里，用来整理下一轮 MVP 优先级。当前没有云端提交。
            已保存 {feedbackCount} 条，可导出给项目发起人。
          </p>
        </section>

        <div className="feedback-export-row" aria-label="反馈导出">
          <button type="button" className="secondary-button" onClick={onExportJson} disabled={feedbackCount === 0}>
            导出 JSON
          </button>
          <button type="button" className="secondary-button" onClick={onExportCsv} disabled={feedbackCount === 0}>
            导出 CSV
          </button>
        </div>

        <form
          className="feedback-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitFeedback();
          }}
        >
          <label className="field-label" htmlFor="feedback-role">
            你的身份
          </label>
          <select id="feedback-role" value={draft.role} onChange={(event) => updateField("role", event.target.value)}>
            <option value="纪录片导演">纪录片导演</option>
            <option value="剪辑师">剪辑师</option>
            <option value="制片 / 项目负责人">制片 / 项目负责人</option>
            <option value="长视频创作者">长视频创作者</option>
            <option value="其他">其他</option>
          </select>

          <label className="field-label" htmlFor="feedback-workflow">
            你现在怎么整理采访和素材
          </label>
          <textarea
            id="feedback-workflow"
            value={draft.workflow}
            placeholder="例如：先转写，再在文档里做纸剪辑，最后手动回 PR 找时间码"
            onChange={(event) => updateField("workflow", event.target.value)}
          />

          <label className="field-label" htmlFor="feedback-pain">
            当前最痛的卡点
          </label>
          <textarea
            id="feedback-pain"
            value={draft.painPoint}
            placeholder="例如：故事版和剪辑时间线断开，选段以后仍然要人工找原素材"
            onChange={(event) => updateField("painPoint", event.target.value)}
          />

          <label className="field-label" htmlFor="feedback-output">
            你最希望它导出什么
          </label>
          <textarea
            id="feedback-output"
            value={draft.idealOutput}
            placeholder="例如：带原素材路径的 FCPXML、PR XML、达芬奇 EDL、剪映草稿或字幕包"
            onChange={(event) => updateField("idealOutput", event.target.value)}
          />

          <label className="field-label" htmlFor="feedback-contact">
            联系方式（可选）
          </label>
          <input
            id="feedback-contact"
            value={draft.contact}
            placeholder="邮箱 / 微信 / 飞书"
            onChange={(event) => updateField("contact", event.target.value)}
          />

          {error && (
            <p className="feedback-error" role="alert">
              {error}
            </p>
          )}

          <footer className="feedback-footer">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "保存中..." : "保存到本机"}
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              关闭
            </button>
            {saved && (
              <span className="saved-hint">
                <CheckCircle2 size={16} />
                已保存到本机浏览器
              </span>
            )}
          </footer>
        </form>
      </aside>
    </div>
  );
}
