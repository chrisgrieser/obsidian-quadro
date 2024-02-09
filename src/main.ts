import { Plugin } from "obsidian";
import { assignCode } from "./assign-code";
import { unAssignCode } from "./unassign-code";
import { mergeCodes, renameCode } from "./wrapper-funcs";

export default class Quadro extends Plugin {
	onload() {
		// INFO Adding a hotkey by default, since this plugin is going to be
		// used by many people not familiar with Obsidian. Requiring them to
		// add an hotkey would unnecessarily complicate the onboarding for
		// them. We are, however, using combinations that are unlikely to
		// conflict with other plugins with other hotkeys.
		const commands = [
			{
				id: "assign-code",
				name: "Assign code to paragraph",
				func: assignCode,
				hotkeyLetter: "a",
				icon: "plus-circle",
			},
			{
				id: "unassign-code",
				name: "Remove code from paragraph",
				func: unAssignCode,
				hotkeyLetter: "u",
				icon: "minus-circle",
			},
			{
				id: "rename-code",
				name: "Rename code",
				func: renameCode,
				hotkeyLetter: "r",
				icon: "pen-line",
			},
			{
				id: "merge-codes",
				name: "Merge codes",
				func: mergeCodes,
				hotkeyLetter: "m",
				icon: "merge",
			},
		];

		for (const cmd of commands) {
			this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this.app));
			this.addCommand({
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this.app),
				hotkeys: [{ modifiers: ["Mod", "Shift"], key: cmd.hotkeyLetter }],
			});
		}

		console.info(this.manifest.name + " Plugin loaded.");
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
