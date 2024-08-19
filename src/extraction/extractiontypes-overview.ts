import { TFile } from "obsidian";
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
		const keysForExtractionType = Object.keys(frontmatter);

		const extrFilesForType = extractionType.children.filter(
			(f) => f instanceof TFile && f.extension === "md",
		) as TFile[];

		const dimensions = keysForExtractionType.map((key) => {
			const type = (app.metadataTypeManager.getPropertyInfo(key)?.type as string) || "";
			const values = app.metadataCache.getFrontmatterPropertyValuesForKey(key);
			if (values.length === 0) return "";
			if (type.startsWith("date")) return `<li><b>${key}</b>: ${type}</li>`;

			const valuesThatExistForType = values.filter((value) =>
				extrFilesForType.some((file) => {
					const fileValue = app.metadataCache.getFileCache(file)?.frontmatter?.[key];
					return fileValue === value || fileValue?.includes(value);
				}),
			);
			const valuesStrs = valuesThatExistForType.map((value) => {
				// DOCS https://help.obsidian.md/Plugins/Search#Search+properties
				const uriForPropertySearch = `obsidian://search?query=path:"${extractionType.path}" ["${key}":"${value}"]`;
				return `<li><a href='${uriForPropertySearch}'>${value}</a></li>`;
			});

			return `<li><b>${key}</b>: <small><ul>${valuesStrs.join("")}</ul></small></li>`;
		});

		const html =
			`<b><a href="${template.path}" class="internal-link">${extractionType.name}</a></b> (${countExtractionsForType(extractionType)}x)` +
			`<ul>${dimensions.join("")}</ul>`;
		htmlForExtrationtypes.push(html);
	}

	return htmlForExtrationtypes.join("<br>");
}
