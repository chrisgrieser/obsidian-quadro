import { Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import type Quadro from "src/main";
import { mergeFiles } from "src/shared/file-merging";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";
import { codeFileDisplay, getAllCodeFiles } from "./coding-utils";

class SuggesterForCodeMerging extends ExtendedFuzzySuggester<TFile> {
	mergeKeepFile: TFile;

	constructor(plugin: Quadro, mergeKeepFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Code File to merge into "${mergeKeepFile.basename}":`);
		this.mergeKeepFile = mergeKeepFile;
	}

	getItems(): TFile[] {
		const allOtherCodeFiles = getAllCodeFiles(this.plugin).filter(
			(codeFile) => codeFile.path !== this.mergeKeepFile.path,
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
	async onChooseItem(mergeAwayFile: TFile): Promise<void> {
		const { plugin, mergeKeepFile } = this;
		const backupDir = plugin.settings.coding.folder;
		await mergeFiles(plugin, mergeKeepFile, mergeAwayFile, backupDir, "Code File");
		incrementProgress(plugin, "Code File", "merge");
	}
}

export function mergeCodeFilesCommand(plugin: Quadro): void {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("You must be in a Code File for this.", 3500);
		return;
	}
	const mergeKeepFile = editor.editorComponent.view.file;
	if (!mergeKeepFile) {
		new Notice("No file open.", 4000);
		return;
	}

	new SuggesterForCodeMerging(plugin, mergeKeepFile).open();
}
