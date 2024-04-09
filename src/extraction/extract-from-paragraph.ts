import { Editor, Notice, TFile, TFolder, getFrontMatterInfo } from "obsidian";
import Quadro from "src/main";
import { ensureBlockId } from "src/shared/block-id";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	ambiguousSelection,
	currentlyInFolder,
	ensureCorrectPropertyTypes,
	ensureWikilinksSetting,
	getActiveEditor,
	moveCursorToFirstProperty,
	openFileInSplitToRight,
} from "src/shared/utils";
import {
	bootstrapExtractionTemplate,
	bootstrapExtractionTypeFolder,
} from "./bootstrap-extraction-files";
import { countExtractionsForType } from "./extraction-utils";

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
		const settings = this.plugin.settings;
		const templateFile = extractionType.children.find(
			(f) => f instanceof TFile && f.name === "Template.md",
		);
		const extractionsCount = countExtractionsForType(extractionType);
		const appendix = templateFile
			? settings.extraction.countForExtractionType.enabled
				? ` (${extractionsCount})`
				: ""
			: '  [Select to create "Template.md"]';
		return extractionType.name + appendix;
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

	// if TEMPLATE is missing, create one instead of performing an extraction
	const templateFile = app.vault.getFileByPath(`${dir}/Template.md`);
	if (!templateFile) {
		bootstrapExtractionTemplate(plugin, type);
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
	let extractionCount = countExtractionsForType(extractionTypeFolder);
	while (true) {
		extractionCount++;
		extractionPath = `${dir}/${type} ${extractionCount}.md`;
		const fileExistsAlready = app.vault.getFileByPath(extractionPath);
		if (!fileExistsAlready) break;
	}

	// Determine DATAFILE info
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);
	const { blockId, lineWithoutId } = ensureBlockId(lineText);

	// insert data into TEMPLATE
	const isoDate = new Date().toISOString().slice(0, -5); // slice get Obsidian's date format
	const dateYamlLine = `extraction date: ${isoDate}`;
	const fullSource = `${dataFile.path.slice(0, -3)}#${blockId}`; // slice to rm `.md`
	const sourceYamlLine = `extraction source: "[[${fullSource}]]"`;
	const newFrontmatter = [
		"---",
		...templateFrontmatter.split("\n"),
		dateYamlLine,
		sourceYamlLine,
		"---",
		"",
		`**Paragraph extracted from:** ![[${fullSource}]]`,
	].join("\n");

	// Create EXTRACTION FILE
	const extractionFile = await app.vault.create(extractionPath, newFrontmatter);

	// update DATAFILE
	ensureWikilinksSetting(app);
	const linkToExtractionFile = app.fileManager.generateMarkdownLink(
		extractionFile,
		extractionFile.path,
		"",
		extractionFile.basename,
	);
	const updatedLine = `${lineWithoutId} ${linkToExtractionFile} ${blockId}`;
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

	// Open EXTRACTION-FILE
	await openFileInSplitToRight(app, extractionFile);
	moveCursorToFirstProperty(app, "value");
}

export async function extractFromParagraphCommand(plugin: Quadro): Promise<void> {
	const { app, settings } = plugin;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;

	if (currentlyInFolder(plugin, "Codes") || currentlyInFolder(plugin, "Extractions")) {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}

	// bootstrap extraction folder, if needed
	let extractionTFolder = app.vault.getFolderByPath(settings.extraction.folder);
	if (!extractionTFolder)
		extractionTFolder = await app.vault.createFolder(settings.extraction.folder);
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
		bootstrapExtractionTypeFolder(plugin);
	} else if (extractionTypes.length === 1) {
		extractOfType(plugin, editor, dataFile, extractionTypes[0]);
	} else {
		new SuggesterForExtractionTypes(plugin, editor, extractionTypes, dataFile).open();
	}
}
