import { Command, Plugin } from "obsidian";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { updateStatusbar } from "./statusbar";

export default class Quadro extends Plugin {
	statusbar = this.addStatusBarItem();

	override onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		// COMMANDS
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

		// STATUSBAR
		updateStatusbar(this.app, this.statusbar);
		this.registerEvent(
			this.app.workspace.on("file-open", () => updateStatusbar(this.app, this.statusbar)),
		);
		// instead of triggering the update after every action, we trigger it
		// after every metadata change is done. This is also more reliable, since
		// the update is only done when the cache is up to date.
		this.registerEvent(
			this.app.metadataCache.on("resolved", () => updateStatusbar(this.app, this.statusbar)),
		);
	}

	override onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
