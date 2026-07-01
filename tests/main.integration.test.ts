import { LinterDashboardView } from "../src/dashboard";
import { DEFAULT_SETTINGS } from "../src/constants";
import NoteLinterPlugin from "../src/main";
import { WarningCategory } from "../src/types";
import { DAY, NOW } from "./testUtils";

jest.mock("obsidian", () => {
  class Plugin {
    app: unknown;
    async loadData() {
      return {};
    }
    async saveData() {
      return undefined;
    }
    addSettingTab() {
      return undefined;
    }
    registerView() {
      return undefined;
    }
    addRibbonIcon() {
      return undefined;
    }
    addCommand() {
      return undefined;
    }
    registerEvent() {
      return undefined;
    }
  }

  class TFile {
    path: string;
    stat: { ctime: number; mtime: number; size: number };
    constructor(path: string, stat: { ctime: number; mtime: number; size: number }) {
      this.path = path;
      this.stat = stat;
    }
  }

  return {
    Plugin,
    TFile,
    ItemView: class {},
    WorkspaceLeaf: class {},
    PluginSettingTab: class {
      app: unknown;
      plugin: unknown;
      constructor(app: unknown, plugin: unknown) {
        this.app = app;
        this.plugin = plugin;
      }
    },
    Setting: class {},
    debounce: (fn: () => void) => fn
  };
}, { virtual: true });

type TestFile = {
  path: string;
  stat: { ctime: number; mtime: number; size: number };
};

function makeFile(path: string, ageDays: number, size = 500): TestFile {
  const time = NOW - (ageDays * DAY);
  return {
    path,
    stat: {
      ctime: time,
      mtime: time,
      size
    }
  };
}

function makeApp(files: TestFile[], caches: Record<string, any>) {
  const filesByPath = new Map(files.map(file => [file.path, file]));

  return {
    vault: {
      getMarkdownFiles: jest.fn(() => files),
      getAbstractFileByPath: jest.fn((path: string) => filesByPath.get(path))
    },
    metadataCache: {
      getFileCache: jest.fn((file: TestFile) => caches[file.path]),
      getFirstLinkpathDest: jest.fn((link: string) => {
        const normalizedPath = link.endsWith(".md") ? link : `${link}.md`;
        return filesByPath.get(normalizedPath) || null;
      })
    },
    workspace: {
      getLeavesOfType: jest.fn(() => [])
    }
  };
}

describe("NoteLinterPlugin integration scan", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds metrics from Obsidian metadata and evaluates warnings", () => {
    const files = [
      makeFile("Index.md", 2, 100),
      makeFile("Sink.md", 400, 200),
      makeFile("Atomic.md", 5, 200),
      makeFile("Orphan.md", 60, 200),
      makeFile("Daily Notes/Excluded.md", 60, 200)
    ];
    const app = makeApp(files, {
      "Index.md": {
        tags: [{ tag: "#Index" }],
        links: [{ link: "Sink" }],
        headings: [{ level: 1 }],
        listItems: []
      },
      "Sink.md": {
        tags: [],
        links: [],
        headings: [{ level: 1 }],
        listItems: []
      },
      "Atomic.md": {
        tags: [],
        links: [{ link: "Index" }],
        headings: [{ level: 1 }, { level: 2 }, { level: 2 }, { level: 2 }],
        listItems: [{ task: "" }]
      },
      "Orphan.md": {
        tags: [],
        links: [],
        headings: [{ level: 1 }],
        listItems: []
      },
      "Daily Notes/Excluded.md": {
        tags: [],
        links: [],
        headings: [{ level: 1 }],
        listItems: []
      }
    });

    const plugin = new NoteLinterPlugin();
    (plugin as any).app = app;
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      blackHoleInboundThreshold: 1,
      atomicityHeadingCount: 3
    };

    plugin.runFullScan();

    expect(plugin.metricsCache["Sink.md"]).toEqual(expect.objectContaining({
      inboundLinks: 1,
      latestInboundLinkTime: files[0].stat.mtime,
      mocEntries: 1,
      latestMocEntryTime: files[0].stat.mtime,
      centralityScore: expect.any(Number),
      noteTypeWeight: DEFAULT_SETTINGS.decayDefaultWeight,
      decayIndex: expect.any(Number)
    }));
    expect(plugin.metricsCache["Atomic.md"]).toEqual(expect.objectContaining({
      outboundLinks: 1,
      latestOutboundLinkTime: files[2].stat.mtime,
      headingCount: 4,
      listItemCount: 1,
      todoCount: 1
    }));
    expect(plugin.metricsCache["Daily Notes/Excluded.md"]).toBeUndefined();

    expect(plugin.activeWarnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "Sink.md", category: WarningCategory.BLACK_HOLE }),
      expect.objectContaining({ path: "Atomic.md", category: WarningCategory.ATOMICITY }),
      expect.objectContaining({ path: "Atomic.md", category: WarningCategory.STUB }),
      expect.objectContaining({ path: "Orphan.md", category: WarningCategory.ORPHAN })
    ]));
  });

  it("refreshes open dashboard views after scanning", () => {
    const files = [makeFile("Orphan.md", 60, 100)];
    const dashboard = {
      updateWarnings: jest.fn()
    };
    Object.setPrototypeOf(dashboard, LinterDashboardView.prototype);

    const app = makeApp(files, {
      "Orphan.md": {
        tags: [],
        links: [],
        headings: [],
        listItems: []
      }
    });
    app.workspace.getLeavesOfType = jest.fn(() => [{ view: dashboard }]);

    const plugin = new NoteLinterPlugin();
    (plugin as any).app = app;
    plugin.settings = DEFAULT_SETTINGS;

    plugin.runFullScan();

    expect(dashboard.updateWarnings).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ path: "Orphan.md", category: WarningCategory.ORPHAN })
    ]));
  });

  it("passes existing warnings into newly created dashboard views", () => {
    const plugin = new NoteLinterPlugin();
    plugin.activeWarnings = [
      {
        path: "Atomic.md",
        category: WarningCategory.ATOMICITY,
        message: "Header count exceeds threshold."
      }
    ];

    const dashboard = new LinterDashboardView({} as any, jest.fn(), plugin.activeWarnings);

    expect((dashboard as any).warnings).toEqual(plugin.activeWarnings);
  });
});
