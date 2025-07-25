import { type Command, Plugin } from "obsidian";
import { AUXILIARY_COMMANDS } from "./auxiliary/auxiliary-commands.ts";
import { updateStatusbar } from "./auxiliary/statusbar.ts";
import { processCodeOverviewCodeblock } from "./coding/code-overview.ts";
import { CODING_COMMANDS } from "./coding/coding-commands.ts";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands.ts";
import { processExtractiontypeOverviewCodeblock } from "./extraction/extractiontypes-overview.ts";
import { suppressCertainFrontmatterSuggestions as setCssForSuggestionSurpression } from "./frontmatter-modifications/suppress-suggestions.ts";
import { setCssForWidthOfKeys } from "./frontmatter-modifications/width-of-keys.ts";
import { CODEBLOCK_LABELS } from "./settings/constants.ts";
import { deepExtend } from "./settings/deep-extend.ts";
import { DEFAULT_SETTINGS, type QuadroSettings } from "./settings/defaults.ts";
import { QuadroSettingsMenu } from "./settings/settings-menu.ts";
import { setupTrashWatcher } from "./shared/trashing-watcher.ts";
import { ensureCorrectPropertyTypes } from "./shared/utils.ts";

export default class Quadro extends Plugin {
	styleElSuppressSuggestionsInFields?: HTMLStyleElement;
	styleElPropertyKeyWidth?: HTMLStyleElement;
	cssclass = this.manifest.id;
	statusbar = this.addStatusBarItem();
	trashWatcherUninstaller?: () => void;
	settings: QuadroSettings = DEFAULT_SETTINGS; // only fallback value, overwritten in `onload`

	override async onload(): Promise<void> {
		console.info(this.manifest.name + " Plugin loaded.");

		// COMMANDS
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS, ...AUXILIARY_COMMANDS]) {
			const ribbon = this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this));
			ribbon.addClasses([this.cssclass, "quadro-ribbon-button"]);

			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				icon: cmd.icon, // only used on mobile toolbar
				editorCallback: async (): Promise<void> => cmd.func(this),
			};

			// INFO Adding a few hotkey by default, since this plugin is going to be
			// used by many people not familiar with Obsidian. Requiring them to
			// add an hotkey would unnecessarily complicate the onboarding for
			// them. We are, however, using combinations that are unlikely to
			// conflict with other hotkeys.
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
		setCssForSuggestionSurpression(this);
		setCssForWidthOfKeys(this);
		ensureCorrectPropertyTypes(this.app);

		// CODE BLOCKS
		this.registerMarkdownCodeBlockProcessor(CODEBLOCK_LABELS.codeOverview, (_source, el) => {
			el.innerHTML = processCodeOverviewCodeblock(this);
			el.addClass(this.cssclass);
		});
		this.registerMarkdownCodeBlockProcessor(CODEBLOCK_LABELS.extractionOverview, (source, el) => {
			el.innerHTML = processExtractiontypeOverviewCodeblock(this, source);
			el.addClass(this.cssclass);
		});
		// add yaml-syntax highlighting to codeblocks
		window.CodeMirror.defineMode(CODEBLOCK_LABELS.extractionOverview, (config) =>
			window.CodeMirror.getMode(config, "yaml"),
		);
	}

	//───────────────────────────────────────────────────────────────────────────

	override onunload(): void {
		if (this.trashWatcherUninstaller) this.trashWatcherUninstaller();

		// de-register yaml-syntax highlighting
		window.CodeMirror.defineMode(CODEBLOCK_LABELS.extractionOverview, (config) =>
			window.CodeMirror.getMode(config, ""),
		);

		console.info(this.manifest.name + " Plugin unloaded.");
	}

	async loadSettings(): Promise<void> {
		this.settings = deepExtend({}, DEFAULT_SETTINGS, await this.loadData()) as QuadroSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
