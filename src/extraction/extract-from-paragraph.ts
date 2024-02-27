import {
	App,
	Editor,
	FuzzySuggestModal,
	Notice,
	TFile,
	TFolder,
	getFrontMatterInfo,
} from "obsidian";
import { ensureBlockId } from "src/block-id";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import {
	SUGGESTER_INSTRUCTIONS,
	ambiguousSelection,
	currentlyInFolder,
	moveCursorToFirstProperty,
	openFileInSplitToRight,
	safelyGetActiveEditor,
} from "src/utils";
import {
	bootstrapExtractionTemplate,
	bootstrapExtractionTypeFolder,
} from "./bootstrap-extraction-files";
import { ensureCorrectPropertyTypes } from "./extraction-utils";

class SuggesterForExtractionTypes extends FuzzySuggestModal<TFolder> {
	extractionTypes: TFolder[];
	editor: Editor;
	dataFile: TFile;

	constructor(app: App, editor: Editor, extractionTypes: TFolder[], dataFile: TFile) {
		super(app);
		this.extractionTypes = extractionTypes;
		this.editor = editor;
		this.dataFile = dataFile;

		this.setPlaceholder("Select extraction type");
		this.setInstructions(SUGGESTER_INSTRUCTIONS);
		this.modalEl.addClass("quadro");
	}

	getItems(): TFolder[] {
		return this.extractionTypes;
	}

	getItemText(extractionType: TFolder): string {
		const templateFile = extractionType.children.find(
			(f) => f instanceof TFile && f.name === "Template.md",
		);
		const extractionsCount = extractionType.children.length - 1; // -1 due to `Template.md`
		const appendix = templateFile
			? `  (${extractionsCount})`
			: '  [Select to create "Template.md"]';
		return extractionType.name + appendix;
	}

	onChooseItem(extractionType: TFolder): void {
		extractOfType(this.editor, this.dataFile, extractionType);
	}
}

async function extractOfType(editor: Editor, dataFile: TFile, extractionTypeFolder: TFolder) {
	const app = editor.editorComponent.app;
	ensureCorrectPropertyTypes(app);
	const type = extractionTypeFolder.name;
	const dir = extractionTypeFolder.path;

	// if TEMPLATE is missing, create one instead of performing an extraction
	const templateFile = app.vault.getFileByPath(`${dir}/Template.md`);
	if (!templateFile) {
		bootstrapExtractionTemplate(app, type);
		return;
	}
	// VALIDATE the TEMPLATE content
	const templateContent = await app.vault.cachedRead(templateFile);
	const { exists, frontmatter: templateFrontmatter } = getFrontMatterInfo(templateContent);
	if (!exists) {
		new Notice(
			`The file "Template.md" in the folder "${dir}" does not contain valid metadata fields.` +
				"\n\nYou need to add valid fields before you can make extractions.",
			6000,
		);
		openFileInSplitToRight(app, templateFile);
		return;
	}

	// Determine path of EXTRACTION-FILE to be created
	let extractionPath: string;
	let extractionCount = extractionTypeFolder.children.length - 1; // -1 due to `Template.md`
	while (true) {
		extractionCount++;
		extractionPath = `${dir}/${type} ${extractionCount}.md`;
		const fileExistsAlready = app.vault.getFileByPath(extractionPath);
		if (!fileExistsAlready) break;
	}

	// Update DATAFILE
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);
	const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);
	const updatedLine = `${lineWithoutId} [[${type} ${extractionCount}]] ${blockId}`;
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

	// insert data into TEMPLATE
	const isoDate = new Date().toISOString().slice(0, -5); // slice get Obsidian's date format
	const dateYamlLine = `extraction date: ${isoDate}`;
	const sourceYamlLine = `extraction source: "[[${dataFile.path}#${blockId}]]"`;
	const newFrontmatter = [
		"---",
		...templateFrontmatter.split("\n"),
		dateYamlLine,
		sourceYamlLine,
		"---",
		"",
		`**Paragraph extracted from:** ![[${dataFile.path}#${blockId}]]`,
	].join("\n");

	// Create EXTRACTION-FILE
	const extractionFile = await app.vault.create(extractionPath, newFrontmatter);
	await openFileInSplitToRight(app, extractionFile);
	moveCursorToFirstProperty("value");
}

export async function extractFromParagraphCommand(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;

	if (currentlyInFolder(app, "Codes") || currentlyInFolder(app, "Extractions")) {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}

	// bootstrap extraction folder, if needed
	let extractionTFolder = app.vault.getFolderByPath(EXTRACTION_FOLDER_NAME);
	if (!extractionTFolder) extractionTFolder = await app.vault.createFolder(EXTRACTION_FOLDER_NAME);
	if (!extractionTFolder) {
		new Notice("ERROR: Could not create Extraction Folder.", 4000);
		return;
	}

	// Determine Extraction Types (= subfolders of EXTRACTION_FOLDER)
	const extractionTypes = extractionTFolder.children.filter(
		(f) => f instanceof TFolder,
	) as TFolder[];

	// Suggest Extraction Types, or trigger directly if only one type exists
	const dataFile = editor.editorComponent.view.file;
	if (extractionTypes.length === 0) {
		bootstrapExtractionTypeFolder(app);
	} else if (extractionTypes.length === 1 && extractionTypes[0]) {
		extractOfType(editor, dataFile, extractionTypes[0]);
	} else {
		new SuggesterForExtractionTypes(app, editor, extractionTypes, dataFile).open();
	}
}
