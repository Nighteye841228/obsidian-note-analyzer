import { evaluateNote } from "../src/rules";
import { WarningCategory } from "../src/types";
import { DAY, makeNote, makeSettings, NOW } from "./testUtils";

function hasWarning(category: WarningCategory, warnings = [] as ReturnType<typeof evaluateNote>): boolean {
  return warnings.some(warning => warning.category === category);
}

describe("evaluateNote unit rules", () => {
  it("flags old isolated notes as orphans", () => {
    const warnings = evaluateNote(makeNote({
      path: "orphan.md",
      createdTime: NOW - (40 * DAY),
      modifiedTime: NOW - (40 * DAY)
    }), makeSettings(), NOW);

    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "orphan.md",
        category: WarningCategory.ORPHAN
      })
    ]));
  });

  it("does not flag new isolated notes as orphans", () => {
    const warnings = evaluateNote(makeNote({
      createdTime: NOW - (5 * DAY),
      modifiedTime: NOW - (5 * DAY)
    }), makeSettings(), NOW);

    expect(hasWarning(WarningCategory.ORPHAN, warnings)).toBe(false);
  });

  it("does not flag connected notes as orphans even when old", () => {
    const warnings = evaluateNote(makeNote({
      createdTime: NOW - (90 * DAY),
      modifiedTime: NOW - (90 * DAY),
      outboundLinks: 1,
      latestOutboundLinkTime: NOW - (90 * DAY)
    }), makeSettings(), NOW);

    expect(hasWarning(WarningCategory.ORPHAN, warnings)).toBe(false);
  });

  it("flags atomicity violation by word count", () => {
    const warnings = evaluateNote(makeNote({
      wordCount: 1001,
      headingCount: 1
    }), makeSettings({ atomicityWordCount: 1000 }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(true);
  });

  it("does not flag word count atomicity when word count check is disabled", () => {
    const warnings = evaluateNote(makeNote({
      wordCount: 5000,
      headingCount: 1
    }), makeSettings({ atomicityWordCountEnabled: false }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(false);
  });

  it("flags atomicity violation by configured H1/H2/H3 heading count", () => {
    const warnings = evaluateNote(makeNote({
      wordCount: 100,
      headingCount: 4
    }), makeSettings({ atomicityHeadingCount: 3 }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(true);
  });

  it("does not flag heading atomicity when heading count check is disabled", () => {
    const warnings = evaluateNote(makeNote({
      wordCount: 100,
      headingCount: 20
    }), makeSettings({ atomicityHeadingCountEnabled: false }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(false);
  });

  it("flags atomicity violation by configured list item count", () => {
    const warnings = evaluateNote(makeNote({
      listItemCount: 6
    }), makeSettings({
      atomicityListItemCountEnabled: true,
      atomicityListItemCount: 5
    }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(true);
  });

  it("does not flag list atomicity when list item count check is disabled", () => {
    const warnings = evaluateNote(makeNote({
      listItemCount: 100
    }), makeSettings({
      atomicityListItemCountEnabled: false,
      atomicityListItemCount: 5
    }), NOW);

    expect(hasWarning(WarningCategory.ATOMICITY, warnings)).toBe(false);
  });

  it("flags knowledge sinks with many inbound links and no outbound links", () => {
    const warnings = evaluateNote(makeNote({
      inboundLinks: 6,
      latestInboundLinkTime: NOW - DAY,
      outboundLinks: 0
    }), makeSettings({ blackHoleInboundThreshold: 5 }), NOW);

    expect(hasWarning(WarningCategory.BLACK_HOLE, warnings)).toBe(true);
  });

  it("flags knowledge sinks when inbound links equal the threshold", () => {
    const warnings = evaluateNote(makeNote({
      inboundLinks: 1,
      latestInboundLinkTime: NOW - DAY,
      outboundLinks: 0
    }), makeSettings({ blackHoleInboundThreshold: 1 }), NOW);

    expect(hasWarning(WarningCategory.BLACK_HOLE, warnings)).toBe(true);
  });

  it("does not flag knowledge sink when the note links outward", () => {
    const warnings = evaluateNote(makeNote({
      inboundLinks: 6,
      latestInboundLinkTime: NOW - DAY,
      outboundLinks: 1,
      latestOutboundLinkTime: NOW - DAY
    }), makeSettings({ blackHoleInboundThreshold: 5 }), NOW);

    expect(hasWarning(WarningCategory.BLACK_HOLE, warnings)).toBe(false);
  });

  it("flags notes when decay index reaches the threshold", () => {
    const warnings = evaluateNote(makeNote({
      modifiedTime: NOW - (500 * DAY),
      centralityScore: 0.5,
      noteTypeWeight: 1.5,
      inactiveDays: 500,
      decayIndex: 375
    }), makeSettings({ decayIndexThreshold: 30 }), NOW);

    expect(hasWarning(WarningCategory.DECAY, warnings)).toBe(true);
  });

  it("does not flag decay when decay index is below the threshold", () => {
    const warnings = evaluateNote(makeNote({
      modifiedTime: NOW - (500 * DAY),
      centralityScore: 0.05,
      noteTypeWeight: 0.2,
      inactiveDays: 500,
      decayIndex: 5
    }), makeSettings({ decayIndexThreshold: 30 }), NOW);

    expect(hasWarning(WarningCategory.DECAY, warnings)).toBe(false);
  });

  it("uses plain-language decay warning messages", () => {
    const warnings = evaluateNote(makeNote({
      centralityScore: 0.25,
      noteTypeWeight: 1.5,
      inactiveDays: 100,
      decayIndex: 37.5
    }), makeSettings({ decayIndexThreshold: 30 }), NOW);

    expect(hasWarning(WarningCategory.DECAY, warnings)).toBe(true);
    expect(warnings.find(warning => warning.category === WarningCategory.DECAY)?.message).toContain("100 days");
    expect(warnings.find(warning => warning.category === WarningCategory.DECAY)?.message).toBe("Not been updated 100 days.");
  });

  it("flags unfinished stubs by todo count", () => {
    const warnings = evaluateNote(makeNote({
      todoCount: 2
    }), makeSettings(), NOW);

    expect(hasWarning(WarningCategory.STUB, warnings)).toBe(true);
  });
});
