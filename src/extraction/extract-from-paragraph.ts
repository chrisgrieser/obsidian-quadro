import { Editor, Notice, TFile, TFolder, getFrontMatterInfo } from "obsidian";
import Quadro from "src/main";
import {
	insertReferenceToDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-ref-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	ambiguousSelection,
	ensureCorrectPropertyTypes,
	getActiveEditor,
	selHasHighlightMarkup,
	typeOfFile,
} from "src/shared/utils";
import {
	countExtractionsForType,
	getAllExtractionTypes,
	moveCursorToFirstProperty,
	openExtractionInNewWin,
} from "./extraction-utils";

class SuggesterForExtractionTypes extends ExtendedFuzzySuggester<TFolder> {
	extractionTypes: TFolder[];
	editor: Editor;
	dataFile: TFile;

	constructor(plugin: Quadro, editor: Editor, extractionTypes: TFolder[], dataFile: TFile) {
		super(plugin);
		this.extractionTypes = extractionTypes;
		this.editor = editor;
		this.dataFile = dataFile;

		this.setPlaceholder("Select extraction type");
	}

	getItems(): TFolder[] {
		return this.extractionTypes;
	}

	getItemText(extractionType: TFolder): string {
		const displayCount = this.plugin.settings.extraction.displayCount;
		if (!displayCount) return extractOfType.name;

		const count = countExtractionsForType(extractionType);
		return `${extractionType.name} (${count}x)`;
	}

	onChooseItem(extractionType: TFolder): void {
		extractOfType(this.plugin, this.editor, this.dataFile, extractionType);
	}
}

async function extractOfType(
	plugin: Quadro,
	editor: Editor,
	dataFile: TFile,
	extractionTypeFolder: TFolder,
): Promise<void> {
	const app = plugin.app;
	ensureCorrectPropertyTypes(app);
	const type = extractionTypeFolder.name;
	const dir = extractionTypeFolder.path;

	// VALIDATE Template
	const templateFile = app.vault.getFileByPath(`${dir}/Template.md`);
	if (!templateFile) {
		new Notice(`ERROR: Could not find "Template.md" for Extraction Type "${type}".`);
		return;
	}
	const templateContent = await app.vault.cachedRead(templateFile);
	const { exists, frontmatter: templateFrontmatter } = getFrontMatterInfo(templateContent);
	if (!exists) {
		new Notice(
			`The file "Template.md" in the folder "${dir}" does not contain valid metadata fields.` +
				"\n\nYou need to add valid fields before you can make extractions.",
			6000,
		);
		openExtractionInNewWin(plugin, templateFile);
		return;
	}

	// Determine path of EXTRACTION-FILE to be created
	let extractionPath: string;
	let extractionCount = countExtractionsForType(extractionTypeFolder);
	while (true) {
		extractionCount++;
		const countWithLeadingZeros = extractionCount.toString().padStart(3, "0");
		extractionPath = `${dir}/${type} ${countWithLeadingZeros}.md`;
		const fileExistsAlready = app.vault.getFileByPath(extractionPath);
		if (!fileExistsAlready) break;
	}

	// DATAFILE Changes
	const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);

	// insert data into TEMPLATE
	const isoDate = new Date().toISOString().slice(0, -5); // slice get Obsidian's date format
	const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`
	const newFrontmatter = [
		"---",
		...templateFrontmatter.split("\n"),
		"extraction-date: " + isoDate,
		"extraction-source:",
		`  - "[[${fullSource}]]"`,
		"---",
		"",
		"**Paragraph extracted from:**",
		`![[${fullSource}]]`,
	].join("\n");

	// Create EXTRACTION FILE
	const extractionFile = await app.vault.create(extractionPath, newFrontmatter);

	// update DATAFILE
	const label = extractionFile.basename;
	insertReferenceToDatafile(editor, extractionFile, label, lineWithoutId, blockId);

	// Open EXTRACTION-FILE
	await openExtractionInNewWin(plugin, extractionFile);
	moveCursorToFirstProperty(app, "value");
}

export function extractFromParagraphCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor || ambiguousSelection(editor)) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}
	const hasHighlightMarkupInSel = selHasHighlightMarkup(editor);
	if (hasHighlightMarkupInSel) return;

	const extractionTypes = getAllExtractionTypes(plugin);
	if (!extractionTypes) return;

	// Suggest Extraction Types, or trigger directly if only one type exists
	const dataFile = editor.editorComponent.view.file;
	if (extractionTypes.length === 1) {
		extractOfType(plugin, editor, dataFile, extractionTypes[0]);
	} else {
		new SuggesterForExtractionTypes(plugin, editor, extractionTypes, dataFile).open();
	}
}
