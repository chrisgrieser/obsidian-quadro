import { Command, Plugin } from "obsidian";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { setupTrashWatcher } from "./coding/delete-code-everywhere";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import { QuadroSettingsMenu } from "./settings/settings-menu";
import { ensureCorrectPropertyTypes } from "./shared/utils";
import { updateStatusbar } from "./statusbar";
import { suppressCertainFrontmatterSuggestions } from "./suppress-fm-suggestions";

export default class Quadro extends Plugin {
	styleEl?: HTMLStyleElement;
	statusbar = this.addStatusBarItem();
	trashWatcherUninstaller?: () => void;
	settings = DEFAULT_SETTINGS; // only fallback value, overwritten in `onload`
	cssclass = this.manifest.id;

	override async onload(): Promise<void> {
		console.info(this.manifest.name + " Plugin loaded.");

		// COMMANDS
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS]) {
			const el = this.addRibbonIcon(cmd.ribbonIcon, `Quadro: ${cmd.name}`, () => cmd.func(this));
			el.addClass(this.cssclass);

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
		this.statusbar.addClass(this.cssclass);
		updateStatusbar(this);
		this.registerEvent(this.app.workspace.on("file-open", () => updateStatusbar(this)));
		// Instead of updating the statusbar after every action, update it after
		// metadata changes. This is more reliable then calling `updateStatusbar`
		// after every quadro command, since the cache is up-to-date.
		this.registerEvent(this.app.metadataCache.on("resolved", () => updateStatusbar(this)));

		// DELETION-WATCHER: use monkey-around to intercept `app.vault.trash`
		this.trashWatcherUninstaller = setupTrashWatcher(this);

		// SETTINGS
		await this.loadSettings();
		this.addSettingTab(new QuadroSettingsMenu(this));
		suppressCertainFrontmatterSuggestions(this);

		// Ensure correct types
		ensureCorrectPropertyTypes(this.app);
	}

	//───────────────────────────────────────────────────────────────────────────

	override onunload(): void {
		console.info(this.manifest.name + " Plugin unloaded.");

		if (this.trashWatcherUninstaller) this.trashWatcherUninstaller();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
