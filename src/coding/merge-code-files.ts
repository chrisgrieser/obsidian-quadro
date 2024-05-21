import { Notice, TFile, getFrontMatterInfo } from "obsidian";
import { setupTrashWatcher } from "src/deletion-watcher";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { codeFileDisplay, getAllCodeFiles } from "./coding-utils";

class SuggesterForCodeMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	permaNotice: Notice;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Code File to merge "${toBeMergedFile.basename}" into`);

		this.toBeMergedFile = toBeMergedFile;

		const msg = [
			"MERGING INFO",
			"- Lists properties are fully merged.",
			`- For conflicting, non-list properties, the values from "${toBeMergedFile.basename}" are take priority.`,
		].join("\n");
		this.permaNotice = new Notice(msg, 0);
	}

	override onClose() {
		this.permaNotice.hide();
	}

	override onNoSuggestion() {
		new Notice("There must be at least two Code Files to merge.", 4000);
		this.close();
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
		const { plugin, app } = this;

		// Determine non-frontmatter content of merged file manually, so that the
		// heading can be inserted into it
		const heading = `## Codes from "${this.toBeMergedFile.basename}"`;
		const toBeMergedFileContents = await app.vault.cachedRead(this.toBeMergedFile);
		const { contentStart } = getFrontMatterInfo(toBeMergedFileContents);
		const toBeMergedWithoutFrontMatter = toBeMergedFileContents.slice(contentStart).trim();
		const newFileContent = [heading, toBeMergedWithoutFrontMatter].join("\n");

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, newFileContent, false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);

		// HACK needed, so embeds are loaded (and there is no `await` for that);
		// appending empty string to force reload
		setTimeout(async () => await app.vault.append(toMergeInFile, ""), 500);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 4000);
	}
}

export function mergeCodeFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("You must be in the Code File for this.", 3500);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	new SuggesterForCodeMerging(plugin, toBeMergedFile).open();
}
