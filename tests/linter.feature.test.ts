import { evaluateNote } from "../src/rules";
import { WarningCategory } from "../src/types";
import { DAY, makeNote, makeSettings, NOW } from "./testUtils";

describe("note linter feature behavior", () => {
  it("can return multiple warnings for a single unhealthy note", () => {
    const warnings = evaluateNote(makeNote({
      path: "large-stale-sink.md",
      createdTime: NOW - (500 * DAY),
      modifiedTime: NOW - (500 * DAY),
      inboundLinks: 8,
      latestInboundLinkTime: NOW - (500 * DAY),
      outboundLinks: 0,
      mocEntries: 1,
      latestMocEntryTime: NOW - (500 * DAY),
      wordCount: 2000,
      headingCount: 8,
      listItemCount: 25,
      todoCount: 3,
      centralityScore: 0.5,
      noteTypeWeight: 1.5,
      inactiveDays: 500,
      decayIndex: 375
    }), makeSettings(), NOW);

    expect(warnings.map(warning => warning.category)).toEqual(expect.arrayContaining([
      WarningCategory.ATOMICITY,
      WarningCategory.BLACK_HOLE,
      WarningCategory.DECAY,
      WarningCategory.STUB
    ]));
    expect(warnings.some(warning => warning.category === WarningCategory.ORPHAN)).toBe(false);
  });

  it("respects user-configured atomicity thresholds", () => {
    const note = makeNote({
      wordCount: 700,
      headingCount: 5,
      listItemCount: 9
    });

    const permissiveWarnings = evaluateNote(note, makeSettings({
      atomicityWordCount: 1000,
      atomicityHeadingCount: 8,
      atomicityListItemCountEnabled: true,
      atomicityListItemCount: 10
    }), NOW);
    const strictWarnings = evaluateNote(note, makeSettings({
      atomicityWordCount: 600,
      atomicityHeadingCount: 4,
      atomicityListItemCountEnabled: true,
      atomicityListItemCount: 8
    }), NOW);

    expect(permissiveWarnings.some(warning => warning.category === WarningCategory.ATOMICITY)).toBe(false);
    expect(strictWarnings.some(warning => warning.category === WarningCategory.ATOMICITY)).toBe(true);
  });

  it("allows decay index threshold to be configured", () => {
    const note = makeNote({
      centralityScore: 0.5,
      noteTypeWeight: 1,
      inactiveDays: 100,
      decayIndex: 50
    });

    const lowThresholdWarnings = evaluateNote(note, makeSettings({ decayIndexThreshold: 30 }), NOW);
    const highThresholdWarnings = evaluateNote(note, makeSettings({ decayIndexThreshold: 60 }), NOW);

    expect(lowThresholdWarnings.some(warning => warning.category === WarningCategory.DECAY)).toBe(true);
    expect(highThresholdWarnings.some(warning => warning.category === WarningCategory.DECAY)).toBe(false);
  });

  it("keeps a healthy linked note warning-free", () => {
    const warnings = evaluateNote(makeNote({
      createdTime: NOW - (200 * DAY),
      modifiedTime: NOW - (2 * DAY),
      inboundLinks: 2,
      latestInboundLinkTime: NOW - (2 * DAY),
      outboundLinks: 3,
      latestOutboundLinkTime: NOW - (2 * DAY),
      mocEntries: 1,
      latestMocEntryTime: NOW - (2 * DAY),
      wordCount: 300,
      headingCount: 2,
      listItemCount: 3,
      todoCount: 0
    }), makeSettings(), NOW);

    expect(warnings).toHaveLength(0);
  });
});
