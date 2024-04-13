import Quadro from "src/main";
import { getActiveEditor } from "src/shared/utils";
import { countExtractionsForType, getAllExtractionTypes } from "./extraction-utils";

export function insertExtractiontypesOverviewCodeblockCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;

	const codeblockString = ["```quadro-extractiontypes-overview", "```", ""].join("\n");
	editor?.replaceSelection(codeblockString);
}

export function processExtractiontypesOverviewCodeblock(plugin: Quadro): string {
	const app = plugin.app;
	let out = "";
	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return "⚠️ No valid extraction templates found.";

	for (const extractionType of extractionTypes) {
		const template = app.vault.getFileByPath(extractionType.path + "/Template.md");
		if (!template) continue;

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
		out +=
			`<b>${htmlLinkToTemplateFile}</b> (${extractionsMade}x)<ul>` +
			dimensions.join("") +
			"</ul><br>";
	}

	return out;
}
