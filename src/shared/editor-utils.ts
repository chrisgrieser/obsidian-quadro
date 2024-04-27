import moment from "moment";
import { App, Editor, EditorPosition, Notice, TFile } from "obsidian";

/** if not there is no active editor, also display a notice */
export function getActiveEditor(app: App): Editor | undefined {
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) new Notice("No active editor.");
	return editor;
}

/** check if selection is unambiguous, ensuring that subsequent calls of
 * `getLine` or `getCursor` behave predictably */
export function ambiguousSelection(editor: Editor): boolean {
	const emptyLine =
		editor.getLine(editor.getCursor().line).trim() === "" && !editor.somethingSelected();
	if (emptyLine) {
		new Notice("Current lint is empty. \n\nMove cursor to a paragraph and try again.", 4000);
		return true;
	}

	const multilineSelection = editor.getCursor("head").line !== editor.getCursor("anchor").line;
	const multipleSelections = editor.listSelections().length > 1;
	if (multilineSelection || multipleSelections) {
		new Notice(
			"Paragraph ambiguous since multiple lines are selected.\n\n" +
				"Unselect, move your cursor to the paragraph you want to affect, and use the command again.",
			5000,
		);
		return true;
	}
	return false;
}

export function selHasHighlightMarkup(editor: Editor): boolean {
	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.");
	}
	return hasHighlightMarkupInSel;
}

//──────────────────────────────────────────────────────────────────────────────

/** DOCS https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
 * INFO blockIds may only contain letters, numbers, and a hyphen */
export const BLOCKID_REGEX = /\^[\w-]+$/;

/** group 1: linkpath, group 2: blockID */
export const EMBEDDED_BLOCKLINK_REGEX = /^!\[\[(.+?)#(\^[\w-]+)\]\]$/;

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
	cursor: EditorPosition;
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
	return { blockId, lineWithoutId, cursor };
}

/** assumes datafile is the file in the passed editor */
export function insertReferenceToDatafile(
	editor: Editor,
	referencedFile: TFile,
	labelForReferenceFile: string,
	lineWithoutId: string,
	blockId: string,
	cursor: EditorPosition,
): void {
	const dataFile = editor.editorComponent.view.file;
	const app = editor.editorComponent.app;

	app.vault.setConfig("useMarkdownLinks", false); // ensure wikilinks
	const linkedToReferencedFile = app.fileManager.generateMarkdownLink(
		referencedFile,
		dataFile.path,
		"",
		labelForReferenceFile,
	);
	const updatedLine = `${lineWithoutId} ${linkedToReferencedFile} ${blockId}`;
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back
}
