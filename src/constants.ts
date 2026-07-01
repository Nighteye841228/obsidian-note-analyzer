import { LinterSettings } from "./types";

export const DEFAULT_SETTINGS: LinterSettings = {
  debugLogging: false,
  orphanDaysThreshold: 30,
  atomicityWordCountEnabled: true,
  atomicityWordCount: 1000,
  atomicityHeadingCountEnabled: true,
  atomicityHeadingCount: 5,
  atomicityListItemCountEnabled: false,
  atomicityListItemCount: 20,
  blackHoleInboundThreshold: 5,
  decayDaysThreshold: 365,
  decayInboundThreshold: 3,
  decayIndexThreshold: 30,
  decayMocWeight: 1.5,
  decayDefaultWeight: 1.0,
  decayEvergreenWeight: 1.0,
  decayLiteratureWeight: 0.2,
  decayEvergreenTags: ["#evergreen"],
  decayLiteratureTags: ["#literature", "#source"],
  mocTags: ["#MOC", "#Index"],
  excludedFolders: ["Daily Notes"],
  excludedTags: ["#journal"]
};

export const CACHE_FILE_NAME = "note-linter-cache.json";
