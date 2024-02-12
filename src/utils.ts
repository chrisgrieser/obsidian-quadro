import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { CODE_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "./settings";

type QdaType = "Codes" | "Extractions";

//──────────────────────────────────────────────────────────────────────────────

export function currentlyInFolder(app: App, type: QdaType): boolean {
	const folderName = type === "Codes" ? CODE_FOLDER_NAME : EXTRACTION_FOLDER_NAME;
	const isInFolder = app.workspace.getActiveFile()?.path.startsWith(folderName + "/");
	return Boolean(isInFolder);
}

export function getFullTokenName(tFile: TFile, type: QdaType): string {
	const folderName = type === "Codes" ? CODE_FOLDER_NAME : EXTRACTION_FOLDER_NAME;
	return tFile.path.slice(folderName.length + 1, -3);
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
