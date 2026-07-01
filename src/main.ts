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
      (leaf) => new LinterDashboardView(leaf, this.openNote.bind(this), this.activeWarnings)
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

  private debug(message: string, data?: unknown) {
    if (!this.settings.debugLogging) return;

    if (data === undefined) {
      console.log(`[Note Linter] ${message}`);
      return;
    }

    console.log(`[Note Linter] ${message}`, data);
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

  private getFileTags(file: TFile): string[] {
    return (this.app.metadataCache.getFileCache(file)?.tags || []).map(tag => tag.tag);
  }

  private getDecayTypeWeight(file: TFile): number {
    const tags = this.getFileTags(file);

    if (this.settings.mocTags.some(mocTag => tags.includes(mocTag))) {
      return this.settings.decayMocWeight;
    }

    if (this.settings.decayLiteratureTags.some(tag => tags.includes(tag))) {
      return this.settings.decayLiteratureWeight;
    }

    if (this.settings.decayEvergreenTags.some(tag => tags.includes(tag))) {
      return this.settings.decayEvergreenWeight;
    }

    return this.settings.decayDefaultWeight;
  }

  private calculateEigenvectorCentrality(paths: string[], graph: Record<string, Set<string>>): Record<string, number> {
    if (paths.length === 0) return {};

    let scores = Object.fromEntries(paths.map(path => [path, 1 / Math.sqrt(paths.length)])) as Record<string, number>;

    for (let i = 0; i < 20; i++) {
      const nextScores: Record<string, number> = {};

      for (const path of paths) {
        const neighbors = graph[path] || new Set<string>();
        let score = 0.15;

        for (const neighbor of neighbors) {
          score += 0.85 * (scores[neighbor] || 0);
        }

        nextScores[path] = score;
      }

      const magnitude = Math.sqrt(Object.values(nextScores).reduce((sum, score) => sum + (score * score), 0)) || 1;
      scores = Object.fromEntries(paths.map(path => [path, nextScores[path] / magnitude])) as Record<string, number>;
    }

    return scores;
  }

  public runFullScan() {
    const files = this.app.vault.getMarkdownFiles();
    const filePaths = new Set(files.map(file => file.path));
    this.metricsCache = {};
    const newWarnings: LinterWarning[] = [];
    this.debug("Starting full scan", {
      totalMarkdownFiles: files.length,
      settings: this.settings
    });
    
    // First pass: collect link relationships
    const inboundCounts: Record<string, number> = {};
    const latestInboundLinkTimes: Record<string, number> = {};
    const mocEntryCounts: Record<string, number> = {};
    const latestMocEntryTimes: Record<string, number> = {};
    const linkGraph: Record<string, Set<string>> = {};

    for (const file of files) {
      linkGraph[file.path] = new Set<string>();
    }
    
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
          latestInboundLinkTimes[targetPath] = Math.max(latestInboundLinkTimes[targetPath] || 0, file.stat.mtime);
          if (filePaths.has(targetPath)) {
            linkGraph[file.path].add(targetPath);
            linkGraph[targetPath].add(file.path);
          }
          if (isFileMoc) {
            mocEntryCounts[targetPath] = (mocEntryCounts[targetPath] || 0) + 1;
            latestMocEntryTimes[targetPath] = Math.max(latestMocEntryTimes[targetPath] || 0, file.stat.mtime);
          }
        }
      }
    }

    const centralityScores = this.calculateEigenvectorCentrality(files.map(file => file.path), linkGraph);

    // Second pass: evaluate files
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (this.isExcluded(file)) continue;

      const cache = this.app.metadataCache.getFileCache(file);
      const stat = file.stat;
      
      const outboundLinks = cache?.links?.length || 0;
      const latestOutboundLinkTime = outboundLinks > 0 ? stat.mtime : null;
      const headings = cache?.headings?.filter(h => h.level === 1 || h.level === 2 || h.level === 3).length || 0;
      
      // Simple word count heuristic based on stat.size since we don't want to read every file's content
      // 1 word ~= 5 bytes
      const estimatedWordCount = Math.floor(stat.size / 5);
      
      // Checkboxes (approximate via task cache if present)
      const listItemCount = cache?.listItems?.length || 0;
      const todoCount = cache?.listItems?.filter(item => item.task !== undefined).length || 0;
      const inactiveDays = (now - stat.mtime) / dayInMs;
      const centralityScore = centralityScores[file.path] || 0;
      const noteTypeWeight = this.getDecayTypeWeight(file);
      const decayIndex = Math.max(0, inactiveDays) * centralityScore * noteTypeWeight;

      const metric: NoteMetrics = {
        path: file.path,
        createdTime: stat.ctime,
        modifiedTime: stat.mtime,
        inboundLinks: inboundCounts[file.path] || 0,
        latestInboundLinkTime: latestInboundLinkTimes[file.path] || null,
        outboundLinks: outboundLinks,
        latestOutboundLinkTime,
        mocEntries: mocEntryCounts[file.path] || 0,
        latestMocEntryTime: latestMocEntryTimes[file.path] || null,
        wordCount: estimatedWordCount,
        headingCount: headings,
        listItemCount,
        todoCount: todoCount,
        centralityScore,
        noteTypeWeight,
        inactiveDays: Math.max(0, inactiveDays),
        decayIndex
      };
      
      this.metricsCache[file.path] = metric;
      
      const warnings = evaluateNote(metric, this.settings, now);
      newWarnings.push(...warnings);

      if (warnings.length > 0) {
        this.debug(`Warnings for ${file.path}`, {
          metric,
          warnings
        });
      }
    }
    
    this.activeWarnings = newWarnings;
    this.debug("Finished full scan", {
      evaluatedNotes: Object.keys(this.metricsCache).length,
      warningCount: this.activeWarnings.length,
      topDecayScores: Object.values(this.metricsCache)
        .sort((a, b) => b.decayIndex - a.decayIndex)
        .slice(0, 10)
        .map(metric => ({
          path: metric.path,
          decayIndex: Number(metric.decayIndex.toFixed(2)),
          inactiveDays: Math.floor(metric.inactiveDays),
          centralityScore: Number(metric.centralityScore.toFixed(3)),
          noteTypeWeight: metric.noteTypeWeight
        })),
      warningsByCategory: this.activeWarnings.reduce((acc, warning) => {
        acc[warning.category] = (acc[warning.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Update UI
    const leaves = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof LinterDashboardView) {
        leaf.view.updateWarnings(this.activeWarnings);
      }
    }
  }
}
