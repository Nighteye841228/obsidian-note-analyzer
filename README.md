# Note Linter Usage Guide

Note Linter is a passive Obsidian note-quality checker. It does not rewrite or reorganize your notes. It behaves like a code linter: it scans note structure, links, and maintenance signals, then surfaces warnings for you to review.

## Enable The Plugin

1. Enable Community plugins in Obsidian.
2. Install or load `obsidian-note-linter`.
3. Open the command palette and run `Open Dashboard`, or click the warning icon in the left ribbon.
4. To rescan the vault, click `Rebuild Cache` in the plugin settings.

## Dashboard

The dashboard groups warnings by category:

- `Orphan Note`
- `Atomicity Violation`
- `Knowledge Sink`
- `Knowledge Decay`
- `Unfinished Stub`

Each category can be expanded or collapsed. The category title shows the warning count. Important numeric values inside warning messages are highlighted in red for easier scanning.

Click a note path to open that note in the main workspace.

## Warning Types

### Orphan Note

A note is older than the configured age threshold, has no outbound links, has no inbound links, and is not listed by a MOC/Index note.

This usually means the note has not entered the knowledge graph.

### Atomicity Violation

A note may be too large or may contain too many concepts. The plugin can check three independent conditions:

- Word count exceeds a custom value
- H1/H2/H3 heading count exceeds a custom value
- List item count exceeds a custom value

Each condition can be enabled or disabled separately.

### Knowledge Sink

Many notes link to this note, but this note links to nothing else.

This can indicate a knowledge black hole: the note receives references but does not push thinking forward to related concepts.

### Knowledge Decay

A note has not been updated for a long time and is structurally important in the vault graph.

The dashboard shows a short message, for example:

```text
Not been updated 100 days.
```

Internally, the plugin calculates a Decay Index:

```text
Decay Index = inactive days x centrality score x note type weight
```

`Decay Index Threshold` is not a number of days. It is a warning sensitivity score. Lower values show more decay warnings. Higher values show only stale notes that are more central in your vault.

### Unfinished Stub

The note contains unfinished items, such as markdown task checkboxes.

## Main Settings

### Debug Logging

When enabled, scan details are printed to the Obsidian developer console, including note metrics, warnings, and `topDecayScores`.

### Orphan Days Threshold

How old an isolated note must be before it is flagged as an orphan.

### Black Hole Inbound Threshold

The minimum inbound link count required for a note with no outbound links to be flagged as a Knowledge Sink.

For example, if this is set to `1`, a note with at least 1 inbound link and 0 outbound links will be flagged.

### Decay Index Threshold

The warning score threshold for Knowledge Decay. This is not a day count.

Suggested tuning:

- Too many warnings: increase it, for example `50` or `100`
- Too few warnings: decrease it, for example `10` or `20`
- Default: `30`

### Decay Weights

Type weights used by the decay model:

- `MOC Decay Weight`
- `Default Decay Weight`
- `Evergreen Decay Weight`
- `Literature Decay Weight`

MOC notes are weighted higher by default. Literature/source notes are weighted lower by default.

### MOC / Index Tags

Tags used to identify MOC or Index notes. Default:

```text
#MOC, #Index
```

### Excluded Folders / Excluded Tags

Use these to skip areas such as daily notes, journals, templates, or other non-evergreen material.

## Troubleshooting

### The Dashboard Shows No Warnings

1. Confirm the plugin is enabled.
2. Click `Rebuild Cache`.
3. Enable `Debug Logging`.
4. Open the developer console and search for:

```text
[Note Linter]
```

### Knowledge Sink Does Not Trigger

Check that the note:

- Has inbound link count greater than or equal to `Black Hole Inbound Threshold`
- Has no outbound links

### Knowledge Decay Does Not Trigger

Decay does not only check age. In the debug console, inspect `topDecayScores` and compare the note's `decayIndex` to `Decay Index Threshold`.

