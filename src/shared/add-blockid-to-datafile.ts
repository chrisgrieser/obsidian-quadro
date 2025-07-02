import { type Editor, moment, type TFile } from "obsidian";

// DOCS https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
export const BLOCKID_REGEX = /\^[\w-]+$/;

export function prepareDatafileLineUpdate(editor: Editor): {
	blockId: string;
	lineWithoutId: string;
} {
	const lnum = editor.getCursor().line;
	let lineText = editor.getLine(lnum);

	// 1. update line text with highlight markup (if selection)
	const selection = editor.getSelection();
	if (selection) {
		// spaces need to be moved outside, otherwise they make the highlights invalid
		const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
		editor.replaceSelection(highlightAdded);
		lineText = editor.getLine(lnum);
	}

	// 2. get existing blockID or generate new one
	const [blockIdOfLine] = lineText.match(BLOCKID_REGEX) || [];

	const blockId = blockIdOfLine || "^id-" + moment().format("YY-MM-DD--HH-mm-ss");
	const blockId = blockIdOfLine || "^id-" + moment().format("YYYY-MM-DD--HH-mm-ss");
	const lineWithoutId = blockIdOfLine ? lineText.slice(0, -blockIdOfLine.length) : lineText;
	return { blockId: blockId, lineWithoutId: lineWithoutId.trim() };
}

/** assumes datafile is the file in the passed editor */
export function insertblockIdInDatafile(
	editor: Editor,
	referencedFile: TFile,
	labelForReferenceFile: string,
	lineWithoutId: string,
	blockId: string,
): void {
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) return;
	const app = editor.editorComponent.app;

	app.vault.setConfig("useMarkdownLinks", false); // ensure wikilinks
	const linkToReferencedFile = app.fileManager.generateMarkdownLink(
		referencedFile,
		dataFile.path,
		"",
		labelForReferenceFile,
	);
	const updatedLine = [lineWithoutId, linkToReferencedFile, blockId].join(" ");

	const cursor = editor.getCursor(); // `setLine` moves cursor, so we need to move it back
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor);
}
