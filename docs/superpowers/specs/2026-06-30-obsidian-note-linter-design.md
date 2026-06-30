# Obsidian Note Linter Plugin - Design Specification

## Overview
A passive "Note Linter" for Obsidian that evaluates notes based on structural health metrics and surfaces warnings (Anti-patterns/Bad Smells) without automatically modifying user notes. It acts similarly to a code linter, helping knowledge workers maintain a healthy knowledge graph.

## Architecture & Data Flow
- **Event-Driven Background Linter**: The core mechanism relies on background event listening to provide real-time IDE-like feedback without degrading performance.
- **Cache Manager**: Maintains a hidden `note-linter-cache.json` file in the plugin's folder to store historical and network metrics (timestamps, inbound/outbound link counts, MOC entries). 
- **Initialization**: On plugin load, it reads the JSON cache, compares it with Obsidian's internal `MetadataCache`, and processes only the differential updates (files changed while Obsidian was closed).
- **Event Listeners**: Hooks into Obsidian's `on('modify')`, `on('create')`, `on('delete')`, and `on('rename')` workspace events. Processing is debounced (e.g., 2 seconds) to prevent performance hits during active typing.

## Linter Rules & Metrics
The Linter Engine evaluates notes against 5 core rules. All thresholds are user-configurable in the settings with sensible defaults:

1. **Orphan / Dead Note**: 
   - *Condition*: Note age > `X` days AND Inbound Links = 0 AND Outbound Links = 0 AND not linked by any MOC note.
   - *Purpose*: Identify notes that are isolated from the knowledge graph.
2. **Atomicity Violation**: 
   - *Condition*: Word count > `X` (e.g., 1000) OR specific Header count (H1/H2) > `Y`.
   - *Purpose*: Warn when a single note becomes too broad and should be refactored into smaller, atomic notes.
3. **Knowledge Sink (Black Hole)**: 
   - *Condition*: Inbound Links > `X` AND Outbound Links = 0.
   - *Purpose*: Identify notes that attract many links but fail to push thought forward to other concepts.
4. **Knowledge Decay**: 
   - *Condition*: High-value note (Inbound Links > `X` OR linked by an MOC) AND last modified time > `Z` days (e.g., 365 days).
   - *Purpose*: Highlight important concepts that might be outdated and require a review.
5. **Unfinished Stubs**: 
   - *Condition*: Note contains `#todo` tags or `- [ ]` markdown checkboxes.
   - *Purpose*: Surface knowledge gaps directly in the dashboard.

## UI Components & Exclusions
- **Linter Dashboard (Custom View)**: A dedicated view in the right sidebar. Groups warnings by category (e.g., "Knowledge Decay", "Atomicity Violation"). Clicking a note name in the dashboard opens the note in the main workspace.
- **Status Bar Indicator**: An unobtrusive summary (e.g., "Linter: 3 Warnings") at the bottom of the Obsidian window. Clicking it toggles the Dashboard.
- **MOC Identification**: "Map of Content" or Index notes are identified purely by user-configurable tags (defaulting to `#MOC` or `#Index`).
- **Exclusion Rules**: A settings tab allows users to define specific folders (e.g., `Daily Notes/`) and tags (e.g., `#journal`) that bypass the Linter entirely, preventing warning fatigue on non-evergreen notes.

## Edge Cases & Error Handling
- **Chunking / Yielding**: During the initial full-vault scan (especially for vaults >10,000 notes), processing is chunked via `requestAnimationFrame` or `setTimeout` to prevent the UI from freezing. A small "Indexing..." status is shown during this phase.
- **Ghost Data Prevention**: The `Cache Manager` immediately wipes or updates entries on `on('delete')` and `on('rename')` to prevent un-clickable "ghost" warnings in the Dashboard.
- **Cache Recovery**: A "Rebuild Linter Cache" button in the settings pane allows users to wipe the `note-linter-cache.json` file and trigger a clean full-vault scan if the state becomes desynchronized due to unexpected crashes.
