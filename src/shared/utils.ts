import { App, OpenViewState, TAbstractFile, TFile, normalizePath } from "obsidian";
import Quadro from "src/main";
import { getActiveEditor } from "./editor-utils";

//──────────────────────────────────────────────────────────────────────────────

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
): "Data File" | "Code File" | "Extraction File" | "Template" | false {
	const { app, settings } = plugin;

	const fileToCheck =
		file === undefined
			? app.workspace.getActiveFile()
			: typeof file === "string"
				? app.vault.getFileByPath(file)
				: file;
	if (!fileToCheck || !(fileToCheck instanceof TFile) || fileToCheck.extension !== "md")
		return false;

	if (fileToCheck.path.startsWith(settings.coding.folder + "/")) return "Code File";
	if (fileToCheck.path.startsWith(settings.extraction.folder + "/")) return "Extraction File";
	if (fileToCheck.name === "Template.md") return "Template"; // PERF last, since least likely
	return "Data File";
}

export async function createCodeBlockFile(plugin: Quadro, label: string, name: string) {
	const { app, settings } = plugin;
	const content = ["```" + label, "```", ""];

	const analysisFolderExists = app.vault.getFolderByPath(settings.analysis.folder);
	if (!analysisFolderExists) app.vault.createFolder(settings.analysis.folder);

	const filepath = normalizePath(settings.analysis.folder + `/${name}.md`);
	const codeblockFile =
		app.vault.getFileByPath(filepath) || (await app.vault.create(filepath, content.join("\n")));

	await openFileInActiveLeaf(app, codeblockFile);

	const editor = getActiveEditor(plugin.app);
	editor?.setCursor({ line: content.length, ch: 0 });
}

//──────────────────────────────────────────────────────────────────────────────

/** plugin does not deal with Markdown Links yet, so we enforce usage of
 * wikilinks for now :S */
export function ensureWikilinksSetting(app: App): void {
	app.vault.setConfig("useMarkdownLinks", false);
}

/** Changed types makes breaks some things, such as the display of dates in
 * DataLoom. Therefore, we are ensuring the correct type here.
 * NOTE `setType` is marked as internal, so keep an eye on it. */
export function ensureCorrectPropertyTypes(app: App): void {
	app.metadataTypeManager.setType("extraction-date", "datetime");
	app.metadataTypeManager.setType("extraction-source", "multitext");
	app.metadataTypeManager.setType("code description", "text");
}
