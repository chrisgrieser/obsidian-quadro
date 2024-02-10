import { App, Editor, FuzzySuggestModal, Notice, TFile } from "obsidian";
import { currentlyInCodeFolder, getFullCodeName, safelyGetActiveEditor } from "./utils";

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
		return getFullCodeName(code.file);
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
	// operations could have changed what the link actually looks like
	const regex = new RegExp(" ?\\[\\[" + code.wikilink + "\\]\\]");
	editor.setLine(ln, lineText.replace(regex, ""));

	// REMOVE FROM CODEFILE
	const blockId = lineText.match(/\^\w+$/);
	if (!blockId) {
		new Notice("Could not find block ID in line. Reference in Code-File is not deleted.");
		return;
	}
	// no leading [[ since it is not ensured that dataFile has not been moved
	const refInCodeFile = `${dataFile.basename}#${blockId[0]}]]`;
	const updatedCodeFileText = (await vault.read(code.file))
		.split("\n")
		.filter((line) => !line.endsWith(refInCodeFile))
		.join("\n");
	await vault.modify(code.file, updatedCodeFileText);
}

async function rmCodeWhileInCodeFile(app: App, editor: Editor) {
	// Identify DATAFILE
	const lineText = editor.getLine(editor.getCursor().line);
	const [_, linkPath, blockId] = lineText.match(/^!\[\[(.+?)#(\^\w+)\]\]$/) || [];
	const codeFile = editor.editorComponent.view.file;
	const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath || "", codeFile.path);
	if (!blockId || !linkPath || !dataFile) {
		new Notice("Current line has no correct reference.");
		return;
	}

	// retrieve referenced Line in DATAFILE
	const dataFileLines = (await app.vault.read(dataFile)).split("\n");
	const lnumInDataFile = dataFileLines.findIndex((line) => line.endsWith(blockId));
	if (lnumInDataFile < 0) {
		new Notice(`Line with ID "${blockId}" not found in Data-File.`);
		return;
	}
	const dataFileLine = dataFileLines[lnumInDataFile] || "";

	// remove link to Code-File from DATAFILE line
	const linksInDataFileLine = dataFileLine.match(/\[\[.+?\]\]/g) || [];
	const linkToCodeFile = linksInDataFileLine.find((link) => {
		link = link.slice(2, -2);
		const linkedTFile = app.metadataCache.getFirstLinkpathDest(link, dataFile.path);
		return linkedTFile instanceof TFile && linkedTFile.path === codeFile.path;
	});
	if (!linkToCodeFile) {
		new Notice(`Line with ID "${blockId}" Data File has no valid link to Code File.`);
		return;
	}
	dataFileLines[lnumInDataFile] = dataFileLine
		.replace(linkToCodeFile, "")
		.replace(/ {2,}/g, " ");
	await app.vault.modify(dataFile, dataFileLines.join("\n"));

	// CODEFILE: simply delete current line via Obsidian command :P
	app.commands.executeCommandById("editor:delete-paragraph");
	editor.setCursor({ line: editor.getCursor().line, ch: 0 }); // prevents suggester opening
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * A. code file -> determine datafile and code to remove from code file reference
 * B. data file, line has 1 code -> remove code, and its reference from code file
 * C. data file, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export async function unAssignCode(app: App) {
	// GUARD
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	if (currentlyInCodeFolder(app)) {
		// A: in code file
		rmCodeWhileInCodeFile(app, editor);
	} else {
		const dataFile = editor.editorComponent.view.file;
		const lineText = editor.getLine(editor.getCursor().line);
		const wikilinksInParagr = lineText.match(/\[\[.+?\]\]/g) || [];

		const codesInParagr = wikilinksInParagr.reduce((acc: Code[], wikilink) => {
			wikilink = wikilink.slice(2, -2);
			const codeFile = app.metadataCache.getFirstLinkpathDest(wikilink, dataFile.path);
			if (codeFile instanceof TFile) acc.push({ file: codeFile, wikilink: wikilink });
			return acc;
		}, []);

		if (codesInParagr.length === 0) {
			new Notice("Line does not contain any valid codes.");
		} else if (codesInParagr.length === 1) {
			// B: in data file, line has 1 code
			rmCodeWhileInDataFile(editor, dataFile, codesInParagr[0] as Code);
		} else {
			// C: in data file, line has 2+ codes
			new SuggesterForCodeToUnassign(app, editor, dataFile, codesInParagr).open();
		}
	}
}
