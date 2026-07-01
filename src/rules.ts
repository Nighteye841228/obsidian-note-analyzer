import { NoteMetrics, LinterSettings, LinterWarning, WarningCategory } from "./types";

export function evaluateNote(note: NoteMetrics, settings: LinterSettings, currentTime: number): LinterWarning[] {
  const warnings: LinterWarning[] = [];
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  
  const ageInDays = (currentTime - note.createdTime) / DAY_IN_MS;

  // 1. Orphan Rule
  if (ageInDays > settings.orphanDaysThreshold && note.inboundLinks === 0 && note.outboundLinks === 0 && note.mocEntries === 0) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ORPHAN,
      message: `Note is ${Math.floor(ageInDays)} days old with 0 connections.`
    });
  }

  // 2. Atomicity Violation
  if (settings.atomicityWordCountEnabled && note.wordCount > settings.atomicityWordCount) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ATOMICITY,
      message: `Word count (${note.wordCount}) exceeds threshold (${settings.atomicityWordCount}).`
    });
  }

  if (settings.atomicityHeadingCountEnabled && note.headingCount > settings.atomicityHeadingCount) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ATOMICITY,
      message: `H1/H2/H3 heading count (${note.headingCount}) exceeds threshold (${settings.atomicityHeadingCount}).`
    });
  }

  if (settings.atomicityListItemCountEnabled && note.listItemCount > settings.atomicityListItemCount) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ATOMICITY,
      message: `List item count (${note.listItemCount}) exceeds threshold (${settings.atomicityListItemCount}).`
    });
  }

  // 3. Knowledge Sink
  if (note.inboundLinks >= settings.blackHoleInboundThreshold && note.outboundLinks === 0) {
    warnings.push({
      path: note.path,
      category: WarningCategory.BLACK_HOLE,
      message: `Has ${note.inboundLinks} inbound links but 0 outbound links.`
    });
  }

  // 4. Knowledge Decay
  if (note.decayIndex >= settings.decayIndexThreshold) {
    warnings.push({
      path: note.path,
      category: WarningCategory.DECAY,
      message: `Not been updated ${Math.floor(note.inactiveDays)} days.`
    });
  }

  // 5. Unfinished Stub
  if (note.todoCount > 0) {
    warnings.push({
      path: note.path,
      category: WarningCategory.STUB,
      message: `Contains ${note.todoCount} unfinished TODOs.`
    });
  }

  return warnings;
}
