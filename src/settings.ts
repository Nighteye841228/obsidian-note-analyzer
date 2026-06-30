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

    new Setting(containerEl)
      .setName("Orphan Days Threshold")
      .setDesc("Number of days before an isolated note is flagged as an orphan")
      .addText(text => text
        .setValue(String(this.plugin.settings.orphanDaysThreshold))
        .onChange(async (value) => {
          const num = parseInt(value);
          if (!isNaN(num)) {
            this.plugin.settings.orphanDaysThreshold = num;
            await this.plugin.saveSettings();
          }
        }));
        
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
}
