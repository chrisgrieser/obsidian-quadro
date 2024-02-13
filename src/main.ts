import { Command, Plugin } from "obsidian";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { updateStatusbar } from "./statusbar";

export default class Quadro extends Plugin {
	statusbar?: HTMLElement;

	override onload() {
		// create commands & ribbon buttons for all commands of this plugin
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS]) {
			this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this.app));
			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this.app),
			};
			if (cmd.hotkeyLetter) {
				cmdObj.hotkeys = [{ modifiers: ["Mod", "Shift"], key: cmd.hotkeyLetter }];
			}
			this.addCommand(cmdObj);
		}

		// create statusbar, initialize it, and set hook for it
		this.statusbar = this.addStatusBarItem();
		updateStatusbar(this.app);
		this.registerEvent(
			this.app.workspace.on("file-open", () => updateStatusbar(this.app)),
		);

		console.info(this.manifest.name + " Plugin loaded.");
	}

	override onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
