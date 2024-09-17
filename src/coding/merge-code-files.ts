import { Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { mergeFiles } from "src/shared/file-merging";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { codeFileDisplay, getAllCodeFiles } from "./coding-utils";

class SuggesterForCodeMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;

	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Code File to merge "${toBeMergedFile.basename}" into`);
		this.toBeMergedFile = toBeMergedFile;
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
		const backupDir = this.plugin.settings.coding.folder;
		await mergeFiles(this.plugin, this.toBeMergedFile, toMergeInFile, backupDir);
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
