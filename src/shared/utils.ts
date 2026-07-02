import { type App, type Editor, Notice, type OpenViewState } from "obsidian";

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

/** $0 matches the full link, $1 the link target */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\]/;

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
