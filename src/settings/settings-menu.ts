import { PluginSettingTab, Setting, normalizePath } from "obsidian";
import Quadro from "src/main";
import { FolderSuggest } from "src/shared/folder-suggest";
import { suppressCertainFrontmatterSuggestions } from "src/suppress-fm-suggestions";
import {
	CsvSeparatorChoices,
	DEFAULT_SETTINGS,
	SortFuncChoices,
	csvSeparators,
	sortFuncs,
} from "./defaults";

function sanitizePath(path: string) {
	return normalizePath(path).replace(/:/g, "-");
}

export class QuadroSettingsMenu extends PluginSettingTab {
	plugin: Quadro;

	constructor(plugin: Quadro) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		this.containerEl.addClass(plugin.cssclass);
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

		new Setting(containerEl)
			.setName("Properties without suggestions")
			.setDesc(
				"List of properties, one per line, for which suggestions should be surppressed. " +
					"This is useful for dimensions which are intended for unique content that is not " +
					"going to be repeated in other Code Files or Extraction Files.",
			)
			.addTextArea((textarea) =>
				textarea
					.setPlaceholder("One property per line")
					.setValue(settings.suppressSuggestionFields?.join("\n") || "")
					.onChange(async (value) => {
						const fields = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line !== "");

						settings.suppressSuggestionFields = fields;
						await this.plugin.saveSettings();

						suppressCertainFrontmatterSuggestions(this.plugin);
					}),
			)
			.settingEl.addClass("quadro-property-list");

		// CODING
		containerEl.createEl("h3", { text: "Coding" });
		new Setting(containerEl)
			.setName("Code folder")
			.setDesc("Location where the Code Files are stored.")
			.addSearch((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.coding.folder)
					.setValue(settings.coding.folder)
					.onChange(async (path) => {
						settings.coding.folder = sanitizePath(path) || DEFAULT_SETTINGS.coding.folder;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Bar chart")
			.setDesc(
				"When selecting a code to assign, display a small bar chart showing the " +
					"frequency with which the code has been assigned. " +
					"(Note that this is a methodological decision, as it may influence your choice of codes.)",
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
					"(Note that this is a methodological decision, as it may influence your choice of codes.)",
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
		containerEl.createEl("h3", { text: "Extraction" });

		new Setting(containerEl)
			.setName("Extraction folder")
			.setDesc("Location where the Extraction Files are stored.")
			.addSearch((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.extraction.folder)
					.setValue(settings.extraction.folder)
					.onChange(async (path) => {
						settings.extraction.folder = sanitizePath(path) || DEFAULT_SETTINGS.extraction.folder;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Extraction count")
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
					.addOptions(csvSeparators)
					.setValue(settings.extraction.csvSeparator)
					.onChange(async (value) => {
						settings.extraction.csvSeparator = value as CsvSeparatorChoices;
						await this.plugin.saveSettings();
					});
			});

		// ANALYSIS
		// right now only aggregations of extractions, therefore not yet a
		// separate section
		// containerEl.createEl("h4", { text: "Analysis" });
		new Setting(containerEl)
			.setName("Analysis folder")
			.setDesc("Location where aggregations of extractions are stored.")
			.addSearch((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.analysis.folder)
					.setValue(settings.analysis.folder)
					.onChange(async (path) => {
						settings.analysis.folder = sanitizePath(path) || DEFAULT_SETTINGS.analysis.folder;
						await this.plugin.saveSettings();
					});
			});
	}
}
