import { Notice, TFile, getFrontMatterInfo } from "obsidian";
import { setupTrashWatcher } from "src/deletion-watcher";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	getActiveEditor,
	insertMergeDate,
	preMergeBackup,
	reloadLivePreview,
	typeOfFile,
} from "src/shared/utils";
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
			`- A backup of the original files will be saved in the subfolder "${plugin.backupDirName}."`,
		].join("\n");
		this.permaNotice = new Notice(msg, 0);
	}

	override onClose() {
		this.permaNotice.hide();
	}

	getItems(): TFile[] {
		const allOtherCodeFiles = getAllCodeFiles(this.plugin).filter(
			(codeFile) => codeFile.path !== this.toBeMergedFile.path,
		);
		if (allOtherCodeFiles.length === 0) {
			new Notice("No other codes have been created yet.", 4000);
			this.close();
		}
		return allOtherCodeFiles;
	}

	getItemText(codeFile: TFile): string {
		return codeFileDisplay(this.plugin, codeFile);
	}
	async onChooseItem(toMergeInFile: TFile) {
		const { plugin, app, settings } = this;

		// Determine non-frontmatter content of merged file manually, so that the
		// heading can be inserted into it
		const heading = `## Codes from "${this.toBeMergedFile.basename}"`;
		const toBeMergedFileContents = await app.vault.cachedRead(this.toBeMergedFile);
		const { contentStart } = getFrontMatterInfo(toBeMergedFileContents);
		const toBeMergedWithoutFrontMatter = toBeMergedFileContents.slice(contentStart).trim();
		const newFileContent = [heading, toBeMergedWithoutFrontMatter].join("\n");

		// MERGE (via Obsidian API)
		preMergeBackup(plugin, this.toBeMergedFile, toMergeInFile, settings.coding.folder);

		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// `toBeMergedFile`, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, newFileContent, false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);
		const mergedFile = toMergeInFile;

		const content = insertMergeDate(await app.vault.read(mergedFile));
		await app.vault.modify(mergedFile, content);
		reloadLivePreview(app);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 4000);
	}
}

export function mergeCodeFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("You must be in a Code File for this.", 3500);
		return;
	}
	const toBeMergedFile = editor.editorComponent.view.file;
	if (!toBeMergedFile) {
		new Notice("No file open.", 4000);
		return;
	}

	new SuggesterForCodeMerging(plugin, toBeMergedFile).open();
}
