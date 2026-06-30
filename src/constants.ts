import { LinterSettings } from "./types";

export const DEFAULT_SETTINGS: LinterSettings = {
  orphanDaysThreshold: 30,
  atomicityWordCount: 1000,
  atomicityHeaderCount: 5,
  blackHoleInboundThreshold: 5,
  decayDaysThreshold: 365,
  decayInboundThreshold: 3,
  mocTags: ["#MOC", "#Index"],
  excludedFolders: ["Daily Notes"],
  excludedTags: ["#journal"]
};

export const CACHE_FILE_NAME = "note-linter-cache.json";
