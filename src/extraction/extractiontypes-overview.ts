import { parseYaml } from "obsidian";
import Quadro from "src/main";
import { createCodeBlockFile } from "src/shared/utils";
import {
	SuggesterForExtractionTypes,
	getExtractionsOfType,
	getPropertiesForExtractionType,
} from "./extraction-utils";

export function extractiontypesOverviewCommand(plugin: Quadro) {
	const label = plugin.codeblockLabels.extractionOverview;

	new SuggesterForExtractionTypes(plugin, async (selectedExtrType) => {
		const name = "Extraction Overview – " + selectedExtrType.name;
		const content = [`extraction-type: "${selectedExtrType.name}"`];
		await createCodeBlockFile(plugin, label, name, content);
	}).open();
}

export function processExtractiontypeOverviewCodeblock(
	plugin: Quadro,
	codeblockContent: string,
): string {
	const app = plugin.app;
	app.internalPlugins.plugins["global-search"].enable(); // in case user disabled it
	const opts = parseYaml(codeblockContent);
	const extractionName = opts["extraction-type"];
	const extractionFolderPath = plugin.settings.extraction.folder + "/" + extractionName;
	const ignoreKeys = opts.ignore || [];

	// GUARD
	const extractionType = app.vault.getFolderByPath(extractionFolderPath);
	if (!extractionType) return `⚠️ Extraction Type "${extractionName}" invalid.`;
	const frontmatter = getPropertiesForExtractionType(app, extractionType);
	if (!frontmatter) return `⚠️ Invalid template or frontmatter for "${extractionName}".`;

	const keysForExtractionType = Object.keys(frontmatter);
	const extrFilesForType = getExtractionsOfType(extractionType);

	const dimensions = keysForExtractionType.map((key) => {
		const type = (app.metadataTypeManager.getPropertyInfo(key)?.type as string) || "";
		const values = app.metadataCache.getFrontmatterPropertyValuesForKey(key);
		if (values.length === 0) return `<b>${key}</b> <small>not used yet</small><br>`;
		if (type.startsWith("date") || ignoreKeys.includes(key)) {
			return `<b>${key}</b> <small>(type "${type}")</small><br>`;
		}

		const valuesStrs = values.reduce((acc: string[], value) => {
			let freqOfValue = 0;
			// values can be included in `getFrontmatterPropertyValuesForKey` due
			// to being used in extractions of a different type, thus we need to
			// filter for this extraction type
			for (const file of extrFilesForType) {
				const fileValue = app.metadataCache.getFileCache(file)?.frontmatter?.[key];
				if (fileValue === value || fileValue?.includes(value)) freqOfValue++;
			}
			if (freqOfValue === 0) return acc;

			// DOCS https://help.obsidian.md/Plugins/Search#Search+properties
			const uriForPropertySearch = `obsidian://search?query=["${key}":"${value}"] path:"${extractionType.path}"`;
			acc.push(`<li><a href='${uriForPropertySearch}'>${value}</a> (${freqOfValue}x)</li>`);
			return acc;
		}, []);

		return `<b>${key}</b> <small><ul>${valuesStrs.join("")}</ul></small>`;
	});

	return dimensions.join("");
}
