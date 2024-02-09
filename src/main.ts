import { Plugin } from "obsidian";
import { assignCode } from "./assign-code";
import { unAssignCode } from "./unassign-code";

export default class Quadro extends Plugin {
	onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		// INFO Adding a hotkey by default, since this plugin is going to be
		// used by many people not familiar with Obsidian. Requiring them to
		// add an hotkey would unnecessarily complicate the onboarding for
		// them. We are, however, using combinations that are unlikely to
		// conflict with other plugins with other hotkeys.
		const assignCmdName = "Assign code to paragraph";
		this.addRibbonIcon("plus-circle", `Quadro: ${assignCmdName}`, () => assignCode(this.app));
		this.addCommand({
			id: "assign-code",
			name: assignCmdName,
			editorCallback: () => assignCode(this.app),
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "a" }],
		});

		const removeCmdName = "Remove code from paragraph";
		this.addRibbonIcon("minus-circle", `Quadro: ${removeCmdName}`, () => unAssignCode(this.app));
		this.addCommand({
			id: "unassign-code",
			name: removeCmdName,
			editorCallback: () => unAssignCode(this.app),
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "r" }],
		});
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
