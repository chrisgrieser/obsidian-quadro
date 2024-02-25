import { App, FuzzySuggestModal, Notice, TFolder } from "obsidian";
import { ANALYSIS_FOLDER_NAME } from "src/settings";
import { LIVE_PREVIEW, SUGGESTER_INSTRUCTIONS } from "src/utils";
import { LOOM_COLUMN_TEMPLATE, Loom, LoomColumn, TEMPLATE_LOOM } from "./dataloom-template";
import { getAllExtractionTypes, getPropertiesForExtractionType } from "./extraction-utils";

//──────────────────────────────────────────────────────────────────────────────

type LoomColumnType = "text" | "number" | "checkbox" | "multi-tag" | "date";

function propertyType(app: App, property: string): LoomColumnType {
	const obsiToDataloomTypeMap: Record<string, LoomColumnType> = {
		text: "text",
		date: "date",
		number: "number",
		datetime: "date",
		checkbox: "checkbox",

		// NOTE DataLoom has a BUG where multitext-properties with spaces do not work
		// https://github.com/trey-wallis/obsidian-dataloom/issues/932
		multitext: "multi-tag",
	};
	const obsiType = app.metadataTypeManager.getPropertyInfo(property.toLowerCase())?.type;
	return obsiToDataloomTypeMap[obsiType] || "text";
}

//──────────────────────────────────────────────────────────────────────────────

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
		// TEMPLATE FILE: read properties for the extraction type
		const frontmatter = getPropertiesForExtractionType(this.app, extractionType);
		if (!frontmatter) return;
		const properties = [...Object.keys(frontmatter), "extraction source", "extraction date"];

		// create LOOM file content (= AGGREGATION FILE)
		const loomJson: Loom = structuredClone(TEMPLATE_LOOM);
		if (
			!loomJson.model?.filters[0] ||
			!loomJson.model?.sources[0] ||
			!loomJson.model?.columns[0] || // Source
			!loomJson.model?.columns[1] // Extraction File
		) {
			new Notice("ERROR: Loom Template invalid.", 4000);
			return;
		}
		loomJson.model.sources[0].path = extractionType.path;
		loomJson.model.sources[0].id = crypto.randomUUID();
		loomJson.model.filters[0].id = crypto.randomUUID();
		loomJson.model.columns[0].id = crypto.randomUUID();
		const filenameUuid = crypto.randomUUID();
		loomJson.model.filters[0].columnId = filenameUuid;
		loomJson.model.columns[1].id = filenameUuid;

		for (const property of properties) {
			const column: LoomColumn = structuredClone(LOOM_COLUMN_TEMPLATE);
			column.id = crypto.randomUUID();
			column.frontmatterKey = property; // key used
			column.content = property; // column title
			column.type = propertyType(this.app, property);
			loomJson.model.columns.push(column);
		}

		// Create AGGREGATION FILE
		let analysisFolder = this.app.vault.getFolderByPath(ANALYSIS_FOLDER_NAME);
		if (!analysisFolder) analysisFolder = await this.app.vault.createFolder(ANALYSIS_FOLDER_NAME);
		if (!analysisFolder) {
			new Notice("ERROR: Could not create Analysis Folder.", 4000);
			return;
		}
		let aggregationName = extractionType.name;
		let aggregationFilepath: string;
		while (true) {
			// append `_1` until such a file does not exist, to ensure creating a new file
			aggregationFilepath = `${ANALYSIS_FOLDER_NAME}/${aggregationName} (Aggregation).loom`;
			const aggregationFileExists = this.app.vault.getFileByPath(aggregationFilepath);
			if (!aggregationFileExists) break;
			aggregationName += "_1";
		}
		const aggregationFile = await this.app.vault.create(
			aggregationFilepath,
			JSON.stringify(loomJson),
		);

		// Open AGGREGATION FILE
		await this.app.workspace.getLeaf().openFile(aggregationFile, LIVE_PREVIEW);
		this.app.commands.executeCommandById("file-explorer:reveal-active-file");
	}
}

export async function aggregateExtractionsCommand(app: App): Promise<void> {
	// GUARD DataLoom not installed/enabled
	// INFO the plugin-id of DataLoom is indeed 'notion-like-tables'
	const dataloomEnabled = [...app.plugins.enabledPlugins].includes("notion-like-tables");
	if (!dataloomEnabled) {
		const installedPlugins = Object.keys(app.plugins.plugins);
		if (!installedPlugins.includes("notion-like-tables")) {
			new Notice(
				'Plugin "DataLoom" not installed.\n\nPlease install it from the Obsidian Community Store.',
				7000,
			);
			return;
		}
		const success = await app.plugins.enablePluginAndSave("dataview");
		if (!success) {
			new Notice("ERROR: DataLoom plugin could not be enabled.", 4000);
			return;
		}
	}

	// GUARD Extraction Folders missing
	const extractionTypes = getAllExtractionTypes(app);
	if (!extractionTypes) return;

	new SuggesterForAggregationCreation(app, extractionTypes).open();
}
