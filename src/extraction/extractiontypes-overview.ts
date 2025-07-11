import { parseYaml } from "obsidian";
import {
	getExtractionsOfType,
	getPropertiesForExtractionType,
	SuggesterForExtractionTypes,
} from "src/extraction/extraction-utils";
import type Quadro from "src/main";
import { CODEBLOCK_LABELS } from "src/settings/constants";
import { createCodeBlockFile } from "src/shared/utils";

export function extractiontypesOverviewCommand(plugin: Quadro): void {
	new SuggesterForExtractionTypes(plugin, async (selectedExtrType) => {
		const filename = "Extraction Overview – " + selectedExtrType.name;
		const content = [
			"*This file updates automatically, any manual changes to it will be lost.*",
			"",
			"> [!INFO]",
			'> You can use the codeblock property "filter" to only show specific values, ' +
				"Click the `</>` icon to edit the filter, for example: `filter: 'word'`, " +
				"and move the cursor out of the codeblock. (Leave it empty to show all values.)",
			"",
			"```" + CODEBLOCK_LABELS.extractionOverview,
			`extraction-type: "${selectedExtrType.name}"`,
			'filter: ""',
			"```",
			"",
		];
		await createCodeBlockFile(plugin, filename, content);
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
	const filter = (opts.filter || "").trim().toLowerCase();
	const extractionFolderPath = plugin.settings.extraction.folder + "/" + extractionName;
	const ignoreKeys = opts.ignore || [];

	// GUARD
	const extractionType = app.vault.getFolderByPath(extractionFolderPath);
	if (!extractionType) return `⚠️ Extraction Type "${extractionName}" invalid.`;
	const frontmatter = getPropertiesForExtractionType(app, extractionType);
	if (!frontmatter) return `⚠️ Invalid template or frontmatter for "${extractionName}".`;

	const keysForExtractionType = Object.keys(frontmatter);
	const extrFilesForType = getExtractionsOfType(plugin, extractionType);

	const dimensions = keysForExtractionType.map((key) => {
		const type = (app.metadataTypeManager.getPropertyInfo(key)?.type as string) || "";
		const values = app.metadataCache.getFrontmatterPropertyValuesForKey(key);
		if (values.length === 0) return `<b>${key}</b> <small>not used yet</small><br>`;
		if (type.startsWith("date") || ignoreKeys.includes(key)) {
			return `<b>${key}</b> <small>(type "${type}")</small><br>`;
		}

		const valuesStrs = values.reduce((acc: string[], value) => {
			const valueDoesNotMatchFilter = filter && !value.toLowerCase().includes(filter);
			if (valueDoesNotMatchFilter) return acc;

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
			const escapedValue = value.replaceAll('"', '\\"');
			const uriForPropertySearch = `obsidian://search?query=["${key}":"${escapedValue}"] path:"${extractionType.path}"`;
			acc.push(`<li><a href='${uriForPropertySearch}'>${value}</a> (${freqOfValue}x)</li>`);
			return acc;
		}, []);

		return `<b>${key}</b> <small><ul>${valuesStrs.join("")}</ul></small>`;
	});

	const prefix = filter ? `<hr><b>Filter:</b> <mark>${filter}</mark><hr><br>` : "";
	return prefix + dimensions.join("");
}
