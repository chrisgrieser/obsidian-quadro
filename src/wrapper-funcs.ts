// INFO Wrap existing Obsidian commands in new commands to make it more
// accessible for users new to Obsidian, since the target audience of the plugin
// is non-Obsidian users. Also, this allows us to assign the commands to
// specific default hotkeys, add a ribbon button for it, and add some minor
// validation.

import { App, Notice } from "obsidian";
import { CODE_FOLDER_NAME } from "./settings";

export function renameCode(app: App) {
	const isInCodeFolder = app.workspace.getActiveFile()?.path.startsWith(CODE_FOLDER_NAME + "/");
	if (!isInCodeFolder) {
		new Notice("Not in a code file.");
		return;
	}
	app.commands.executeCommandById("workspace:edit-file-title");
}

export function mergeCodes(app: App) {
	const isInCodeFolder = app.workspace.getActiveFile()?.path.startsWith(CODE_FOLDER_NAME + "/");
	if (!isInCodeFolder) {
		new Notice("Not in a code file.");
		return;
	}
	new Notice("Select a code file from the list.");
	app.commands.executeCommandById("note-composer:merge-file");
}
