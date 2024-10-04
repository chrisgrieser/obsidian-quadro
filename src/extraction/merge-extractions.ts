import { Notice, TFile, TFolder } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import Quadro from "src/main";
import { mergeFiles } from "src/shared/file-merging";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { getExtractionFileDisplay, getExtractionsOfType } from "./extraction-utils";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	mergeKeepFile: TFile;

	constructor(plugin: Quadro, mergeKeepFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge into "${mergeKeepFile.basename}":`);
		this.mergeKeepFile = mergeKeepFile;
	}

	getItems(): TFile[] {
		const extractionType = this.mergeKeepFile.parent as TFolder;
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
		incrementProgress(plugin, "extraction", "merge");
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
