import moment from "moment";
import {
	App,
	Editor,
	Notice,
	OpenViewState,
	TAbstractFile,
	TFile,
	getFrontMatterInfo,
	normalizePath,
} from "obsidian";
import Quadro from "src/main";

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

/** $0 matches the full link, $1 the inner link
 * includes optional trailing space to remove it when unassigning code */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\] ?/;

//──────────────────────────────────────────────────────────────────────────────

export async function openFileInActiveLeaf(app: App, tfile: TFile): Promise<void> {
	await app.workspace.getLeaf().openFile(tfile, LIVE_PREVIEW);
	app.commands.executeCommandById("file-explorer:reveal-active-file");
}

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

	await openFileInActiveLeaf(app, codeblockFile);
	const editor = getActiveEditor(app);
	editor?.setCursor({ line: 0, ch: 0 });
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

const invalidCharRegex = /[|^#]/; // other chars are already disallowed by Obsidian
export function activeFileHasInvalidName(app: App): boolean {
	const file = app.workspace.getActiveFile();
	if (!file) return false;
	const invalidChar = file.basename.match(invalidCharRegex)?.[0];
	if (!invalidChar) return false;

	const msg = `The current file contains an invalid character: ${invalidChar}\n\nRename the file and try again.`;
	new Notice(msg, 0);
	return true;
}

export function getLocalIsoDateTime() {
	// as opposed to `.toISOString`, `.format` returns *local* string https://stackoverflow.com/a/28641878/22114136
	// `.slice`, as Obsidian does not accept the timezone appendix.
	// Furthermore, we slice away three for characters since the seconds are not
	// relevant to us
	return moment().format().slice(0, -9);
}

export async function preMergeBackup(
	plugin: Quadro,
	file1: TFile,
	file2: TFile,
	backupDir?: string,
): Promise<void> {
	const app = plugin.app;

	backupDir = normalizePath((backupDir || file1.parent?.path || "") + "/" + plugin.backupDirName);
	if (!app.vault.getFolderByPath(backupDir)) await app.vault.createFolder(backupDir);
	const timestamp = moment().format("YY-MM-DD_HH-mm-ss"); // ensures unique filename

	await app.vault.copy(file1, `${backupDir}/${file1.basename} ${timestamp}.md`);
	await app.vault.copy(file2, `${backupDir}/${file2.basename} ${timestamp}.md`);
}

export function insertMergeDate(fileContent: string): string {
	const fm = getFrontMatterInfo(fileContent);
	const mergeProperty = "merge-date: " + getLocalIsoDateTime();
	let fmContent = fileContent.slice(0, fm.to);

	if (fmContent.includes("\nmerge-date")) {
		fmContent = fmContent.replace(/^merge-date:.*$/m, mergeProperty);
	} else {
		fmContent += "\n" + mergeProperty;
	}

	return fmContent + "\n---\n\n" + fileContent.slice(fm.contentStart);
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

/** FIX wrong embeds sometimes occurring */
export function reloadLivePreview(app: App): void {
	// potential alternative: `app.workspace.activeEditor.leaf.rebuildView()`
	app.workspace.activeEditor?.editor?.editorComponent?.view?.currentMode?.cleanupLivePreview();
}
