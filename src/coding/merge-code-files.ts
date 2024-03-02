import { Notice } from "obsidian";
import Quadro from "src/main";
import { ambiguousSelection, currentlyInFolder, getActiveEditor } from "src/shared/utils";

export function mergeCodeFilesCommand(plugin: Quadro): void {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;
	if (!currentlyInFolder(plugin, "Codes")) {
		new Notice("You must be in the Code File for this.", 3000);
		return;
	}
}
