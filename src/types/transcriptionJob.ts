import type { TranscriptionSettings } from "../components/TranscriptionPanel";

export type TranscriptionJobStatus = "queued" | "blocked" | "running" | "done" | "failed";

export type TranscriptionJob = {
  id: string;
  assetId: string;
  assetName: string;
  provider: TranscriptionSettings["provider"];
  language: TranscriptionSettings["language"];
  status: TranscriptionJobStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
};
