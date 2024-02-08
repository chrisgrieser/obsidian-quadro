import { Plugin } from "obsidian";
import { assignCode } from "./assign-code";

export default class Quadro extends Plugin {
	onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		this.addCommand({
			id: "assign-code",
			name: "Assign code",
			editorCallback: assignCode,

			// Adding a hotkey by default, since this plugin is going to be
			// used by many people not familiar with Obsidian. Requiring them to
			// add an hotkey would unnecessarily complicate the onboarding for
			// them. Using `alt+c` as a combination, as it is unlikely to conflict
			// with other hotkeys.
			hotkeys: [{ modifiers: ["Alt"], key: "c" }],
		});

		this.addRibbonIcon("plus-circle", "Quadro: Assign code", () => assignCode(this.app));
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
