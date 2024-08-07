import Quadro from "src/main";
import { createCodeBlockFile } from "src/shared/utils";
import { countExtractionsForType, getAllExtractionTypes } from "./extraction-utils";

export async function extractiontypesOverviewCommand(plugin: Quadro) {
	const label = plugin.codeblockLabels.extractionOverview;
	const overviewName = "Extraction Type Overview";
	await createCodeBlockFile(plugin, label, overviewName);
}

export function processExtractiontypesOverviewCodeblock(plugin: Quadro): string {
	const app = plugin.app;
	const htmlForExtrationtypes: string[] = [];

	// ensure search core-plugin is enabled
	app.internalPlugins.plugins["global-search"].enable();

	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return "⚠️ No valid extraction templates found.";

	for (const extractionType of extractionTypes) {
		const template = app.vault.getFileByPath(extractionType.path + "/Template.md");
		if (!template) continue;

		const frontmatter = app.metadataCache.getFileCache(template)?.frontmatter;
		if (!frontmatter) {
			htmlForExtrationtypes.push(
				`⚠️ Invalid properties in template file for "${extractionType.name}".`,
			);
			continue;
		}
		const htmlLinkToTemplateFile = `<a href="${template.path}" class="internal-link">${extractionType.name}</a>`;
		const dimensions = Object.keys(frontmatter).map((key) => {
			const type = (app.metadataTypeManager.getPropertyInfo(key)?.type as string) || "";
			const values = app.metadataCache.getFrontmatterPropertyValuesForKey(key);
			const threshold = 7; // CONFIG

			let valuesStr = "";
			const showValues = values.length > 0 && !type.startsWith("date");
			if (showValues) {
				valuesStr = values
					.slice(0, threshold)
					.map((value) => {
						// DOCS https://help.obsidian.md/Plugins/Search#Search+properties
						const uriForPropertySearch = `obsidian://search?query=path:"${extractionType.path}" ["${key}":"${value}"]`;
						return `<li><a href='${uriForPropertySearch}'>${value}</a></li>`;
					})
					.join("");
				if (values.length > threshold)
					valuesStr += `<li><i>${values.length - threshold} more…</i></li>`;
				valuesStr = "<ul>" + valuesStr + "</ul>";
			}

			const appendix = valuesStr || (type ? ": " + type : "");
			return `<li><b>${key}</b>${appendix}</li>`;
		});
		const extractionsMade = countExtractionsForType(extractionType);
		htmlForExtrationtypes.push(
			`<b>${htmlLinkToTemplateFile}</b> (${extractionsMade}x)<ul>` + dimensions.join("") + "</ul>",
		);
	}

	return htmlForExtrationtypes.join("<br>");
}
