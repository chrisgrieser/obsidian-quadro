import { Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import { getExtractionFileDisplay, getExtractionsOfType } from "src/extraction/extraction-utils";
import type Quadro from "src/main";
import { mergeFiles } from "src/shared/file-merging";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor } from "src/shared/utils";
import { typeOfFile } from "src/shared/validation";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	mergeKeepFile: TFile;

	constructor(plugin: Quadro, mergeKeepFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge into "${mergeKeepFile.basename}":`);
		this.mergeKeepFile = mergeKeepFile;
	}

	getItems(): TFile[] {
		const extractionType = this.mergeKeepFile.parent;
		if (!extractionType) {
			new Notice("No extraction type found (file to be extracted has no parent.)", 4000);
			this.close();
			return [];
		}
		const extractionsOfSameType = getExtractionsOfType(this.plugin, extractionType)
			.filter((extrFile) => extrFile.path !== this.mergeKeepFile.path)
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

	async onChooseItem(mergeAwayFile: TFile): Promise<void> {
		const { plugin, mergeKeepFile } = this;
		const backupDir = mergeKeepFile.parent?.path || "";
		await mergeFiles(plugin, mergeKeepFile, mergeAwayFile, backupDir, "Extraction File");
		incrementProgress(plugin, "Extraction File", "merge");
	}
}

export function mergeExtractionFilesCommand(plugin: Quadro): void {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Extraction File") {
		new Notice("You must be in an Extraction File for this.", 4000);
		return;
	}
	const mergeKeepFile = editor.editorComponent.view.file;
	if (!mergeKeepFile) {
		new Notice("No file open.", 4000);
		return;
	}

	new SuggesterForExtractionMerging(plugin, mergeKeepFile).open();
}
