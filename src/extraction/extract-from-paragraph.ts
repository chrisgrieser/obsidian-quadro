import { App, Editor, FuzzySuggestModal, Notice, TFile, TFolder } from "obsidian";
import { ensureBlockId } from "src/coding/block-id";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { SUGGESTER_INSTRUCTIONS, currentlyInFolder, safelyGetActiveEditor } from "src/utils";

//──────────────────────────────────────────────────────────────────────────────

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
		const appendix = templateFile ? `  (${extractionsCount})` : ' ⚠️ "Template.md" missing';
		return extractionType.name + appendix;
	}

	onChooseItem(extractionType: TFolder) {
		extractOfType(this.editor, this.dataFile, extractionType);
	}
}

async function extractOfType(editor: Editor, dataFile: TFile, extractionTypeFolder: TFolder) {
	const app = editor.editorComponent.app;
	const type = extractionTypeFolder.name;
	const dir = extractionTypeFolder.path;

	// read & validate TEMPLATE for Extraction Type
	const templateFile = app.vault.getAbstractFileByPath(`${dir}/Template.md`);
	if (!(templateFile instanceof TFile)) {
		new Notice(
			`There is no file "Template.md" in the folder "${dir}".` +
				"\n\nYou need to create one before you can make extractions.",
			6000,
		);
		return;
	}
	const template = await app.vault.cachedRead(templateFile);
	const templateLines = template.trim().split("\n");
	const templateHasFrontmatter = templateLines.filter((line) => line === "---").length === 2;
	if (!templateHasFrontmatter) {
		new Notice(
			`The file "Template.md" in the folder "${dir}" does not contain valid YAML frontmatter.` +
				"\n\nYou need to add one before you can make extractions.",
			6000,
		);
		return;
	}

	// Determine path of EXTRACTION-FILE
	let fileExistsAlready: boolean;
	let extractionPath: string;
	let extractionCount = extractionTypeFolder.children.length - 1; // -1 to account for `Template.md`
	do {
		extractionCount++;
		extractionPath = `${dir}/${extractionCount}.md`;
		fileExistsAlready = app.vault.getAbstractFileByPath(extractionPath) instanceof TFile;
	} while (fileExistsAlready);

	// Update DATAFILE
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);
	const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);
	const updatedLine = `${lineWithoutId} [[${type}/${extractionCount}]] ${blockId}`;
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

	// insert data into TEMPLATE
	const dateYamlLine = `extraction date: ${new Date().toISOString().slice(0, -5)}`;
	const sourceYamlLine = `extraction source: "[[${dataFile.path}#${blockId}]]"`;
	const yamlFrontmatterEnd = templateLines.findLastIndex((l) => l === "---");
	templateLines.splice(yamlFrontmatterEnd, 0, dateYamlLine, sourceYamlLine);
	templateLines.push("", "**Paragraph extracted from**  ", lineText); 

	// Create and open EXTRACTION-FILE in split to the right
	const extractionFile = await app.vault.create(extractionPath, templateLines.join("\n"));
	const currentLeaf = app.workspace.getLeaf();
	const leafToTheRight = app.workspace.createLeafBySplit(currentLeaf, "vertical", false);
	const livePreview = { source: false, mode: "source" }; // SIC it's counterintuitive, yes
	leafToTheRight.openFile(extractionFile, { state: livePreview });

	// TODO figure out how to move cursor to 1st property (`editor.setCursor` does not work)
}

export async function extractFromParagraph(app: App) {
	// GUARD
	if (currentlyInFolder(app, "Codes") || currentlyInFolder(app, "Extractions")) {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	let extractionTFolder = app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME);
	if (!(extractionTFolder instanceof TFolder)) app.vault.createFolder(EXTRACTION_FOLDER_NAME);
	extractionTFolder = app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME);
	if (!(extractionTFolder instanceof TFolder)) {
		new Notice("ERROR: Could not create extraction folder.");
		return;
	}

	const dataFile = editor.editorComponent.view.file;
	const extractionTypes = extractionTFolder.children.filter((f) => f instanceof TFolder);
	if (extractionTypes.length === 0) {
		// TODO bootstrap extraction folders for the user?
		new Notice(
			`The folder "${EXTRACTION_FOLDER_NAME}" does not contain any subfolders (Extraction Types).\n` +
				"You need to create at least one subfolder before you can make an extraction.",
			6000,
		);
	} else if (extractionTypes.length === 1) {
		extractOfType(editor, dataFile, extractionTypes[0] as TFolder);
	} else {
		new SuggesterForExtractionTypes(app, editor, extractionTypes as TFolder[], dataFile).open();
	}
}
