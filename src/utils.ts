import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { CODE_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "./settings";

export function currentlyInFolder(app: App, type: "Codes" | "Extractions"): boolean {
	const folderName = type === "Codes" ? CODE_FOLDER_NAME : EXTRACTION_FOLDER_NAME;
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) return false;
	const isInFolder = activeFile.path.startsWith(folderName + "/");
	return Boolean(isInFolder);
}

export function getFullCode(tFile: TFile): string {
	return tFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
}

/** if not there is no active markdown view, also display a notice */
export function safelyGetActiveEditor(app: App): Editor | null {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice("No active editor.");
		return null;
	}
	return view.editor;
}

export const SUGGESTER_INSTRUCTIONS = [
	{ command: "↑↓", purpose: "Navigate" },
	{ command: "⏎", purpose: "Select" },
	{ command: "esc", purpose: "Dismiss" },
];
