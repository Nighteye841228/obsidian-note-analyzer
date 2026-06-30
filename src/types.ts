export interface LinterSettings {
  orphanDaysThreshold: number;
  atomicityWordCount: number;
  atomicityHeaderCount: number;
  blackHoleInboundThreshold: number;
  decayDaysThreshold: number;
  decayInboundThreshold: number;
  mocTags: string[];
  excludedFolders: string[];
  excludedTags: string[];
}

export interface NoteMetrics {
  path: string;
  createdTime: number;
  modifiedTime: number;
  inboundLinks: number;
  outboundLinks: number;
  mocEntries: number;
  wordCount: number;
  headerCount: number;
  todoCount: number;
}

export enum WarningCategory {
  ORPHAN = "Orphan Note",
  ATOMICITY = "Atomicity Violation",
  BLACK_HOLE = "Knowledge Sink",
  DECAY = "Knowledge Decay",
  STUB = "Unfinished Stub"
}

export interface LinterWarning {
  path: string;
  category: WarningCategory;
  message: string;
}
