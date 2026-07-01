import { DEFAULT_SETTINGS } from "../src/constants";
import { LinterSettings, NoteMetrics } from "../src/types";

export const DAY = 24 * 60 * 60 * 1000;
export const NOW = new Date("2026-07-01T00:00:00.000Z").getTime();

export function makeSettings(overrides: Partial<LinterSettings> = {}): LinterSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides
  };
}

export function makeNote(overrides: Partial<NoteMetrics> = {}): NoteMetrics {
  return {
    path: "note.md",
    createdTime: NOW - (10 * DAY),
    modifiedTime: NOW - (10 * DAY),
    inboundLinks: 0,
    latestInboundLinkTime: null,
    outboundLinks: 0,
    latestOutboundLinkTime: null,
    mocEntries: 0,
    latestMocEntryTime: null,
    wordCount: 100,
    headingCount: 1,
    listItemCount: 0,
    todoCount: 0,
    centralityScore: 0,
    noteTypeWeight: 1,
    inactiveDays: 10,
    decayIndex: 0,
    ...overrides
  };
}
