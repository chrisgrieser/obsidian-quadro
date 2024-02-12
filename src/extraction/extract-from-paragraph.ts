import { App, Notice } from "obsidian";
import { currentlyInFolder, safelyGetActiveEditor } from "src/utils";

export function extractFromParagraph(app: App) {
	// GUARD
	if (currentlyInFolder(app, "Codes") || currentlyInFolder(app, "Extractions")) {
		new Notice("You must be in a Data File to make an extraction.");
		return;
	}
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;
}
