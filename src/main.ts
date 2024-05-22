import { Command, Plugin } from "obsidian";
import { processCodeOverviewCodeblock } from "./coding/code-overview";
import { CODING_COMMANDS } from "./coding/coding-commands";
import { setupTrashWatcher } from "./deletion-watcher";
import { EXTRACTION_COMMANDS } from "./extraction/extraction-commands";
import { processExtractiontypesOverviewCodeblock } from "./extraction/extractiontypes-overview";
import { suppressCertainFrontmatterSuggestions as setCssForSuggestionSurpression } from "./frontmatter-modifications/suppress-suggestions";
import { setCssForWidthOfKeys } from "./frontmatter-modifications/width-of-keys";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import { QuadroSettingsMenu } from "./settings/settings-menu";
import { ensureCorrectPropertyTypes } from "./shared/utils";
import { updateStatusbar } from "./statusbar";

// biome-ignore lint/style/noDefaultExport: required for Obsidian plugins to work
export default class Quadro extends Plugin {
	styleElSuppressSuggestionsInFields?: HTMLStyleElement;
	styleElPropertyKeyWidth?: HTMLStyleElement;
	cssclass = this.manifest.id;
	codeblockLabels = {
		extractionOverview: "quadro-extractiontypes-overview",
		codeOverview: "quadro-code-overview",
	};

	statusbar = this.addStatusBarItem();
	trashWatcherUninstaller?: () => void;
	settings = DEFAULT_SETTINGS; // only fallback value, overwritten in `onload`

	override async onload(): Promise<void> {
		console.info(this.manifest.name + " Plugin loaded.");

		// COMMANDS
		for (const cmd of [...CODING_COMMANDS, ...EXTRACTION_COMMANDS]) {
			const ribbon = this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this));
			ribbon.addClass(this.cssclass);
			ribbon.setCssProps({ border: "1px solid var(--text-faint)" });

			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				icon: cmd.icon,
				editorCallback: async () => cmd.func(this),
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
		setCssForSuggestionSurpression(this);
		setCssForWidthOfKeys(this);
		ensureCorrectPropertyTypes(this.app);

		// CODE BLOCKS
		this.registerMarkdownCodeBlockProcessor(this.codeblockLabels.codeOverview, (_source, el) => {
			el.innerHTML = processCodeOverviewCodeblock(this);
			el.addClass(this.cssclass);
		});
		this.registerMarkdownCodeBlockProcessor(
			this.codeblockLabels.extractionOverview,
			(_source, el) => {
				el.innerHTML = processExtractiontypesOverviewCodeblock(this);
				el.addClass(this.cssclass);
			},
		);
	}

	//───────────────────────────────────────────────────────────────────────────

	override onunload(): void {
		if (this.trashWatcherUninstaller) this.trashWatcherUninstaller();

		console.info(this.manifest.name + " Plugin unloaded.");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
