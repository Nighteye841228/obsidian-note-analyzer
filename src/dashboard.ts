import { ItemView, WorkspaceLeaf } from "obsidian";
import { LinterWarning, WarningCategory } from "./types";

export const DASHBOARD_VIEW_TYPE = "linter-dashboard-view";

export class LinterDashboardView extends ItemView {
  private warnings: LinterWarning[] = [];
  private onNoteClick: (path: string) => void;

  constructor(leaf: WorkspaceLeaf, onNoteClick: (path: string) => void) {
    super(leaf);
    this.onNoteClick = onNoteClick;
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

      container.createEl("h4", { text: category });
      const ul = container.createEl("ul");
      
      for (const warning of categoryWarnings) {
        const li = ul.createEl("li");
        const link = li.createEl("a", { text: warning.path });
        link.style.cursor = "pointer";
        link.style.textDecoration = "underline";
        link.onclick = () => this.onNoteClick(warning.path);
        
        li.createSpan({ text: ` - ${warning.message}` });
      }
    }
  }
}
