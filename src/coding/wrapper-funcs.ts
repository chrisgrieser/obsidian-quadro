// INFO 
// Wrap existing Obsidian commands in new commands to make it more accessible
// for users new to Obsidian, since the target audience of the plugin is
// non-Obsidian users. Also, this allows us to assign the commands to specific
// default hotkeys, add a ribbon button for it, and add some minor validation.

import { App, Notice } from "obsidian";
import { currentlyInFolder } from "src/utils";

//──────────────────────────────────────────────────────────────────────────────

export function renameCode(app: App) {
	if (!currentlyInFolder(app, "Codes")) {
		new Notice("You must be in a code file.");
	} else {
		app.commands.executeCommandById("workspace:edit-file-title");
	}
}

export function mergeCodes(app: App) {
	if (!currentlyInFolder(app, "Codes")) {
		new Notice("You must be in a code file.");
	} else {
		// ensure plugin is enabled, to save new users the trouble of enabling it
		app.internalPlugins.plugins["note-composer"]?.enable();

		new Notice("Select a Code File from the list.");
		app.commands.executeCommandById("note-composer:merge-file");
	}
}
