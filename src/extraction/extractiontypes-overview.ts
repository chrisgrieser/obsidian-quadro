import { TFile, TFolder, normalizePath } from "obsidian";
import Quadro from "src/main";
import { getActiveEditor } from "src/shared/utils";

export function insertExtractiontypesOverviewCodeblockCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;

	const codeblockString = ["```quadro-extractiontypes-overview", "```", ""].join("\n");
	editor?.replaceSelection(codeblockString);
}

export function processExtractiontypesOverviewCodeblock(plugin: Quadro): string {
	const { app, settings } = plugin;

	const extractionFolder = app.vault.getFolderByPath(settings.extraction.folder);
	if (!extractionFolder) return `⚠️ Extraction folder "${settings.extraction.folder}" not found.`;

	const extractionTypeTemplates = extractionFolder.children.reduce((acc, child) => {
		if (!(child instanceof TFolder)) return acc;
		const templatePath = normalizePath(child.path + "/Template.md");
		const templateFile = app.vault.getFileByPath(templatePath);
		if (templateFile) acc.push(templateFile);
		return acc;
	}, [] as TFile[]);
	if (extractionTypeTemplates.length === 0) return "⚠️ No valid extraction templates found.";

	let out = "";
	for (const template of extractionTypeTemplates) {
		const extractionTypeName = template.parent?.name;
		const frontmatter = app.metadataCache.getFileCache(template)?.frontmatter;
		if (!frontmatter) {
			out += `⚠️ Invalid properties in template file for "${extractionTypeName}".`;
			continue;
		}
		const htmlLinkToTemplateFile = `<a href="${template.path}" class="internal-link">${extractionTypeName}</a>`;
		const dimensions = Object.keys(frontmatter).map((key) => {
			let typeOfKey = app.metadataTypeManager.getPropertyInfo(key)?.type || "unknown";
			if (typeOfKey === "multitext") typeOfKey = "list";
			return `<li><b>${key}</b>: ${typeOfKey}</li>`;
		});
		out += "<b>" + htmlLinkToTemplateFile + "</b><ul>" + dimensions.join("") + "</ul><br>";
	}

	return out;
}
