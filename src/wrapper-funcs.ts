// INFO Wrap existing Obsidian commands in new commands to make it more
// accessible for users new to Obsidian, since the target audience of the plugin
// is non-Obsidian users. Also, this allows us to assign the commands to
// specific default hotkeys, add a ribbon button for it, and add some minor
// validation.

import { App, Notice } from "obsidian";
import { currentlyInCodeFolder } from "./utils";

export function renameCode(app: App) {
	if (!currentlyInCodeFolder(app)) return;
	app.commands.executeCommandById("workspace:edit-file-title");
}

export function mergeCodes(app: App) {
	const noteComposerEnabled = app.internalPlugins.plugins["note-composer"].enabled;
	if (!noteComposerEnabled) {
		new Notice(
			'The "Note Composer" plugin needs to be enabled.\n' +
				'You can enable it in the Obsidian settings under "Core plugins."',
		);
		return;
	}
	if (!currentlyInCodeFolder(app)) return;
	new Notice("Select a code file from the list.");
	app.commands.executeCommandById("note-composer:merge-file");
}
