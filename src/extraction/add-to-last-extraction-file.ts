import { Notice } from "obsidian";
import Quadro from "src/main";
import {
	ambiguousSelection,
	getActiveEditor,
	insertReferenceToDatafile,
	prepareDatafileLineUpdate,
	selHasHighlightMarkup,
} from "src/shared/editor-utils";
import { typeOfFile } from "src/shared/utils";

export async function addToLastExtractionFileCommand(plugin: Quadro) {
	const { app, settings } = plugin;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}
	const hasHighlightMarkupInSel = selHasHighlightMarkup(editor);
	if (hasHighlightMarkupInSel) return;

	// Identify last created EXTRACTION FILE
	const allExtractionFiles = app.vault
		.getMarkdownFiles()
		.filter((f) => f.name !== "Template.md" && f.path.startsWith(settings.extraction.folder + "/"));
	if (allExtractionFiles.length === 0) {
		new Notice("No extractions have been created yet.");
		return;
	}
	const lastExtractionFile = allExtractionFiles.sort((a, b) => b.stat.ctime - a.stat.ctime)[0];

	// DATAFILE: Insert new reference
	const dataFile = editor.editorComponent.view.file;
	const { blockId, lineWithoutId, cursor } = prepareDatafileLineUpdate(editor);

	// GUARD
	const lineAlreadyHasExtraction = editor
		.getLine(cursor.line)
		.includes(`[[${lastExtractionFile.basename}]]`);
	if (lineAlreadyHasExtraction) {
		new Notice("The paragraph already references the last Extraction File. Aborting.");
		return;
	}

	// Insert Reference to last EXTRACTION FILE
	const exFileLines = (await app.vault.read(lastExtractionFile)).split("\n");
	const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`

	const sourcePropertyLn =
		1 + exFileLines.findIndex((line) => line.startsWith("extraction-source:"));
	if (sourcePropertyLn === 0) {
		new Notice('Could not find "extraction-source:" property in last Extraction File. Aborting.');
		return;
	}
	const nextPropertyLnum =
		sourcePropertyLn +
		exFileLines
			.slice(sourcePropertyLn) // search after line starting with "extraction-source:"
			.findIndex((line) => !line.startsWith("  - "));

	exFileLines.splice(nextPropertyLnum, 0, `  - "[[${fullSource}]]"`);
	exFileLines.push(`![[${fullSource}]]`);

	// UPDATE BOTH FILES
	await app.vault.modify(lastExtractionFile, exFileLines.join("\n"));
	insertReferenceToDatafile(
		editor,
		lastExtractionFile,
		lastExtractionFile.basename,
		lineWithoutId,
		blockId,
		cursor,
	);
}