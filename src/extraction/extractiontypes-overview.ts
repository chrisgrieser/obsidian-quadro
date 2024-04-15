import Quadro from "src/main";
import { getActiveEditor } from "src/shared/utils";
import { countExtractionsForType, getAllExtractionTypes } from "./extraction-utils";

export function insertExtractiontypesOverviewCodeblockCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;

	const label = plugin.codeblockLabels.extractionOverview;
	const codeblockString = ["```" + label, "```", ""].join("\n");
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
			const type = app.metadataTypeManager.getPropertyInfo(key)?.type;
			const typeText = type ? `: ${type}` : "";

			// DOCS https://help.obsidian.md/Plugins/Search#Search+properties
			const uriForPropertySearch = `obsidian://search?query=["${key}": ]`;

			const linkToSearchForKey = `<a href='${uriForPropertySearch}'>${key}</a>`;
			return `<li><b>${linkToSearchForKey}</b>${typeText}</li>`;
		});
		const extractionsMade = countExtractionsForType(extractionType);
		out +=
			`<b>${htmlLinkToTemplateFile}</b> (${extractionsMade}x)<ul>` +
			dimensions.join("") +
			"</ul><br>";
	}

	return out;
}
