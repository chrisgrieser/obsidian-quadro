import { Hotkey, Plugin } from "obsidian";
import { assignCode } from "./assign-code";
import { unAssignCode } from "./unassign-code";

export default class Quadro extends Plugin {
	onload() {
		const commands = [
			{
				id: "assign-code",
				name: "Assign code to paragraph",
				func: assignCode,
				hotkey: { modifiers: ["Mod", "Shift"], key: "a" },
				icon: "plus-circle",
			},
			{
				id: "unassign-code",
				name: "Remove code from paragraph",
				func: unAssignCode,
				hotkey: { modifiers: ["Mod", "Shift"], key: "r" },
				icon: "minus-circle",
			},
		];
		// INFO Adding a hotkey by default, since this plugin is going to be
		// used by many people not familiar with Obsidian. Requiring them to
		// add an hotkey would unnecessarily complicate the onboarding for
		// them. We are, however, using combinations that are unlikely to
		// conflict with other plugins with other hotkeys.
		// INFO Wrap existing Obsidian commands in new commands to make it more
		// accessible for users new to Obsidian.

		for (const cmd of commands) {
			this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => assignCode(this.app));
			this.addCommand({
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this.app),
				hotkeys: [cmd.hotkey as Hotkey],
			});
		}

		console.info(this.manifest.name + " Plugin loaded.");
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
