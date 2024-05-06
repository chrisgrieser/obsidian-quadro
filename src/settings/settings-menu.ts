import { PluginSettingTab, Setting, normalizePath } from "obsidian";
import { suppressCertainFrontmatterSuggestions } from "src/frontmatter-modifications/suppress-suggestions";
import { setCssForWidthOfKeys } from "src/frontmatter-modifications/width-of-keys";
import Quadro from "src/main";
import { FolderSuggest } from "src/shared/folder-suggest";
import {
	CsvSeparatorChoices,
	DEFAULT_SETTINGS,
	OpeningModes,
	SortFuncChoices,
	csvSeparators,
	openingModes,
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
	}

	// INFO Obsidian Style Guide prescribes sentence case. However, we deviate
	// from that when referring to special files, such as "Code Files", as these
	// are names for the specific QDA-filetypes. They are capitalized across the
	// plugin, and therefore should also be capitalized in the settings menu for
	// consistency.
	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		const inputElCss = { "min-width": "15rem" };

		containerEl.empty();
		containerEl.addClass(this.plugin.cssclass);

		// GENERAL
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
					.setValue(settings.suppressSuggestionInFields.join("\n"))
					.onChange(async (value) => {
						const fields = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line !== "");
						settings.suppressSuggestionInFields = fields;

						await this.plugin.saveSettings();
						suppressCertainFrontmatterSuggestions(this.plugin);
					})
					.inputEl.setCssProps({ "min-height": "5rem", "min-width": "15rem" }),
			);

		new Setting(containerEl)
			.setName("Width of property keys")
			.setDesc("Minimum width of keys in the list of properties, in percent.")
			.addSlider((slider) =>
				slider
					.setLimits(20, 60, 5)
					.setDynamicTooltip()
					.setValue(settings.propertiesKeysWidthPercent)
					.onChange(async (value) => {
						settings.propertiesKeysWidthPercent = value;

						await this.plugin.saveSettings();
						setCssForWidthOfKeys(this.plugin);
					}),
			);

		// CODING
		containerEl.createEl("h3", { text: "Coding" });

		new Setting(containerEl)
			.setName("Code folder")
			.setDesc("Location where the Code Files are stored.")
			.addSearch((text) => {
				new FolderSuggest(this.plugin, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.coding.folder)
					.setValue(settings.coding.folder)
					.onChange(async (path) => {
						settings.coding.folder = sanitizePath(path) || DEFAULT_SETTINGS.coding.folder;
						await this.plugin.saveSettings();
					})
					.inputEl.setCssProps(inputElCss);
			});
		new Setting(containerEl)
			.setName("Code count")
			.setDesc(
				"When selecting a code to assign, show a count of how often the code has already been assigned. " +
					"(Note that this is a methodological decision, as it may influence your choice of codes.)",
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.coding.displayCount).onChange(async (value) => {
					settings.coding.displayCount = value;
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
				new FolderSuggest(this.plugin, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.extraction.folder)
					.setValue(settings.extraction.folder)
					.onChange(async (path) => {
						settings.extraction.folder = sanitizePath(path) || DEFAULT_SETTINGS.extraction.folder;
						await this.plugin.saveSettings();
					})
					.inputEl.setCssProps(inputElCss);
			});
		new Setting(containerEl)
			.setName("Extraction count")
			.setDesc(
				"When selecting an extraction type, show a count of how often the type has been extracted." +
					"(Note that this is a methodological decision, as it may influence your choice of codes.)",
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.extraction.displayCount).onChange(async (value) => {
					settings.extraction.displayCount = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(containerEl)
			.setName("Location of extraction window")
			.setDesc(
				"When creating a new extraction, a new split window opens. This setting determines where that window opens.",
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(openingModes)
					.setValue(settings.extraction.openingMode)
					.onChange(async (value) => {
						settings.extraction.openingMode = value as OpeningModes;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("CSV separator")
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
		containerEl.createEl("h4", { text: "Analysis" });

		new Setting(containerEl)
			.setName("Analysis folder")
			.setDesc("Location where aggregations, overviews, and exports are stored.")
			.addSearch((text) => {
				new FolderSuggest(this.plugin, text.inputEl);
				text
					.setPlaceholder(DEFAULT_SETTINGS.analysis.folder)
					.setValue(settings.analysis.folder)
					.onChange(async (path) => {
						settings.analysis.folder = sanitizePath(path) || DEFAULT_SETTINGS.analysis.folder;
						await this.plugin.saveSettings();
					})
					.inputEl.setCssProps(inputElCss);
			});
	}
}
