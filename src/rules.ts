import { NoteMetrics, LinterSettings, LinterWarning, WarningCategory } from "./types";

export function evaluateNote(note: NoteMetrics, settings: LinterSettings, currentTime: number): LinterWarning[] {
  const warnings: LinterWarning[] = [];
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  
  const ageInDays = (currentTime - note.createdTime) / DAY_IN_MS;
  const inactiveDays = (currentTime - note.modifiedTime) / DAY_IN_MS;

  // 1. Orphan Rule
  if (ageInDays > settings.orphanDaysThreshold && note.inboundLinks === 0 && note.outboundLinks === 0 && note.mocEntries === 0) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ORPHAN,
      message: `Note is ${Math.floor(ageInDays)} days old with 0 connections.`
    });
  }

  // 2. Atomicity Violation
  if (note.wordCount > settings.atomicityWordCount) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ATOMICITY,
      message: `Word count (${note.wordCount}) exceeds threshold (${settings.atomicityWordCount}).`
    });
  } else if (note.headerCount > settings.atomicityHeaderCount) {
    warnings.push({
      path: note.path,
      category: WarningCategory.ATOMICITY,
      message: `Header count (${note.headerCount}) exceeds threshold (${settings.atomicityHeaderCount}).`
    });
  }

  // 3. Knowledge Sink
  if (note.inboundLinks > settings.blackHoleInboundThreshold && note.outboundLinks === 0) {
    warnings.push({
      path: note.path,
      category: WarningCategory.BLACK_HOLE,
      message: `Has ${note.inboundLinks} inbound links but 0 outbound links.`
    });
  }

  // 4. Knowledge Decay
  const isHighValue = note.inboundLinks > settings.decayInboundThreshold || note.mocEntries > 0;
  if (isHighValue && inactiveDays > settings.decayDaysThreshold) {
    warnings.push({
      path: note.path,
      category: WarningCategory.DECAY,
      message: `High value note has not been updated in ${Math.floor(inactiveDays)} days.`
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
