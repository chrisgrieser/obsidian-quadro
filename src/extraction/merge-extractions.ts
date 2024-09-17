import { Notice, TFile, TFolder } from "obsidian";
import Quadro from "src/main";
import { mergeFiles } from "src/shared/file-merging";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { getExtractionFileDisplay, getExtractionsOfType } from "./extraction-utils";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;

	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge into "${toBeMergedFile.basename}":`);
		this.toBeMergedFile = toBeMergedFile;
	}

	getItems(): TFile[] {
		const extractionType = this.toBeMergedFile.parent as TFolder;
		const extractionsOfSameType = getExtractionsOfType(this.plugin, extractionType)
			.filter((extrFile) => extrFile.path !== this.toBeMergedFile.path)
			.sort((a, b) => b.stat.mtime - a.stat.mtime);
		if (extractionsOfSameType.length === 0) {
			new Notice("No other extractions have been created yet.", 4000);
			this.close();
		}
		return extractionsOfSameType;
	}

	getItemText(extractionFile: TFile): string {
		return getExtractionFileDisplay(this.plugin, extractionFile);
	}

	async onChooseItem(toMergeInFile: TFile) {
		const backupDir = this.toBeMergedFile.parent?.path || "";
		await mergeFiles(this.plugin, this.toBeMergedFile, toMergeInFile, backupDir, false);
	}
}

export function mergeExtractionFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Extraction File") {
		new Notice("You must be in an Extraction File for this.", 4000);
		return;
	}
	const toBeMergedFile = editor.editorComponent.view.file;
	if (!toBeMergedFile) {
		new Notice("No file open.", 4000);
		return;
	}

	new SuggesterForExtractionMerging(plugin, toBeMergedFile).open();
}
