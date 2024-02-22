import { App, FrontMatterCache, Notice, TFolder } from "obsidian";
import { EXTRACTION_FOLDER_NAME } from "src/settings";

/** gets properties from Template.md of extraction type */
export function getPropertiesForExtractionType(
	app: App,
	extractionType: TFolder,
): FrontMatterCache | undefined {
	const templateFile = app.vault.getFileByPath(`${extractionType.path}/Template.md`);
	if (!templateFile) {
		new Notice(
			`ERROR: Could not find "Template.md" for Extraction Type "${extractionType.name}".`,
			5000,
		);
		return;
	}
	const frontmatter = app.metadataCache.getFileCache(templateFile)?.frontmatter;
	if (!frontmatter) {
		new Notice(
			`ERROR: Properties of "Template.md" for Extraction Type "${extractionType.name}" are invalid.`,
			5000,
		);
		return;
	}
	return frontmatter;
}

/** also ensures that extraction type array is not empty */
export function getAllExtractionTypes(app: App): TFolder[] | undefined {
	const extFolder = app.vault.getFolderByPath(EXTRACTION_FOLDER_NAME);
	if (!extFolder) {
		new Notice("ERROR: Could not find Extraction Folder.", 4000);
		return;
	}
	const extractionTypes = extFolder.children.filter((f) => f instanceof TFolder) as TFolder[];
	if (extractionTypes.length === 0) {
		new Notice("ERROR: Could not find any Extraction Types.", 4000);
		return;
	}
	return extractionTypes;
}
