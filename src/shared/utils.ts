import { type App, type Editor, Notice, normalizePath, type OpenViewState } from "obsidian";
import type Quadro from "src/main";

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

/** $0 matches the full link, $1 the link target */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\]/;

//──────────────────────────────────────────────────────────────────────────────

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

export function getActiveEditor(app: App): Editor | undefined {
	const editor = app.workspace.activeEditor?.editor;
	if (!editor) new Notice("No active editor.");
	return editor;
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
 * some plguins. Therefore, we are ensuring the correct type here.
 * NOTE `setType` is marked as internal, so keep an eye on it. */
export function ensureCorrectPropertyTypes(app: App): void {
	app.metadataTypeManager.setType("extraction-date", "datetime");
	app.metadataTypeManager.setType("merge-date", "datetime");
	app.metadataTypeManager.setType("extraction-source", "multitext");
	app.metadataTypeManager.setType("code description", "text");
}
