import { App, Notice, TFile, TFolder } from "obsidian";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { LIVE_PREVIEW, safelyGetActiveEditor } from "src/utils";

export async function aggregateExtractions(app: App): Promise<void> {
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

	// get Extraction Types
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

	// create Aggregation Files
	const aggregationFiles = await Promise.all(
		extractionTypes.map(async (tfolder) => {
			const templateFile = app.vault.getAbstractFileByPath(`${tfolder.path}/Template.md`);
			if (!(templateFile instanceof TFile)) return;
			const frontmatter = app.metadataCache.getFileCache(templateFile)?.frontmatter;
			if (!frontmatter) return;
			const properties = Object.keys(frontmatter).map(
				(key) => "\t" + key.replaceAll(" ", "-") + ",",
			);
			properties.push("\textraction-source"); // no trailing comma for last property

			const dataviewSnippet: string = [
				"```dataview",
				"TABLE",
				...properties,
				`FROM "${tfolder.path}"`,
				'WHERE file.name != "Template"',
				"SORT extraction-date ASC",
				"```",
				"",
			].join("\n");

			const typeName = tfolder.name;
			const aggregateFilepath = `${EXTRACTION_FOLDER_NAME}/${typeName} (Aggregation).md`;
			try {
				new Notice(`Created Aggregation File for "${aggregateFilepath}"`, 5000);
				return await app.vault.create(aggregateFilepath, dataviewSnippet);
			} catch (_e) {
				new Notice(`"Skipping "${typeName}", as Aggregation File for it already exists.`, 5000);
				return null;
			}
		}),
	);

	// open first aggregation file
	const firstAggregationFile = aggregationFiles.find((f) => f instanceof TFile);
	if (!firstAggregationFile) return;
	await app.workspace.getLeaf().openFile(firstAggregationFile, LIVE_PREVIEW);

	const editor = safelyGetActiveEditor(app);
	if (!editor) return;
	editor.setCursor(editor.lastLine(), 0); // move cursor down, so codeblock is rendered
}
