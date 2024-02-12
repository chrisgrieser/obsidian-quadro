import { App, Editor, Notice, TFile, TFolder } from "obsidian";
import { ensureBlockId } from "src/coding/block-id";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { currentlyInFolder, safelyGetActiveEditor } from "src/utils";

//──────────────────────────────────────────────────────────────────────────────

async function extractOfType(editor: Editor, dataFile: TFile, extractionTypeFolder: TFolder) {
	const app = editor.editorComponent.app;
	const extractionType = extractionTypeFolder.name;
	const extractionDir = `${EXTRACTION_FOLDER_NAME}/${extractionType}`;

	// read & validate TEMPLATE for Extraction Type
	const templateFile = app.vault.getAbstractFileByPath(`${extractionDir}/Template.md`);
	if (!(templateFile instanceof TFile)) {
		new Notice(
			`There is no file "Template.md" in the folder "${extractionDir}".` +
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
			`The file "Template.md" in the folder "${extractionDir}" does not contain valid YAML frontmatter.` +
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
		extractionPath = `${extractionDir}/${extractionCount}.md`;
		fileExistsAlready = app.vault.getAbstractFileByPath(extractionPath) instanceof TFile;
	} while (fileExistsAlready);

	// Update DATAFILE
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);
	const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);
	const updatedLine = `${lineWithoutId} [[${extractionType}/${extractionCount}]] ${blockId}`;
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

	// insert data into TEMPLATE
	const dateYamlLine = `extraction date: ${new Date().toISOString().slice(0, -5)}`;
	const sourceYamlLine = `extraction source: ![[${dataFile.path}#${blockId}]]`;
	const yamlFrontmatterEnd = templateLines.findLastIndex((l) => l === "---");
	templateLines.splice(yamlFrontmatterEnd, 0, dateYamlLine, sourceYamlLine);
	templateLines.push("", lineText); // add a copy of the line text itself for reference

	// Create and open EXTRACTION-FILE in split to the right
	const extractionFile = await app.vault.create(extractionPath, templateLines.join("\n"));
	const currentLeaf = app.workspace.getLeaf();
	const leafToTheRight = app.workspace.createLeafBySplit(currentLeaf, "vertical", false);
	const livePreview = { source: false, mode: "source" }; // SIC it's counterintuitive, yes
	leafToTheRight.openFile(extractionFile, { state: livePreview });

	// TODO figure out how to move cursor to first property line
	// (`editor.setCursor` does not work)
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
			`The folder "${EXTRACTION_FOLDER_NAME}" is does not contain any subfolders (Extraction Types).\n` +
				"You need to create at least one subfolder before you can make an extraction.",
			6000,
		);
	} else if (extractionTypes.length === 1) {
		extractOfType(editor, dataFile, extractionTypes[0] as TFolder);
	} else {
		// TODO suggester
		new Notice(
			"Currently, only the first extraction type will be used.\n" +
				"Selection of extraction types is currently WIP",
			6000,
		);
		extractOfType(editor, dataFile, extractionTypes[0] as TFolder);
	}
}
