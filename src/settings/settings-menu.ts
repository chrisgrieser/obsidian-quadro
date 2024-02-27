import { PluginSettingTab, Setting } from "obsidian";
import Quadro from "src/main";
import { DEFAULT_SETTINGS, SortFuncChoices, sortFuncs } from "./defaults";

export class QuadroSettingsMenu extends PluginSettingTab {
	plugin: Quadro;

	constructor(plugin: Quadro) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		this.containerEl.addClass("quadro");
	}

	// INFO Obsidian Style Guide prescribes sentence case. However, we deviate
	// from that when referring to special files, such as "Code Files", as these
	// are names for the specific QDA-filetypes. They are capitalized across the
	// plugin, and therefore should also be capitalized in the settings menu for
	// consistency.
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;

		// CODING
		containerEl.createEl("h4", { text: "Coding" });

		new Setting(containerEl)
			.setName("Location")
			.setDesc("Folder where the Code Files are stored.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.coding.folder)
					.setValue(settings.coding.folder)
					.onChange(async (value) => {
						settings.coding.folder = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Bar chart")
			.setDesc(
				"When selecting a code to assign, show a small bar chart displaying the " +
					"frequency with which the code has been assigned. " +
					"(This is a methodological decision which can influence your code selection.)",
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.coding.minigraph.enabled).onChange(async (value) => {
					settings.coding.minigraph.enabled = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Sort order")
			.setDesc(
				"When selecting a code to assign, method by which the codes are ordered. " +
					"(This is a methodological decision which can influence your code selection.)",
			)
			.addDropdown((dropdown) => {
				for (const key in sortFuncs) {
					dropdown.addOption(key, key);
				}
				dropdown.setValue(settings.coding.sortFunc).onChange(async (value) => {
					settings.coding.sortFunc = value as SortFuncChoices;
					await this.plugin.saveSettings();
				});
			});

		// EXTRACTION
		containerEl.createEl("h4", { text: "Extraction" });

		new Setting(containerEl)
			.setName("Location")
			.setDesc("Folder where the Extraction Files are stored.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.extraction.folder)
					.setValue(settings.extraction.folder)
					.onChange(async (value) => {
						settings.extraction.folder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Extraction Count")
			.setDesc(
				"When selecting an extraction type, show a count of how often the type has been extracted.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(settings.extraction.countForExtractionType.enabled)
					.onChange(async (value) => {
						settings.extraction.countForExtractionType.enabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("CSV Separator")
			.setDesc("Separator used when exporting extractions as csv files.")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						",": "Comma (,)",
						";": "Semicolon (;)",
						"\t": "Tab",
					})
					.setValue(settings.extraction.csvSeparator)
					.onChange(async (value) => {
						settings.extraction.csvSeparator = value;
						await this.plugin.saveSettings();
					});
			});

		// ANALYSIS
		// right now only aggregations of extractions, therefore not yet a
		// separate section
		// containerEl.createEl("h4", { text: "Analysis" });

		new Setting(containerEl)
			.setName("Analysis Folder")
			.setDesc("Location where aggregations of extractions are stored.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.analysis.folder)
					.setValue(settings.analysis.folder)
					.onChange(async (value) => {
						settings.analysis.folder = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
