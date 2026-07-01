import { ItemView, WorkspaceLeaf } from "obsidian";
import { LinterWarning, WarningCategory } from "./types";

export const DASHBOARD_VIEW_TYPE = "linter-dashboard-view";

export class LinterDashboardView extends ItemView {
  private warnings: LinterWarning[] = [];
  private onNoteClick: (path: string) => void;
  private collapsedCategories: Record<string, boolean> = {};

  constructor(leaf: WorkspaceLeaf, onNoteClick: (path: string) => void, initialWarnings: LinterWarning[] = []) {
    super(leaf);
    this.onNoteClick = onNoteClick;
    this.warnings = initialWarnings;
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Note Linter Dashboard";
  }

  getIcon(): string {
    return "alert-triangle";
  }

  updateWarnings(newWarnings: LinterWarning[]) {
    this.warnings = newWarnings;
    this.render();
  }

  async onOpen() {
    this.render();
  }

  async onClose() {
    // Cleanup if needed
  }

  private render() {
    const container = this.containerEl.children[1];
    container.empty();

    const title = container.createEl("h3", { text: "Note Linter Dashboard" });

    if (this.warnings.length === 0) {
      container.createEl("p", { text: "All good! No warnings found." });
      return;
    }

    // Group by category
    const grouped = this.warnings.reduce((acc, warning) => {
      if (!acc[warning.category]) acc[warning.category] = [];
      acc[warning.category].push(warning);
      return acc;
    }, {} as Record<string, LinterWarning[]>);

    for (const category of Object.values(WarningCategory)) {
      const categoryWarnings = grouped[category];
      if (!categoryWarnings || categoryWarnings.length === 0) continue;

      const details = container.createEl("details");
      details.open = !this.collapsedCategories[category];
      details.onToggle = () => {
        this.collapsedCategories[category] = !details.open;
      };

      details.createEl("summary", {
        text: `${category} (${categoryWarnings.length})`
      });

      const ul = details.createEl("ul");
      
      for (const warning of categoryWarnings) {
        const li = ul.createEl("li");
        const link = li.createEl("a", { text: warning.path });
        link.style.cursor = "pointer";
        link.style.textDecoration = "underline";
        link.onclick = () => this.onNoteClick(warning.path);
        
        li.createSpan({ text: " - " });
        this.renderMessage(li, warning.message);
      }
    }
  }

  private renderMessage(container: HTMLElement, message: string) {
    const numberPattern = /\d+(?:\.\d+)?/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = numberPattern.exec(message)) !== null) {
      if (match.index > lastIndex) {
        container.createSpan({ text: message.slice(lastIndex, match.index) });
      }

      const numberText = match[0];
      const span = container.createSpan({ text: numberText });
      if (this.shouldHighlightNumber(message, match.index, match.index + numberText.length)) {
        span.style.color = "var(--text-error)";
        span.style.fontWeight = "600";
      }

      lastIndex = match.index + numberText.length;
    }

    if (lastIndex < message.length) {
      container.createSpan({ text: message.slice(lastIndex) });
    }
  }

  private shouldHighlightNumber(message: string, start: number, end: number): boolean {
    const previous = start > 0 ? message[start - 1] : "";
    const next = end < message.length ? message[end] : "";

    return !/[A-Za-z/]/.test(previous) && !/[A-Za-z/]/.test(next);
  }
}
