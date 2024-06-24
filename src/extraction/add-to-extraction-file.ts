import { Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import {
	insertReferenceToDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-ref-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	ambiguousSelection,
	getActiveEditor,
	selHasHighlightMarkup,
	typeOfFile,
} from "src/shared/utils";
import { getExtractionFileDisplay } from "./extraction-utils";

class SuggesterForExtractionAdding extends ExtendedFuzzySuggester<TFile> {
	editor: Editor;

	constructor(plugin: Quadro, editor: Editor) {
		super(plugin);
		this.setPlaceholder("Select Extraction File add the paragraph to:");
		this.editor = editor;
	}

	getItems(): TFile[] {
		const extractionFolder = this.settings.extraction.folder;
		const allExtractionFiles = this.app.vault
			.getMarkdownFiles()
			.filter((f) => f.name !== "Template.md" && f.path.startsWith(extractionFolder + "/"));
		if (allExtractionFiles.length === 0) {
			new Notice("No extractions have been created yet.", 3000);
			this.close();
		}
		return allExtractionFiles;
	}

	getItemText(extractionFile: TFile): string {
		return getExtractionFileDisplay(this.plugin, extractionFile);
	}

	async onChooseItem(extractionFile: TFile) {
		const { app, editor } = this;

		// DATAFILE: Insert new reference
		const dataFile = editor.editorComponent.view.file;
		const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);

		// GUARD
		const lineAlreadyHasExtraction = editor
			.getLine(editor.getCursor().line)
			.includes(`[[${extractionFile.basename}]]`);
		if (lineAlreadyHasExtraction) {
			new Notice(`The paragraph already references "${extractionFile.basename}". Aborting.`, 0);
			return;
		}

		// Insert Reference to last EXTRACTION FILE
		const exFileLines = (await app.vault.read(extractionFile)).trim().split("\n");
		const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`

		const sourcePropertyLn =
			1 + exFileLines.findIndex((line) => line.startsWith("extraction-source:"));
		if (sourcePropertyLn === 0) {
			const msg = `Could not find "extraction-source:" property in the "${extractionFile.basename}". Aborting.`;
			new Notice(msg, 0);
			return;
		}
		const nextPropertyLnum =
			sourcePropertyLn +
			exFileLines
				.slice(sourcePropertyLn) // search after line starting with "extraction-source:"
				.findIndex((line) => !line.startsWith("  - "));

		exFileLines.splice(nextPropertyLnum, 0, `  - "[[${fullSource}]]"`);
		exFileLines.push(`![[${fullSource}]]`);
		exFileLines.push(""); // blank line at end

		// UPDATE BOTH FILES
		await app.vault.modify(extractionFile, exFileLines.join("\n"));
		insertReferenceToDatafile(
			editor,
			extractionFile,
			extractionFile.basename,
			lineWithoutId,
			blockId,
		);
	}
}

export function addToExistingExtractionFileCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor || ambiguousSelection(editor) || selHasHighlightMarkup(editor)) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to make an extraction.", 4000);
		return;
	}

	new SuggesterForExtractionAdding(plugin, editor).open();
}
