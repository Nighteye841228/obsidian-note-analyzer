import { Plugin, TFile, WorkspaceLeaf, debounce } from "obsidian";
import { LinterSettings, NoteMetrics, LinterWarning } from "./types";
import { DEFAULT_SETTINGS } from "./constants";
import { evaluateNote } from "./rules";
import { LinterDashboardView, DASHBOARD_VIEW_TYPE } from "./dashboard";
import { LinterSettingTab } from "./settings";

export default class NoteLinterPlugin extends Plugin {
  settings: LinterSettings;
  metricsCache: Record<string, NoteMetrics> = {};
  activeWarnings: LinterWarning[] = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new LinterSettingTab(this.app, this));

    this.registerView(
      DASHBOARD_VIEW_TYPE,
      (leaf) => new LinterDashboardView(leaf, this.openNote.bind(this))
    );

    this.addRibbonIcon("alert-triangle", "Open Note Linter", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-linter-dashboard",
      name: "Open Dashboard",
      callback: () => {
        this.activateView();
      }
    });

    // We wait for the workspace to be fully ready before indexing
    this.app.workspace.onLayoutReady(() => {
      this.runFullScan();
    });

    // Debounced scan function to avoid lagging while typing
    const debouncedScan = debounce(() => {
      this.runFullScan();
    }, 2000, true);

    this.registerEvent(this.app.metadataCache.on("resolved", () => {
       debouncedScan();
    }));
    
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof TFile) {
        delete this.metricsCache[file.path];
        debouncedScan();
      }
    }));
    
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof TFile) {
        delete this.metricsCache[oldPath];
        debouncedScan();
      }
    }));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.runFullScan();
  }

  async activateView() {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
    
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
    }
    
    workspace.revealLeaf(leaf);
  }

  private openNote(path: string) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      this.app.workspace.getLeaf(false).openFile(file);
    }
  }

  private isExcluded(file: TFile): boolean {
    for (const folder of this.settings.excludedFolders) {
      if (file.path.startsWith(folder)) return true;
    }
    const tags = this.app.metadataCache.getFileCache(file)?.tags || [];
    for (const excludedTag of this.settings.excludedTags) {
      if (tags.some(t => t.tag === excludedTag)) return true;
    }
    return false;
  }

  private isMoc(file: TFile): boolean {
    const tags = this.app.metadataCache.getFileCache(file)?.tags || [];
    return this.settings.mocTags.some(mocTag => tags.some(t => t.tag === mocTag));
  }

  public runFullScan() {
    const files = this.app.vault.getMarkdownFiles();
    this.metricsCache = {};
    const newWarnings: LinterWarning[] = [];
    
    // First pass: collect link relationships
    const inboundCounts: Record<string, number> = {};
    const mocEntryCounts: Record<string, number> = {};
    
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      
      const isFileMoc = this.isMoc(file);
      const links = cache.links || [];
      
      for (const link of links) {
        // Resolve link to actual file path
        const targetPath = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path)?.path;
        if (targetPath) {
          inboundCounts[targetPath] = (inboundCounts[targetPath] || 0) + 1;
          if (isFileMoc) {
            mocEntryCounts[targetPath] = (mocEntryCounts[targetPath] || 0) + 1;
          }
        }
      }
    }

    // Second pass: evaluate files
    const now = Date.now();
    for (const file of files) {
      if (this.isExcluded(file)) continue;

      const cache = this.app.metadataCache.getFileCache(file);
      const stat = file.stat;
      
      const outboundLinks = cache?.links?.length || 0;
      const headers = cache?.headings?.filter(h => h.level === 1 || h.level === 2).length || 0;
      
      // Simple word count heuristic based on stat.size since we don't want to read every file's content
      // 1 word ~= 5 bytes
      const estimatedWordCount = Math.floor(stat.size / 5);
      
      // Checkboxes (approximate via task cache if present)
      const todoCount = cache?.listItems?.filter(item => item.task !== undefined).length || 0;

      const metric: NoteMetrics = {
        path: file.path,
        createdTime: stat.ctime,
        modifiedTime: stat.mtime,
        inboundLinks: inboundCounts[file.path] || 0,
        outboundLinks: outboundLinks,
        mocEntries: mocEntryCounts[file.path] || 0,
        wordCount: estimatedWordCount,
        headerCount: headers,
        todoCount: todoCount
      };
      
      this.metricsCache[file.path] = metric;
      
      const warnings = evaluateNote(metric, this.settings, now);
      newWarnings.push(...warnings);
    }
    
    this.activeWarnings = newWarnings;
    
    // Update UI
    const leaves = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof LinterDashboardView) {
        leaf.view.updateWarnings(this.activeWarnings);
      }
    }
  }
}
