import { Notice, TFile, getFrontMatterInfo } from "obsidian";
import { setupTrashWatcher } from "src/deletion-watcher";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { codeFileDisplay, getAllCodeFiles } from "./coding-utils";

class SuggesterForCodeMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.toBeMergedFile = toBeMergedFile;
		this.setPlaceholder(`Select Code File to merge "${toBeMergedFile.basename}" into`);

		this.setInstructions([
			{
				command: "INFO",
				purpose: "In case of property conflicts, the file selected has priority.",
			},
			...this.hotkeyInstructions,
		]);
	}

	getItems(): TFile[] {
		const allOtherCodeFiles = getAllCodeFiles(this.plugin).filter((codeFile) => {
			return codeFile.path !== this.toBeMergedFile.path;
		});
		return allOtherCodeFiles;
	}

	getItemText(codeFile: TFile): string {
		return codeFileDisplay(this.plugin, codeFile);
	}
	async onChooseItem(toMergeInFile: TFile) {
		const plugin = this.plugin;

		// Determine non-frontmatter content of merged file manually, so that the
		// heading can be inserted into it
		const heading = `## Codes from "${this.toBeMergedFile.basename}"`;
		const toBeMergedFileContents = await this.app.vault.cachedRead(this.toBeMergedFile);
		const { contentStart } = getFrontMatterInfo(toBeMergedFileContents);
		const toBeMergedWithoutFrontMatter = toBeMergedFileContents.slice(contentStart).trim();
		const newFileContent = [heading, toBeMergedWithoutFrontMatter].join("\n");

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await this.app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, newFileContent, false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 4000);
	}
}

export function mergeCodeFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("You must be in the Code File for this.", 3000);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	new SuggesterForCodeMerging(plugin, toBeMergedFile).open();
}
