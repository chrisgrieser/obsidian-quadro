import { App, Editor, Notice, OpenViewState, TAbstractFile, TFile, normalizePath } from "obsidian";
import Quadro from "src/main";

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

/** $0 matches the full link, $1 the inner link
 * includes optional trailing space to remove it when unassigning code */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\] ?/;

//──────────────────────────────────────────────────────────────────────────────

/** returns type of file. If no file is given, checks
 * the active file. Returns false is there is no active file or the file is not
 * a markdown file. */
export function typeOfFile(
	plugin: Quadro,
	file?: TAbstractFile | string,
): "Data File" | "Code File" | "Extraction File" | "Template" | "Backup" | "Not Markdown" {
	const { app, settings } = plugin;

	const fileToCheck =
		file === undefined
			? app.workspace.getActiveFile()
			: typeof file === "string"
				? app.vault.getFileByPath(file)
				: file;
	if (!fileToCheck || !(fileToCheck instanceof TFile) || fileToCheck.extension !== "md")
		return "Not Markdown";

	if (fileToCheck.name === "Template.md") return "Template";
	if (fileToCheck.path.includes(plugin.backupDirName)) return "Backup";
	if (fileToCheck.path.startsWith(settings.coding.folder + "/")) return "Code File";
	if (fileToCheck.path.startsWith(settings.extraction.folder + "/")) return "Extraction File";
	return "Data File";
}

export async function createCodeBlockFile(plugin: Quadro, name: string, content: string[]) {
	const { app, settings } = plugin;

	const analysisFolder = settings.analysis.folder;
	const analysisFolderExists = app.vault.getFolderByPath(analysisFolder);
	if (!analysisFolderExists) app.vault.createFolder(analysisFolder);
	const filepath = normalizePath(analysisFolder + `/${name}.md`);

	let codeblockFile = app.vault.getFileByPath(filepath);
	if (codeblockFile) {
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
	const emptyLine =
		editor.getLine(editor.getCursor().line).trim() === "" && !editor.somethingSelected();
	if (emptyLine) {
		new Notice("Current line is empty. \n\nMove cursor to a paragraph and try again.", 4000);
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
