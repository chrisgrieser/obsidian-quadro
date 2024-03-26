import moment from "moment";
import { Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { getAllExtractionTypes, getPropertiesForExtractionType } from "./extraction-utils";

// CONFIG (not worth a separate setting)
const naString = "-";
const exportFolderName = "CSV Export";

/** `"` escaped as `""`, otherwise everything is quoted so the separator can be
 * used. See: https://stackoverflow.com/a/4617967/22114136 */
function createCsvRow(cells: string[], csvSeparator: string): string {
	const escapedCells = cells.map((cell) => `"${cell.replaceAll('"', '""')}"`);
	return escapedCells.join(csvSeparator);
}

//──────────────────────────────────────────────────────────────────────────────

export async function exportExtractionsAsCsv(plugin: Quadro): Promise<void> {
	const { app, settings } = plugin;
	const csvSeparator = settings.extraction.csvSeparator;

	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return;

	let fileToReveal: TFile | undefined;
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
		const headerRow = createCsvRow(keys, csvSeparator);
		csvFileLines.push(headerRow);

		// csv body
		const extractionFiles = extractionType.children.filter((f) => {
			return f instanceof TFile && f.name !== "Template.md";
		}) as TFile[];
		for (const extractionFile of extractionFiles) {
			const fileFrontmatter = app.metadataCache.getFileCache(extractionFile)?.frontmatter;
			if (!fileFrontmatter) continue;
			const cellsInRow: string[] = [];

			for (const key of keys) {
				if (key === "File") {
					cellsInRow.push(extractionFile.basename);
					continue;
				}
				const value = fileFrontmatter[key] ?? naString; // nullish coalescing to keep 0 or ""
				let valueStr =
					typeof value !== "object"
						? value.toString() // primitive
						: Array.isArray(value)
							? value.join("; ") // array
							: JSON.stringify(value); // object

				// remove enclosing wikilinks
				if (key === "extraction source") valueStr = valueStr.slice(2, -2);

				cellsInRow.push(valueStr);
			}
			const row = createCsvRow(cellsInRow, csvSeparator);
			csvFileLines.push(row);
		}

		// write CSV
		const exportFolder = app.vault.getFolderByPath(exportFolderName);
		if (!exportFolder) await app.vault.createFolder(exportFolderName);

		const csvContent = csvFileLines.join("\n");

		const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss");
		const csvPath = `${exportFolderName}/${extractionType.name}_${timestamp}.csv`;

		const newCsv = await app.vault.create(csvPath, csvContent);

		const msg = newCsv
			? `Successfully exported "${extractionType.name}".`
			: `ERROR: Export for "${extractionType.name}" failed.`;
		new Notice(msg, 5000);

		if (!fileToReveal && newCsv) fileToReveal = newCsv;
	}

	new Notice("All CSV exports finished.", 5000);
	if (fileToReveal) app.showInFolder(fileToReveal.path);
}
