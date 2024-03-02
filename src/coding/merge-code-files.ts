import { Notice, TFile, getFrontMatterInfo } from "obsidian";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { ambiguousSelection, currentlyInFolder, getActiveEditor } from "src/shared/utils";
import { codeFileDisplay, getAllCodeFiles, isCodeTemplateFile } from "./coding-utils";
import { setupTrashWatcher } from "./delete-code-everywhere";

class SuggesterForCodeMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.toBeMergedFile = toBeMergedFile;
		this.setPlaceholder(`Select Code File to merge "${toBeMergedFile.basename}" into`);
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

		// Determine content of MERGED FILE, insert heading for clarity
		const toBeMergedFileContents = await this.app.vault.cachedRead(this.toBeMergedFile);
		const { contentStart } = getFrontMatterInfo(toBeMergedFileContents);
		const toBeMergedWithoutFrontMatter = toBeMergedFileContents.slice(contentStart).trim();
		const toAppend = [
			`## Codes from "${this.toBeMergedFile.basename}"`,
			toBeMergedWithoutFrontMatter,
		].join("\n");

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await this.app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, toAppend, false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);

		new Notice(
			`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}" `,
			4000,
		);
	}
}

export async function mergeCodeFilesCommand(plugin: Quadro) {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;
	if (!currentlyInFolder(plugin, "Codes")) {
		new Notice("You must be in the Code File for this.", 3000);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	if (isCodeTemplateFile(plugin, toBeMergedFile)) {
		new Notice("You cannot merge the Template File.", 3000);
		return;
	}

	new SuggesterForCodeMerging(plugin, toBeMergedFile).open();
}
