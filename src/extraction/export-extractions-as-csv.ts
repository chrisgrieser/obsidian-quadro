import { App, Notice, TFile } from "obsidian";
import { ANALYSIS_FOLDER_NAME, CSV_SEPARATOR, NA_STRING } from "src/settings";
import { getAllExtractionTypes, getPropertiesForExtractionType } from "./extraction-utils";

/** `"` escaped as `""`, otherwise everything is quoted so the separator can be
 * used. See: https://stackoverflow.com/a/4617967/22114136 */
function createCsvRow(cells: string[]): string {
	const row = cells
		.map((cell) => {
			return `"${cell.replace(/"/g, '""')}"`;
		})
		.join(CSV_SEPARATOR);
	return row;
}

//──────────────────────────────────────────────────────────────────────────────

export async function exportExtractionsAsCsv(app: App) {
	const extractionTypes = getAllExtractionTypes(app);
	if (!extractionTypes) return;

	for (const extractionType of extractionTypes) {
		const csvFileLines: string[] = [];

		// csv header
		const templateFrontmatter = getPropertiesForExtractionType(app, extractionType);
		if (!templateFrontmatter) {
			new Notice(`Export of Extraction Type "${extractionType.name}" is skipped.`, 5000);
			continue;
		}
		const keys = [
			"File",
			...Object.keys(templateFrontmatter),
			"extraction date",
			"extraction source",
		];
		const headerRow = createCsvRow(keys);
		csvFileLines.push(headerRow);

		// csv body
		const extractionFiles = extractionType.children.filter((f) => {
			return f instanceof TFile && f.name !== "Template.md";
		}) as TFile[];
		for (const extractionFile of extractionFiles) {
			const fileFrontmatter = app.metadataCache.getFileCache(extractionFile)?.frontmatter;
			if (!fileFrontmatter) continue;
			const cellsInRow: string[] = [];
			cellsInRow.push(extractionFile.basename);

			for (const key of keys) {
				if (key === "File") continue;
				const value = fileFrontmatter[key] ?? NA_STRING; // nullish coalescing to keep 0 or ""
				let valueStr =
					typeof value !== "object"
						? value.toString() // primitive
						: Array.isArray(value)
						  ? value.join(", ") // array
						  : JSON.stringify(value); // object

				// remove enclosing wikilinks
				if (key === "extraction source") valueStr = valueStr.slice(2, -2);

				cellsInRow.push(valueStr);
			}
			const row = createCsvRow(cellsInRow);
			csvFileLines.push(row);
		}

		// write CSV
		const analysisFolder = app.vault.getFolderByPath(ANALYSIS_FOLDER_NAME);
		if (!analysisFolder) await app.vault.createFolder(ANALYSIS_FOLDER_NAME);

		const csvContent = csvFileLines.join("\n");
		let csvPath: string;
		let filename = extractionType.name;
		while (true) {
			csvPath = `${ANALYSIS_FOLDER_NAME}/${filename}.csv`;
			const existingCsv = app.vault.getFileByPath(csvPath);
			if (!existingCsv) break;
			filename += "_1";
		}

		const newCsv = await app.vault.create(csvPath, csvContent);

		const msg = newCsv
			? `Successfully exported "${extractionType.name}".`
			: `ERROR: Export for "${extractionType.name}" failed.`;
		new Notice(msg, 5000);
	}
	new Notice(
		'All CSV exports finished. The file(s) have been placed in the "Analysis" folder.',
		5000,
	);
}
