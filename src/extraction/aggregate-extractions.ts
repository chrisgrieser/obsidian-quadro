import { App, Notice, TFolder } from "obsidian";
import Quadro from "src/main";
import { QuadroSettings } from "src/settings/defaults";
import { ExtendedFuzzySuggester, LIVE_PREVIEW } from "src/utils";
import {
	LOOM_COLUMN_TEMPLATE,
	Loom,
	LoomColumn,
	LoomColumnType,
	TEMPLATE_LOOM,
} from "./dataloom-template";
import {
	ensureCorrectPropertyTypes,
	getAllExtractionTypes,
	getPropertiesForExtractionType,
} from "./extraction-utils";

//──────────────────────────────────────────────────────────────────────────────

function propertyType(app: App, property: string): LoomColumnType {
	const obsiToDataloomTypeMap: Record<string, LoomColumnType> = {
		text: "text",
		number: "number",
		checkbox: "checkbox",
		date: "date",
		datetime: "date",

		// NOTE DataLoom has a BUG where multitext-properties with spaces do not work
		// https://github.com/trey-wallis/obsidian-dataloom/issues/932
		multitext: "multi-tag",
		aliases: "multi-tag",
		tags: "multi-tag",
	};
	const obsiType = app.metadataTypeManager.getPropertyInfo(property.toLowerCase())?.type;
	return obsiToDataloomTypeMap[obsiType] || "text";
}

//──────────────────────────────────────────────────────────────────────────────

class SuggesterForAggregationCreation extends ExtendedFuzzySuggester<TFolder> {
	extractionTypes: TFolder[];
	settings: QuadroSettings;

	constructor(plugin: Quadro, extractionTypes: TFolder[]) {
		super(plugin.app);
		this.settings = plugin.settings;
		this.extractionTypes = extractionTypes;

		this.setPlaceholder("Select extraction type to create aggregation for");
	}

	getItems(): TFolder[] {
		return this.extractionTypes;
	}

	getItemText(extractionType: TFolder): string {
		const extractionsCount = extractionType.children.length - 1; // -1 due to `Template.md`
		return `${extractionType.name} (${extractionsCount})`;
	}

	async onChooseItem(extractionType: TFolder): Promise<void> {
		ensureCorrectPropertyTypes(this.app);
		const settings = this.settings;

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

		// file column
		const filColumnUuid = crypto.randomUUID();
		loomJson.model.filters[0].columnId = filColumnUuid;
		loomJson.model.columns[1].id = filColumnUuid;
		loomJson.model.columns[1].width = "150px";

		for (const property of properties) {
			const column: LoomColumn = structuredClone(LOOM_COLUMN_TEMPLATE);
			column.id = crypto.randomUUID();
			column.frontmatterKey = property; // key used
			column.content = property; // column title
			column.type = propertyType(this.app, property);
			column.width = property === "extraction date" ? "150px" : "200px";
			loomJson.model.columns.push(column);
		}

		// Create AGGREGATION FILE
		let analysisFolder = this.app.vault.getFolderByPath(settings.analysis.folder);
		if (!analysisFolder)
			analysisFolder = await this.app.vault.createFolder(settings.analysis.folder);
		if (!analysisFolder) {
			new Notice("ERROR: Could not create Analysis Folder.", 4000);
			return;
		}
		let aggregationName = extractionType.name;
		let aggregationFilepath: string;
		while (true) {
			// append `_1` until such a file does not exist, to ensure creating a new file
			aggregationFilepath = `${settings.analysis.folder}/${aggregationName} (Aggregation).loom`;
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

export async function aggregateExtractionsCommand(plugin: Quadro): Promise<void> {
	const app = plugin.app;

	// GUARD DataLoom not installed/enabled
	// INFO yes, the plugin-id of DataLoom is indeed "notion-like-tables"
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
	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return;

	new SuggesterForAggregationCreation(plugin, extractionTypes).open();
}
