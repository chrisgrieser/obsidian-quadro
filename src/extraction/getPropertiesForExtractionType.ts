import { App, Notice, TFolder } from "obsidian";

export function getPropertiesForExtractionType(app: App, extractionType: TFolder) {
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
