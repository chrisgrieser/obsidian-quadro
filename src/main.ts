import { Command, Plugin } from "obsidian";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { trashWatcher } from "./coding/delete-code-everywhere";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { DEFAULT_SETTINGS, QuadroSettings } from "./settings";
import { updateStatusbar } from "./statusbar";

export default class Quadro extends Plugin {
	statusbar = this.addStatusBarItem();
	monkeyAroundTrash: (() => void) | undefined;
	// default settings only fallback value, will be overwritten `onload`
	settings: QuadroSettings = DEFAULT_SETTINGS;

	override async onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		// COMMANDS
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS]) {
			this.addRibbonIcon(cmd.ribbonIcon, `Quadro: ${cmd.name}`, () => cmd.func(this));
			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this),
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
		updateStatusbar(this);
		this.registerEvent(this.app.workspace.on("file-open", () => updateStatusbar(this)));
		// Instead of updating the statusbar after every action, update it after
		// metadata changes. This is more reliable then calling `updateStatusbar`
		// after every quadro command, since the cache is up-to-date.
		this.registerEvent(this.app.metadataCache.on("resolved", () => updateStatusbar(this)));

		// DELETION-WATCHER: use monkey-around to intercept `app.vault.trash`
		this.monkeyAroundTrash = trashWatcher(this);

		// SETTINGS
		await this.loadSettings();
		console.log("🔹 this.settings:", this.settings);
	}

	override onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");

		// uninstall monkey-around-patch
		if (this.monkeyAroundTrash) {
			this.monkeyAroundTrash(); // runs the uninstaller
			this.monkeyAroundTrash = undefined;
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		this.saveData(this.settings);
	}
}
