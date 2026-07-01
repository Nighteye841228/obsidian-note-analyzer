import { App, PluginSettingTab, Setting } from "obsidian";
import NoteLinterPlugin from "./main";

export class LinterSettingTab extends PluginSettingTab {
  plugin: NoteLinterPlugin;

  constructor(app: App, plugin: NoteLinterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Note Linter Settings" });

    new Setting(containerEl)
      .setName("Debug Logging")
      .setDesc("Print scan details and warning decisions to the developer console.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.debugLogging)
        .onChange(async (value) => {
          this.plugin.settings.debugLogging = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Warning Thresholds" });

    new Setting(containerEl)
      .setName("Orphan Days Threshold")
      .setDesc("Number of days before an isolated note is flagged as an orphan")
      .addText(text => text
        .setValue(String(this.plugin.settings.orphanDaysThreshold))
        .onChange(async (value) => {
          const num = this.parsePositiveInteger(value);
          if (!isNaN(num)) {
            this.plugin.settings.orphanDaysThreshold = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Black Hole Inbound Threshold")
      .setDesc("Minimum inbound links needed before a note with no outbound links is flagged as a knowledge sink.")
      .addText(text => text
        .setValue(String(this.plugin.settings.blackHoleInboundThreshold))
        .onChange(async (value) => {
          const num = this.parsePositiveInteger(value);
          if (!isNaN(num)) {
            this.plugin.settings.blackHoleInboundThreshold = num;
            await this.plugin.saveSettings();
          }
        }));

    containerEl.createEl("h3", { text: "Knowledge Decay" });

    new Setting(containerEl)
      .setName("Decay Index Threshold")
      .setDesc("Warning sensitivity score, not days. Lower values show more decay warnings; higher values only show stale notes that are more central in your vault. Default: 30.")
      .addText(text => text
        .setValue(String(this.plugin.settings.decayIndexThreshold))
        .onChange(async (value) => {
          const num = this.parseNonNegativeNumber(value);
          if (!isNaN(num)) {
            this.plugin.settings.decayIndexThreshold = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("MOC Decay Weight")
      .setDesc("Type weight for notes tagged as MOC/Index.")
      .addText(text => text
        .setValue(String(this.plugin.settings.decayMocWeight))
        .onChange(async (value) => {
          const num = this.parseNonNegativeNumber(value);
          if (!isNaN(num)) {
            this.plugin.settings.decayMocWeight = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Default Decay Weight")
      .setDesc("Type weight for ordinary notes.")
      .addText(text => text
        .setValue(String(this.plugin.settings.decayDefaultWeight))
        .onChange(async (value) => {
          const num = this.parseNonNegativeNumber(value);
          if (!isNaN(num)) {
            this.plugin.settings.decayDefaultWeight = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Evergreen Decay Weight")
      .setDesc("Type weight for notes matching evergreen tags.")
      .addText(text => text
        .setValue(String(this.plugin.settings.decayEvergreenWeight))
        .onChange(async (value) => {
          const num = this.parseNonNegativeNumber(value);
          if (!isNaN(num)) {
            this.plugin.settings.decayEvergreenWeight = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Literature Decay Weight")
      .setDesc("Type weight for notes matching literature/source tags.")
      .addText(text => text
        .setValue(String(this.plugin.settings.decayLiteratureWeight))
        .onChange(async (value) => {
          const num = this.parseNonNegativeNumber(value);
          if (!isNaN(num)) {
            this.plugin.settings.decayLiteratureWeight = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Evergreen Tags")
      .setDesc("Comma-separated tags using the evergreen decay weight.")
      .addText(text => text
        .setValue(this.plugin.settings.decayEvergreenTags.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.decayEvergreenTags = this.parseCsv(value);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Literature Tags")
      .setDesc("Comma-separated tags using the literature decay weight.")
      .addText(text => text
        .setValue(this.plugin.settings.decayLiteratureTags.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.decayLiteratureTags = this.parseCsv(value);
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Atomicity" });

    new Setting(containerEl)
      .setName("Check Word Count")
      .setDesc("Flag notes when estimated word count exceeds a custom value.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.atomicityWordCountEnabled)
        .onChange(async (value) => {
          this.plugin.settings.atomicityWordCountEnabled = value;
          await this.plugin.saveSettings();
        }))
      .addText(text => text
        .setValue(String(this.plugin.settings.atomicityWordCount))
        .onChange(async (value) => {
          const num = this.parsePositiveInteger(value);
          if (!isNaN(num)) {
            this.plugin.settings.atomicityWordCount = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Check H1/H2/H3 Count")
      .setDesc("Flag notes when major heading count exceeds a custom value.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.atomicityHeadingCountEnabled)
        .onChange(async (value) => {
          this.plugin.settings.atomicityHeadingCountEnabled = value;
          await this.plugin.saveSettings();
        }))
      .addText(text => text
        .setValue(String(this.plugin.settings.atomicityHeadingCount))
        .onChange(async (value) => {
          const num = this.parsePositiveInteger(value);
          if (!isNaN(num)) {
            this.plugin.settings.atomicityHeadingCount = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName("Check List Item Count")
      .setDesc("Flag notes when bullet, numbered, or task list items exceed a custom value.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.atomicityListItemCountEnabled)
        .onChange(async (value) => {
          this.plugin.settings.atomicityListItemCountEnabled = value;
          await this.plugin.saveSettings();
        }))
      .addText(text => text
        .setValue(String(this.plugin.settings.atomicityListItemCount))
        .onChange(async (value) => {
          const num = this.parsePositiveInteger(value);
          if (!isNaN(num)) {
            this.plugin.settings.atomicityListItemCount = num;
            await this.plugin.saveSettings();
          }
        }));

    containerEl.createEl("h3", { text: "Scope" });

    new Setting(containerEl)
      .setName("MOC / Index Tags")
      .setDesc("Comma-separated tags used to identify index notes, for example: #MOC, #Index")
      .addText(text => text
        .setValue(this.plugin.settings.mocTags.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.mocTags = this.parseCsv(value);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Excluded Folders")
      .setDesc("Comma-separated folder prefixes to skip, for example: Daily Notes, Templates")
      .addText(text => text
        .setValue(this.plugin.settings.excludedFolders.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.excludedFolders = this.parseCsv(value);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Excluded Tags")
      .setDesc("Comma-separated tags to skip, for example: #journal, #fleeting")
      .addText(text => text
        .setValue(this.plugin.settings.excludedTags.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.excludedTags = this.parseCsv(value);
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Maintenance" });

    new Setting(containerEl)
      .setName("Rebuild Cache")
      .setDesc("Force a full rescan of the vault.")
      .addButton(btn => btn
        .setButtonText("Rebuild")
        .setCta()
        .onClick(() => {
          this.plugin.runFullScan();
        }));
  }

  private parsePositiveInteger(value: string): number {
    const num = parseInt(value.trim(), 10);
    return num >= 0 ? num : NaN;
  }

  private parseNonNegativeNumber(value: string): number {
    const num = Number(value.trim());
    return Number.isFinite(num) && num >= 0 ? num : NaN;
  }

  private parseCsv(value: string): string[] {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
}
