import { evaluateNote } from "../src/rules";
import { NoteMetrics, LinterSettings, WarningCategory } from "../src/types";
import { DEFAULT_SETTINGS } from "../src/constants";

describe("evaluateNote", () => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  it("should detect an orphan note", () => {
    const note: NoteMetrics = {
      path: "orphan.md",
      createdTime: now - (40 * DAY),
      modifiedTime: now - (40 * DAY),
      inboundLinks: 0,
      outboundLinks: 0,
      mocEntries: 0,
      wordCount: 100,
      headerCount: 1,
      todoCount: 0
    };
    
    const warnings = evaluateNote(note, DEFAULT_SETTINGS, now);
    expect(warnings.length).toBe(1);
    expect(warnings[0].category).toBe(WarningCategory.ORPHAN);
  });

  it("should not flag a new note as orphan", () => {
    const note: NoteMetrics = {
      path: "new.md",
      createdTime: now - (5 * DAY),
      modifiedTime: now - (5 * DAY),
      inboundLinks: 0,
      outboundLinks: 0,
      mocEntries: 0,
      wordCount: 100,
      headerCount: 1,
      todoCount: 0
    };
    
    const warnings = evaluateNote(note, DEFAULT_SETTINGS, now);
    expect(warnings.length).toBe(0);
  });
});
