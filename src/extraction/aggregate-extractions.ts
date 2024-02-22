import { App, FuzzySuggestModal, Notice, TFolder } from "obsidian";
import { ANALYSIS_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "src/settings";
import { LIVE_PREVIEW, SUGGESTER_INSTRUCTIONS, safelyGetActiveEditor } from "src/utils";
import { getAllExtractionTypes, getPropertiesForExtractionType } from "./extraction-utils";

class SuggesterForAggregationCreation extends FuzzySuggestModal<TFolder> {
	extractionTypes: TFolder[];

	constructor(app: App, extractionTypes: TFolder[]) {
		super(app);
		this.extractionTypes = extractionTypes;

		this.setPlaceholder("Select extraction type to create aggregation for");
		this.setInstructions(SUGGESTER_INSTRUCTIONS);
		this.modalEl.addClass("quadro");
	}

	getItems(): TFolder[] {
		return this.extractionTypes;
	}

	getItemText(extractionType: TFolder): string {
		const extractionsCount = extractionType.children.length - 1; // -1 due to `Template.md`
		return `${extractionType.name} (${extractionsCount})`;
	}

	async onChooseItem(extractionType: TFolder): Promise<void> {
		const frontmatter = getPropertiesForExtractionType(this.app, extractionType);
		if (!frontmatter) return;

		// read properties from Template file of the Extraction Type
		const properties = Object.keys(frontmatter).map(
			(key) => "\t" + key.replaceAll(" ", "-") + ",",
		);
		properties.push("\textraction-source"); // no trailing comma for last property

		const dataviewSnippet: string = [
			"```dataview",
			"TABLE",
			...properties,
			`FROM "${extractionType.path}"`,
			'WHERE file.name != "Template"',
			"SORT extraction-date ASC",
			"```",
			"",
			"---",
			"",
			"You can customize the table by modifying the Dataview Query: [Documentation of Dataview Queries](https://blacksmithgu.github.io/obsidian-dataview/queries/structure/)",
			"",
			"If you have the [Sortable](https://obsidian.md/plugins?id=obsidian-sortable) plugin installed, you can click on the header row of a column to sort the table by that column. (The plugin is pre-installed, if you use the Quadro Example Vault.)",
		].join("\n");

		// create Aggregation File
		let analysisFolder = this.app.vault.getFolderByPath(EXTRACTION_FOLDER_NAME);
		if (!analysisFolder) analysisFolder = await this.app.vault.createFolder(ANALYSIS_FOLDER_NAME);
		if (!analysisFolder) {
			new Notice("ERROR: Could not create Analysis Folder.", 4000);
			return;
		}

		// append `_1` until such a file does not exist, to ensure creating a new file
		let aggregationName = extractionType.name;
		let aggregationFilepath: string;
		while (true) {
			aggregationFilepath = `${ANALYSIS_FOLDER_NAME}/${aggregationName}.md`;
			const aggregationFileExists = this.app.vault.getFileByPath(aggregationFilepath);
			if (!aggregationFileExists) break;
			aggregationName += "_1";
		}
		const aggregationFile = await this.app.vault.create(aggregationFilepath, dataviewSnippet);

		// open Aggregation File (move cursor down, so codeblock is rendered)
		await this.app.workspace.getLeaf().openFile(aggregationFile, LIVE_PREVIEW);
		this.app.commands.executeCommandById("file-explorer:reveal-active-file");

		const editor = safelyGetActiveEditor(this.app);
		if (!editor) return;
		editor.setCursor(editor.lastLine(), 0);
	}
}

export async function aggregateExtractionsCommand(app: App): Promise<void> {
	// GUARD dataview not installed/enabled
	const dataviewEnabled = [...app.plugins.enabledPlugins].includes("dataview");
	if (!dataviewEnabled) {
		const installedPlugins = Object.keys(app.plugins.plugins);
		if (!installedPlugins.includes("dataview")) {
			new Notice(
				'Plugin "Dataview" not installed.\n\nPlease install it from the Obsidian Community Store.',
				7000,
			);
			return;
		}
		const success = await app.plugins.enablePluginAndSave("dataview");
		if (!success) {
			new Notice("ERROR: Dataview plugin could not be enabled.", 4000);
			return;
		}
	}

	// GUARD Extraction Folders missing
	const extractionTypes = getAllExtractionTypes(app);
	if (!extractionTypes) return;

	new SuggesterForAggregationCreation(app, extractionTypes).open();
}
