import {
	type App,
	type Editor,
	Notice,
	normalizePath,
	type OpenViewState,
	type TAbstractFile,
	TFile,
} from "obsidian";
import type Quadro from "src/main";
import { BACKUP_DIRNAME } from "src/settings/constants";

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

/** $0 matches the full link, $1 the link target */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\]/;

//──────────────────────────────────────────────────────────────────────────────

/** Returns type of file. If no file is given, checks the active file. */
export function typeOfFile(
	plugin: Quadro,
	file?: TAbstractFile | string | null,
):
	| "Data File"
	| "Code File"
	| "Extraction File"
	| "Template"
	| "Backup"
	| "Not Markdown"
	| "No File" {
	const { app, settings } = plugin;
	if (!file) file = app.workspace.getActiveFile();
	if (typeof file === "string") file = app.vault.getFileByPath(file);

	if (!file) return "No File";
	if (!(file instanceof TFile) || file.extension !== "md") return "Not Markdown";
	if (file.name === "Template.md") return "Template";
	if (file.path.includes(BACKUP_DIRNAME)) return "Backup";
	if (file.path.startsWith(settings.coding.folder + "/")) return "Code File";
	if (file.path.startsWith(settings.extraction.folder + "/")) return "Extraction File";
	return "Data File";
}

export async function createCodeBlockFile(
	plugin: Quadro,
	name: string,
	content: string[],
): Promise<void> {
	const { app, settings } = plugin;

	const analysisFolder = settings.analysis.folder;
	const analysisFolderExists = app.vault.getFolderByPath(analysisFolder);
	if (!analysisFolderExists) app.vault.createFolder(analysisFolder);
	const filepath = normalizePath(analysisFolder + `/${name}.md`);

	let codeblockFile = app.vault.getFileByPath(filepath);
	if (codeblockFile) {
		// Using `vault.modify` over `vault.process` is okay here, since the
		// existing content is supposed to be discarded/overwritten.
		await app.vault.modify(codeblockFile, content.join("\n"));
	} else {
		codeblockFile = await app.vault.create(filepath, content.join("\n"));
	}

	await app.workspace.getLeaf().openFile(codeblockFile, LIVE_PREVIEW);
	getActiveEditor(app)?.setCursor({ line: 0, ch: 0 });
	app.commands.executeCommandById("file-explorer:reveal-active-file");
}

//──────────────────────────────────────────────────────────────────────────────

/** if not there is no active editor, also display a notice */
export function getActiveEditor(app: App): Editor | undefined {
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) new Notice("No active editor.");
	return editor;
}

/** check if selection is unambiguous, ensuring that subsequent calls of
 * `getLine` or `getCursor` behave predictably */
export function ambiguousSelection(editor: Editor): boolean {
	const emptyLine = editor.getLine(editor.getCursor().line).trim() === "";
	if (emptyLine) {
		new Notice("Current line is empty.\n\nMove cursor to a paragraph and try again.", 5000);
		return true;
	}

	let msg = "";
	if (editor.listSelections().length > 1) msg = "Multiple selections are not supported.";
	if (editor.getSelection().includes("\n\n")) msg = "Multiple paragraphs are selected.";
	if (editor.getSelection().match(/^\n|\n$/)) msg = "Selection starts or ends with a line break.";
	if (msg) {
		msg += "\n\nChange your selection and try again.";
		new Notice(msg, 5000);
		return true;
	}

	return false;
}

export function selHasHighlightMarkup(editor: Editor): boolean {
	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.", 4000);
	}
	return hasHighlightMarkupInSel;
}

export function activeFileHasInvalidName(app: App): boolean {
	const file = app.workspace.getActiveFile();
	if (!file) return false;
	const invalidChar = file.basename.match(/[|^#]/)?.[0];
	if (!invalidChar) return false;

	const msg = `The current file contains an invalid character: ${invalidChar}\n\nRename the file and try again.`;
	new Notice(msg, 0);
	return true;
}

/** needed, since Obsidian block-ids are only valid on the last line of a paragraph */
export function moveToLastLineOfParagraph(editor: Editor): number {
	let lnum = editor.getCursor().line;
	while (true) {
		// beyond end of file, `editor.getLine` also returns "", thus this check suffices
		const nextLineIsBlank = editor.getLine(lnum + 1).trim() === "";
		const currentLineIsListItem = editor.getLine(lnum).match(/^\s*([-*+]|[0-9]+\.)\s/);
		if (nextLineIsBlank || currentLineIsListItem) break;
		lnum++;
		editor.setCursor({ line: lnum, ch: 0 });
	}
	return lnum;
}

//──────────────────────────────────────────────────────────────────────────────

/** Changed types breaks some things, such as the display of dates in
 * DataLoom/Projects. Therefore, we are ensuring the correct type here.
 * NOTE `setType` is marked as internal, so keep an eye on it. */
export function ensureCorrectPropertyTypes(app: App): void {
	app.metadataTypeManager.setType("extraction-date", "datetime");
	app.metadataTypeManager.setType("merge-date", "datetime");
	app.metadataTypeManager.setType("extraction-source", "multitext");
	app.metadataTypeManager.setType("code description", "text");
}
