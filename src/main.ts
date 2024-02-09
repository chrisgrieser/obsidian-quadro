import { Plugin } from "obsidian";
import { assignCode } from "./assign-code";
import { unAssignCode } from "./unassign-code";

export default class Quadro extends Plugin {
	onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		// INFO Adding a hotkey by default, since this plugin is going to be
		// used by many people not familiar with Obsidian. Requiring them to
		// add an hotkey would unnecessarily complicate the onboarding for
		// them. Using `alt+c` as a combination, as it is unlikely to conflict
		// with other hotkeys.
		this.addRibbonIcon("plus-circle", "Quadro: Assign code", () => assignCode(this.app));
		this.addCommand({
			id: "assign-code",
			name: "Assign code to paragraph",
			editorCallback: assignCode,
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "a" }],
		});

		this.addRibbonIcon("minus-circle", "Quadro: Remove code from paragraph", () =>
			unAssignCode(this.app),
		);
		this.addCommand({
			id: "unassign-code",
			name: "Remove code from paragraph",
			editorCallback: unAssignCode,
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "r" }],
		});
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
