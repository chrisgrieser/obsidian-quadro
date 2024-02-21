import { App, FuzzySuggestModal, Notice, TFile, TFolder } from "obsidian";
import { ANALYSIS_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "src/settings";
import { LIVE_PREVIEW, SUGGESTER_INSTRUCTIONS, safelyGetActiveEditor } from "src/utils";

class SuggesterForCreateAggregation extends FuzzySuggestModal<TFolder> {
	extractionTypes: TFolder[];

	constructor(app: App, extractionTypes: TFolder[]) {
		super(app);
		this.extractionTypes = extractionTypes;

		this.setPlaceholder("Select extraction type");
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
		// GUARD missing Template Files
		const templateFile = this.app.vault.getAbstractFileByPath(
			`${extractionType.path}/Template.md`,
		);
		if (!(templateFile instanceof TFile)) {
			new Notice(
				`Error: Could not find "Template.md" for Extraction Type "${extractionType.name}".`,
				4000,
			);
			return;
		}
		const frontmatter = this.app.metadataCache.getFileCache(templateFile)?.frontmatter;
		if (!frontmatter) {
			new Notice(
				`Error: Could not read frontmatter from "Template.md" for Extraction Type "${extractionType.name}".`,
				4000,
			);
			return;
		}

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
			"*Info: You can customize the table by modifying the Dataview Query:* [Documentation of Dataview Queries](https://blacksmithgu.github.io/obsidian-dataview/queries/structure/)",
		].join("\n");

		// create Aggregation File
		const analysisFolderExists =
			this.app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME) instanceof TFolder;
		if (!analysisFolderExists) await this.app.vault.createFolder(ANALYSIS_FOLDER_NAME);

		let aggregationName = extractionType.name;
		let aggregationFilepath: string;
		while (true) {
			aggregationFilepath = `${ANALYSIS_FOLDER_NAME}/${aggregationName}.md`;
			const aggregationFileExists =
				this.app.vault.getAbstractFileByPath(aggregationFilepath) instanceof TFile;
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
	const extractionTFolder = app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME);
	if (!(extractionTFolder instanceof TFolder)) {
		new Notice("ERROR: Could not find Extraction Folder.", 3000);
		return;
	}
	const extractionTypes = extractionTFolder.children.filter(
		(f) => f instanceof TFolder,
	) as TFolder[];
	if (extractionTypes.length === 0) {
		new Notice("ERROR: Could not find any Extraction Types.", 3000);
		return;
	}

	new SuggesterForCreateAggregation(app, extractionTypes).open();
}
