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
		this.setPlaceholder("Add paragraph to following Extraction File:");
		this.editor = editor;
	}

	getItems(): TFile[] {
		const { app, settings, plugin } = this;

		const extrFolder = settings.extraction.folder;
		const allExtractionFiles = app.vault
			.getMarkdownFiles()
			.filter(
				(f) =>
					f.path.startsWith(extrFolder + "/") && typeOfFile(plugin, f) === "Extraction File",
			)
			.sort((a, b) => b.stat.mtime - a.stat.mtime); // sort by last modified
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
		const dataFile = editor.editorComponent.view.file;
		if (!dataFile) {
			new Notice("No file open.", 4000);
			return;
		}
		const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);

		// GUARD
		const lineAlreadyHasExtraction = editor
			.getLine(editor.getCursor().line)
			.includes(`[[${extractionFile.basename}]]`);
		if (lineAlreadyHasExtraction) {
			new Notice(`The paragraph already references "${extractionFile.basename}". Aborting.`, 0);
			return;
		}

		// UPDATE EXTRACTION FILE
		const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`
		const addedRef = `[[${fullSource}]]`;
		app.fileManager.processFrontMatter(extractionFile, (frontmatter) => {
			const source = frontmatter["extraction-source"];
			frontmatter["extraction-source"] = source ? [...source, addedRef] : [addedRef];
		});
		await app.vault.append(extractionFile, `![[${fullSource}]]\n`);

		// UPDATE DATAFILE
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
