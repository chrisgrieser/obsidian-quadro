import { App, Editor, FuzzySuggestModal, Notice, OpenViewState, TFile, TFolder } from "obsidian";
import { ensureBlockId } from "src/coding/block-id";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { SUGGESTER_INSTRUCTIONS, currentlyInFolder, safelyGetActiveEditor } from "src/utils";

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

	onChooseItem(extractionType: TFolder): void {
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
	const templateText = await app.vault.cachedRead(templateFile);
	const templateLines = templateText.trim().split("\n");
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
	let extractionCount = extractionTypeFolder.children.length - 1; // -1 due to `Template.md`
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
	const isoDate = new Date().toISOString().slice(0, -5); // slice get Obsidian's date format
	const dateYamlLine = `extraction date: ${isoDate}`;
	const sourceYamlLine = `extraction source: "[[${dataFile.path}]]"`;
	const yamlFrontmatterEnd = templateLines.findLastIndex((l) => l === "---");
	templateLines.splice(yamlFrontmatterEnd, 0, dateYamlLine, sourceYamlLine);
	templateLines.push("", `**Paragraph extracted from:** ![[${dataFile.path}#${blockId}]]`);

	// Create EXTRACTION-FILE, and open in split to the right
	const extractionFile = await app.vault.create(extractionPath, templateLines.join("\n"));

	// use existing leaf if exists, otherwise create new one
	const currentLeaf = app.workspace.getLeaf();
	const leafToTheRight =
		app.workspace.getAdjacentLeafInDirection(currentLeaf, "right") ||
		app.workspace.createLeafBySplit(currentLeaf, "vertical", false);

	const livePreview: OpenViewState = { state: { source: false, mode: "source" } };
	await leafToTheRight.openFile(extractionFile, livePreview);

	// HACK move cursor to first property
	// SOURCE https://discord.com/channels/686053708261228577/840286264964022302/1207048530846548049
	// https://discord.com/channels/686053708261228577/840286264964022302/1207053341989929070
	const firstProperty = document.querySelector(
		".workspace-leaf.mod-active .metadata-property:first-of-type .metadata-property-value :is([contenteditable='true'], input)",
	);
	// @ts-ignore
	if (firstProperty) firstProperty.focus();
}

export async function extractFromParagraph(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	if (currentlyInFolder(app, "Codes") || currentlyInFolder(app, "Extractions")) {
		new Notice("You must be in a Data File to make an extraction.", 3000);
		return;
	}

	// Determine Extraction Types (= subfolders of EXTRACTION_FOLDER)
	let extractionTFolder = app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME);
	if (!(extractionTFolder instanceof TFolder)) app.vault.createFolder(EXTRACTION_FOLDER_NAME);
	extractionTFolder = app.vault.getAbstractFileByPath(EXTRACTION_FOLDER_NAME);
	if (!(extractionTFolder instanceof TFolder)) {
		new Notice("ERROR: Could not create extraction folder.");
		return;
	}
	const dataFile = editor.editorComponent.view.file;
	const extractionTypes = extractionTFolder.children.filter(
		(f) => f instanceof TFolder,
	) as TFolder[];

	// Suggest Extraction Types, or trigger directly if only one type exists
	if (extractionTypes.length === 0) {
		new Notice(
			`The folder "${EXTRACTION_FOLDER_NAME}" does not contain any subfolders (Extraction Types).\n` +
				"You need to create at least one subfolder before you can make an extraction.",
			6000,
		);
	} else if (extractionTypes.length === 1 && extractionTypes[0]) {
		extractOfType(editor, dataFile, extractionTypes[0]);
	} else {
		new SuggesterForExtractionTypes(app, editor, extractionTypes, dataFile).open();
	}
}
