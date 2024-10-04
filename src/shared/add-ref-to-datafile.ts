import { Editor, TFile, moment } from "obsidian";

/** DOCS https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
 * INFO blockIds may only contain letters, numbers, and a hyphen */
export const BLOCKID_REGEX = /\^[\w-]+$/;

/**
 * Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a random 6-digit ID is created. A random ID is
 * preferable over counting the number of IDs, it is less likely that content
 * will be deleted due to the same blockID being used multiple times in
 * different files. */
function ensureBlockId(lineText: string): { blockId: string; lineWithoutId: string } {
	const [blockIdOfLine] = lineText.match(BLOCKID_REGEX) || [];

	// line already has blockID
	if (blockIdOfLine) {
		const lineWithoutId = lineText.slice(0, -blockIdOfLine.length).trim();
		return { blockId: blockIdOfLine, lineWithoutId: lineWithoutId };
	}

	// line has no blockID
	const newId = "^id-" + moment().format("YYMMDD-HHmmss");
	return { blockId: newId, lineWithoutId: lineText.trim() };
}

/** 1. save cursor position
 *  2. update line text with highlight markup (if selection)
 *  3. generate new block ID */
export function prepareDatafileLineUpdate(editor: Editor): {
	blockId: string;
	lineWithoutId: string;
} {
	const cursor = editor.getCursor();
	let lineText = editor.getLine(cursor.line);

	const selection = editor.getSelection();
	if (selection) {
		// spaces need to be moved outside, otherwise they make the highlights invalid
		const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
		editor.replaceSelection(highlightAdded);
		lineText = editor.getLine(cursor.line);
	}
	const { blockId, lineWithoutId } = ensureBlockId(lineText);
	return { blockId, lineWithoutId };
}

/** assumes datafile is the file in the passed editor */
export function insertReferenceToDatafile(
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
	const linkedToReferencedFile = app.fileManager.generateMarkdownLink(
		referencedFile,
		dataFile.path,
		"",
		labelForReferenceFile,
	);
	const updatedLine = `${lineWithoutId} ${linkedToReferencedFile} ${blockId}`;

	const cursor = editor.getCursor(); // `setLine` moves cursor, so we need to move it back
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor);
}
