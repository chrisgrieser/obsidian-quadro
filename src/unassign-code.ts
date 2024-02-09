import { App, Editor, FuzzySuggestModal, MarkdownView, Notice, TFile } from "obsidian";
import { CODE_FOLDER_NAME } from "./settings";

interface Code {
	file: TFile;
	wikilink: string;
}

//──────────────────────────────────────────────────────────────────────────────

/** suggester used when more than one code is assigned to the paragraph */
class SuggesterForCodeToUnassign extends FuzzySuggestModal<Code> {
	codesInParagraph: Code[];
	dataFile: TFile;
	editor: Editor;

	constructor(app: App, editor: Editor, dataFile: TFile, codes: Code[]) {
		super(app);
		this.codesInParagraph = codes;
		this.dataFile = dataFile;
		this.editor = editor;
		this.setPlaceholder("Select code to remove from paragraph");
		this.setInstructions([
			{ command: "↑↓", purpose: "Navigate" },
			{ command: "⏎", purpose: "Select" },
			{ command: "esc", purpose: "Dismiss" },
		]);
	}

	getItems(): Code[] {
		return this.codesInParagraph;
	}
	getItemText(code: Code): string {
		const fullCode = code.file.path.slice(CODE_FOLDER_NAME.length + 1, -3);
		return fullCode;
	}
	onChooseItem(code: Code) {
		rmCodeWhileInDataFile(this.editor, this.dataFile, code);
	}
}

async function rmCodeWhileInDataFile(editor: Editor, dataFile: TFile, code: Code) {
	const vault = editor.editorComponent.app.vault;

	// REMOVE FROM DATAFILE
	const ln = editor.getCursor().line;
	const lineText = editor.getLine(ln);
	// needs to use wikilink instead of basename or the fullCode, since renaming
	// operations could have changed what the wikilink actually looks like
	editor.setLine(ln, lineText.replace(` [[${code.wikilink}]]`, ""));

	// REMOVE FROM CODEFILE
	const blockId = lineText.match(/\^\w+$/);
	if (!blockId) {
		new Notice("Could not find block ID in line. Reference in Code-File not deleted.");
		return;
	}
	// no leading [[ since it is not ensured that dataFile has not been moved
	const refInCodeFile = `${dataFile.basename}#${blockId[0]}]]`;
	const updatedCodeTFile = (await vault.read(code.file))
		.split("\n")
		.filter((line) => !line.endsWith(refInCodeFile))
		.join("\n");
	await vault.modify(code.file, updatedCodeTFile);
}

async function rmCodeWhileInCodeFile(app: App, editor: Editor) {
	// Identify DATAFILE
	const lineText = editor.getLine(editor.getCursor().line);
	const [_, linkPath, blockId] = lineText.match(/^!\[\[(.+?)#(\^\w+)\]\]$/) || [];
	if (!blockId || !linkPath) {
		new Notice("Current line has no correct reference.");
		return;
	}

	const codeFile = editor.editorComponent.view.file;
	const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath, codeFile.path);

	// update DATAFILE
	const dataFileLines = (await app.vault.read(dataFile)).split("\n");
	const lnumInDataFile = dataFileLines.findIndex((line) => line.endsWith(blockId));
	if (lnumInDataFile < 0) {
		new Notice(`Line with ID "${blockId}" not found in Data-File.`);
		return;
	}
	// using only basename with regex, since user may have renamed, updating
	// wikilinks in the process
	const codeFileRefRegex = new RegExp(" ?\\[\\[.*?" + codeFile.basename + "]]");
	dataFileLines[lnumInDataFile] = dataFileLines[lnumInDataFile].replace(codeFileRefRegex, "");
	await app.vault.modify(dataFile, dataFileLines.join("\n"));

	// CODEFILE: simply delete current line via Obsidian command :)
	app.commands.executeCommandById("editor:delete-paragraph");
	editor.setCursor({ line: editor.getCursor().line, ch: 0 });
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * 1. code file -> determine datafile and code to remove from code file reference
 * 2. data file, line has 1 code -> remove code, and its reference from code file
 * 3. data file, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export async function unAssignCode(app: App) {
	// GUARD
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice("No active editor.");
		return;
	}
	const editor = view.editor;
	const isInCodeFolder = app.workspace.getActiveFile()?.path.startsWith(CODE_FOLDER_NAME + "/");
	if (isInCodeFolder) {
		rmCodeWhileInCodeFile(app, editor);
		return;
	}

	const dataFile = editor.editorComponent.view.file;
	const lineText = editor.getLine(editor.getCursor().line);
	const wikilinksInParagraph = lineText.match(/\[\[.+?\]\]/g) || [];

	// determine valid codes assigned to paragraph
	const codeFilesInParagraph = wikilinksInParagraph.reduce((acc: Code[], wikilink) => {
		wikilink = wikilink.slice(2, -2);
		const codeFile = app.metadataCache.getFirstLinkpathDest(wikilink, dataFile.path);
		if (codeFile instanceof TFile) acc.push({ file: codeFile, wikilink: wikilink });
		return acc;
	}, []);

	if (codeFilesInParagraph.length === 0) {
		new Notice("Paragraph does not contain any valid codes.");
	} else if (codeFilesInParagraph.length === 1) {
		rmCodeWhileInDataFile(editor, dataFile, codeFilesInParagraph[0]);
	} else {
		new SuggesterForCodeToUnassign(app, editor, dataFile, codeFilesInParagraph).open();
	}
}
