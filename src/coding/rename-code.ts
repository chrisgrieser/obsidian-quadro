import { Notice } from "obsidian";
import Quadro from "src/main";
import { typeOfFile } from "src/shared/utils";
import { isCodeTemplateFile } from "./coding-utils";

// INFO
// Wrap existing Obsidian command to make it more accessible for users new to
// Obsidian, since the target audience of the plugin is non-Obsidian users.
// Also, this allows us to assign the commands to specific default hotkeys, add
// a ribbon button for it, and add some minor validation.

export function renameCodeCommand(plugin: Quadro): void {
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("You must be in a Code File.", 4000);
	} else if (isCodeTemplateFile(plugin, plugin.app.workspace.getActiveFile())) {
		new Notice("You cannot rename the template file.", 5000);
	} else {
		plugin.app.commands.executeCommandById("workspace:edit-file-title");
	}
}
