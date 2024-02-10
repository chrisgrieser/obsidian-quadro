import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { CODE_FOLDER_NAME } from "./settings";

/** if not in a code file, also display a notice */
export function currentlyInCodeFolder(app: App): boolean {
	const inCodeFolder = app.workspace.getActiveFile()?.path.startsWith(CODE_FOLDER_NAME + "/");
	return Boolean(inCodeFolder);
}

/** if not there is no active markdown view, also display a notice */
export function safelyGetActiveEditor(app: App): null | Editor {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice("No active editor.");
		return null;
	}
	return view.editor;
}

export function getFullCodeName(codeFile: TFile): string {
	return codeFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
}
