export interface LinterSettings {
  debugLogging: boolean;
  orphanDaysThreshold: number;
  atomicityWordCountEnabled: boolean;
  atomicityWordCount: number;
  atomicityHeadingCountEnabled: boolean;
  atomicityHeadingCount: number;
  atomicityListItemCountEnabled: boolean;
  atomicityListItemCount: number;
  blackHoleInboundThreshold: number;
  decayDaysThreshold: number;
  decayInboundThreshold: number;
  decayIndexThreshold: number;
  decayMocWeight: number;
  decayDefaultWeight: number;
  decayEvergreenWeight: number;
  decayLiteratureWeight: number;
  decayEvergreenTags: string[];
  decayLiteratureTags: string[];
  mocTags: string[];
  excludedFolders: string[];
  excludedTags: string[];
}

export interface NoteMetrics {
  path: string;
  createdTime: number;
  modifiedTime: number;
  inboundLinks: number;
  latestInboundLinkTime: number | null;
  outboundLinks: number;
  latestOutboundLinkTime: number | null;
  mocEntries: number;
  latestMocEntryTime: number | null;
  wordCount: number;
  headingCount: number;
  listItemCount: number;
  todoCount: number;
  centralityScore: number;
  noteTypeWeight: number;
  inactiveDays: number;
  decayIndex: number;
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
