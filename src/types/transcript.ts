export type Asset = {
  id: string;
  fileName: string;
  objectUrl?: string;
  duration?: number;
  language?: string;
  linkedFileName?: string;
  mediaWarning?: string;
  mediaError?: string;
};

export type Speaker = {
  id: string;
  name: string;
};

export type WordTiming = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptSegment = {
  id: string;
  assetId: string;
  speakerId?: string;
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
};

export type SelectStatus = "selected" | "maybe" | "rejected" | "used" | "needs-review";

export type TimingSource = "word" | "segment-estimate" | "manual";

export type Highlight = {
  id: string;
  segmentId: string;
  assetId: string;
  start: number;
  end: number;
  text: string;
  speakerId?: string;
  tags: string[];
  note?: string;
  status: SelectStatus;
  timingSource: TimingSource;
  reviewed: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  rejectReason?: string;
  createdFromTextSelection?: boolean;
  inPadding?: number;
  outPadding?: number;
  originalStart?: number;
  originalEnd?: number;
};

export type PaperEditGroup = {
  id: string;
  title: string;
  highlightIds: string[];
};

export type StoryNote = {
  id: string;
  groupId: string;
  text: string;
  color: "yellow" | "blue" | "green" | "white";
  kind?: "note" | "image" | "comment";
  fileName?: string;
  objectUrl?: string;
};

export type Project = {
  id: string;
  name: string;
  assets: Asset[];
  speakers: Speaker[];
  segments: TranscriptSegment[];
  highlights: Highlight[];
  paperEdit: PaperEditGroup[];
};

export type SearchResult = {
  segmentId: string;
  start: number;
  end: number;
  text: string;
  speakerName: string;
};

export type FilterMode = "all" | SelectStatus | "speaker";
