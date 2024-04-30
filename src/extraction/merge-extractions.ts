import { Notice, TFile, TFolder } from "obsidian";
import { setupTrashWatcher } from "src/deletion-watcher";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { MERGING_INFO, getActiveEditor, typeOfFile } from "src/shared/utils";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	permaNotice: Notice;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.toBeMergedFile = toBeMergedFile;

		this.setPlaceholder(`Select Extraction File to merge "${toBeMergedFile.basename}" into.`);
		this.permaNotice = new Notice(MERGING_INFO, 0);
	}

	override onClose() {
		this.permaNotice.hide();
	}

	override onNoSuggestion() {
		new Notice("There must be at least two extractions of the same type to merge.", 4000);
		this.close();
	}

	getItems(): TFile[] {
		const extractionType = this.toBeMergedFile.parent as TFolder;
		const extractionsOfSameType = (
			extractionType.children.filter(
				(ch) =>
					ch instanceof TFile &&
					ch.extension === "md" &&
					ch.name !== "Template.md" &&
					ch.path !== this.toBeMergedFile.path,
			) as TFile[]
		).sort((a, b) => b.stat.mtime - a.stat.mtime);
		return extractionsOfSameType;
	}

	getItemText(extractionFile: TFile): string {
		// TODO better display of extraction information here?
		return extractionFile.basename;
	}
	async onChooseItem(toMergeInFile: TFile) {
		const { plugin, app } = this;

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, "", false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);
		const mergedFile = toMergeInFile;

		// cleanup merged file
		const newFileContent = (await app.vault.read(mergedFile))
			.replaceAll("**Paragraph extracted from:**\n", "")
			.replaceAll("\n\n\n", "\n");
		// timeout needed, so embeds are loaded (and there is no `await` for that)
		setTimeout(async () => await app.vault.modify(mergedFile, newFileContent), 200);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 4000);
	}
}

export function mergeExtractionFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Extraction File") {
		new Notice("You must be in the Extraction File for this.", 3000);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	new SuggesterForExtractionMerging(plugin, toBeMergedFile).open();
}
