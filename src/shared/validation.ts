import { type App, type Editor, Notice, type TAbstractFile, TFile } from "obsidian";
import type Quadro from "src/main";
import { BACKUP_DIRNAME } from "src/settings/constants";

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

export function selHasHighlightMarkup(_: Editor): boolean {
	return false;
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
