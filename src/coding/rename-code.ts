import { Notice } from "obsidian";
import Quadro from "src/main";
import { incrementProgress } from "src/shared/progress-tracker";
import { typeOfFile } from "src/shared/utils";

// INFO
// Wrap existing Obsidian command to make it more accessible for users new to
// Obsidian, since the target audience of the plugin is non-Obsidian users.
// Also, this allows us to assign the commands to specific default hotkeys, add
// a ribbon button for it, and add minor validation.

export function renameCodeCommand(plugin: Quadro): void {
	if (typeOfFile(plugin) === "Code File") {
		plugin.app.commands.executeCommandById("workspace:edit-file-title");
		incrementProgress(plugin, "coding", "rename");
	} else {
		new Notice("You must be in a Code File.", 4000);
	}
}
