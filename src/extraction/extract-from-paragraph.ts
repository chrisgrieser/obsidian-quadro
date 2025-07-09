import { type Editor, getFrontMatterInfo, moment, Notice, type TFolder } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import {
	getAllExtractionTypes,
	getExtractionsOfType,
	moveCursorToFirstProperty,
	openExtractionInNewWin,
	SuggesterForExtractionTypes,
} from "src/extraction/extraction-utils";
import type Quadro from "src/main";
import {
	insertblockIdInDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-blockid-to-datafile";
import { ensureCorrectPropertyTypes, getActiveEditor } from "src/shared/utils";
import {
	activeFileHasInvalidName,
	ambiguousSelection,
	selHasHighlightMarkup,
	typeOfFile,
} from "src/shared/validation";

async function extractOfType(
	plugin: Quadro,
	editor: Editor,
	extractionTypeFolder: TFolder,
): Promise<void> {
	const app = plugin.app;
	ensureCorrectPropertyTypes(app);
	const type = extractionTypeFolder.name;
	const dir = extractionTypeFolder.path;
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) {
		new Notice("No file open.", 4000);
		return;
	}

	// VALIDATE Template
	const templateFile = app.vault.getFileByPath(`${dir}/Template.md`);
	if (!templateFile) {
		new Notice(`ERROR: Could not find "Template.md" for Extraction Type "${type}".`, 0);
		return;
	}
	const templateContent = await app.vault.cachedRead(templateFile);
	const { exists, frontmatter: templateFrontmatter } = getFrontMatterInfo(templateContent);
	if (!exists) {
		new Notice(
			`The file "Template.md" in the folder "${dir}" does not contain valid metadata fields.` +
				"\n\nYou need to add valid fields before you can make extractions.",
			0,
		);
		openExtractionInNewWin(plugin, templateFile);
		return;
	}

	// Determine path of EXTRACTION-FILE to be created
	let extractionPath: string;
	let extractionCount = getExtractionsOfType(plugin, extractionTypeFolder).length;
	while (true) {
		extractionCount++;
		const countWithLeadingZeros = extractionCount.toString().padStart(3, "0");
		extractionPath = `${dir}/${type} ${countWithLeadingZeros}.md`;
		const fileExistsAlready = app.vault.getFileByPath(extractionPath);
		if (!fileExistsAlready) break;
	}

	// DATAFILE Changes
	const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);

	// insert data into TEMPLATE
	const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`
	const timestamp = moment().format("YYYY-MM-DDTHH:mm"); // obsidian has trouble with timezone data
	const newFrontmatter = [
		"---",
		...templateFrontmatter.split("\n"),
		"extraction-date: " + timestamp,
		"extraction-source:",
		`  - "[[${fullSource}]]"`,
		"---",
		"",
		"**Paragraph extracted from:**",
		`![[${fullSource}]]`,
	].join("\n");

	// Create EXTRACTION FILE
	const extractionFile = await app.vault.create(extractionPath, newFrontmatter);

	// update DATAFILE
	const label = extractionFile.basename;
	insertblockIdInDatafile(editor, extractionFile, label, lineWithoutId, blockId);

	// Open EXTRACTION-FILE
	await openExtractionInNewWin(plugin, extractionFile);
	moveCursorToFirstProperty(app, "value");

	incrementProgress(plugin, "Extraction File", "new");
}

export function extractFromParagraphCommand(plugin: Quadro): void {
	const { app } = plugin;
	const editor = getActiveEditor(app);

	// GUARD preconditions for extraction
	const invalid =
		!editor ||
		ambiguousSelection(editor) ||
		selHasHighlightMarkup(editor) ||
		activeFileHasInvalidName(app);
	if (invalid) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to make an extraction.", 4000);
		return;
	}

	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return;

	// Suggest Extraction Types, or trigger directly if only one type exists
	if (extractionTypes.length === 1) {
		extractOfType(plugin, editor, extractionTypes[0]);
	} else {
		new SuggesterForExtractionTypes(plugin, (selectedExtrType) => {
			extractOfType(plugin, editor, selectedExtrType);
		}).open();
	}
}
