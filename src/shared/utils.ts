import { App, Editor, Notice, OpenViewState, TAbstractFile, TFile } from "obsidian";
import Quadro from "src/main";

//──────────────────────────────────────────────────────────────────────────────

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
): "Data File" | "Code File" | "Extraction File" | "Template" | false {
	const { app, settings } = plugin;

	const fileToCheck =
		file === undefined
			? app.workspace.getActiveFile()
			: typeof file === "string"
				? app.vault.getFileByPath(file)
				: file;
	if (!fileToCheck) return false;

	if (!(fileToCheck instanceof TFile) || fileToCheck.extension !== "md") return false;
	if (fileToCheck.name === "Template.md") return "Template";

	if (fileToCheck.path.startsWith(settings.coding.folder + "/")) return "Code File";
	if (fileToCheck.path.startsWith(settings.extraction.folder + "/")) return "Extraction File";
	return "Data File";
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

/** plugin does not deal with Markdown Links yet, so we enforce usage of
 * wikilinks for now :S */
export function ensureWikilinksSetting(app: App): void {
	app.vault.setConfig("useMarkdownLinks", false);
}

/** Changed types makes breaks some things, such as the display of dates in
 * DataLoom. Therefore, we are ensuring the correct type here.
 * NOTE `setType` is marked as internal, so keep an eye on it. */
export function ensureCorrectPropertyTypes(app: App): void {
	app.metadataTypeManager.setType("extraction date", "datetime");
	app.metadataTypeManager.setType("extraction source", "text");
	app.metadataTypeManager.setType("code description", "text");
}
