import { TFile, TFolder, normalizePath } from "obsidian";
import Quadro from "src/main";
import { getActiveEditor } from "src/shared/utils";
import { countExtractionsForType } from "./extraction-utils";

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
		const extractionType = template.parent as TFolder;
		const frontmatter = app.metadataCache.getFileCache(template)?.frontmatter;
		if (!frontmatter) {
			out += `⚠️ Invalid properties in template file for "${extractionType.name}".`;
			continue;
		}
		const htmlLinkToTemplateFile = `<a href="${template.path}" class="internal-link">${extractionType.name}</a>`;
		const dimensions = Object.keys(frontmatter).map((key) => {
			let typeOfKey = app.metadataTypeManager.getPropertyInfo(key)?.type;
			if (typeOfKey === "multitext") typeOfKey = "list";
			const typeText = typeOfKey ? `: ${typeOfKey}` : "";
			return `<li><b>${key}</b>${typeText}</li>`;
		});
		const extractionsMade = countExtractionsForType(extractionType);
		out += `<b>${htmlLinkToTemplateFile}</b> (${extractionsMade})<ul>${dimensions.join(
			"",
		)}</ul><br>`;
	}

	return out;
}
