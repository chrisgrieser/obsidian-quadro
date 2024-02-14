import { Command, Plugin } from "obsidian";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { updateStatusbar } from "./statusbar";

export default class Quadro extends Plugin {
	statusbar?: HTMLElement;

	override onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		// create commands & ribbon buttons for all commands of this plugin
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS]) {
			this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this.app));
			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this.app),
			};

			// INFO Adding a few hotkey by default, since this plugin is going to be
			// used by many people not familiar with Obsidian. Requiring them to
			// add an hotkey would unnecessarily complicate the onboarding for
			// them. We are, however, using combinations that are unlikely to
			// conflict with other plugins with other hotkeys. 
			if (cmd.hotkeyLetter) {
				cmdObj.hotkeys = [{ modifiers: ["Mod", "Shift"], key: cmd.hotkeyLetter }];
			}
			this.addCommand(cmdObj);
		}

		// create statusbar, initialize it, and set hook for it
		this.statusbar = this.addStatusBarItem();
		updateStatusbar(this.app);
		this.registerEvent(this.app.workspace.on("file-open", () => updateStatusbar(this.app)));
	}

	override onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
