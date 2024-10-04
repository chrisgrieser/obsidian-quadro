import { Notice } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import Quadro from "src/main";
import { typeOfFile } from "src/shared/utils";

// INFO
// Wrap existing Obsidian command to make it more accessible for users new to
// Obsidian, since the target audience of the plugin is non-Obsidian users.
// Also, this allows us to assign the commands to specific default hotkeys, add
// a ribbon button for it, and add minor validation.

export function renameCodeCommand(plugin: Quadro): void {
	if (typeOfFile(plugin) === "Code File") {
		plugin.app.commands.executeCommandById("workspace:edit-file-title");
		incrementProgress(plugin, "Code File", "rename");
	} else {
		new Notice("You must be in a Code File.", 4000);
	}
}
