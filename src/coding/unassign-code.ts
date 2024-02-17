import { App, Editor, FuzzySuggestModal, Notice, TFile } from "obsidian";
import { CODE_FOLDER_NAME } from "src/settings";
import { updateStatusbar } from "src/statusbar";
import {
	SUGGESTER_INSTRUCTIONS,
	currentlyInFolder,
	getFullCode,
	safelyGetActiveEditor,
} from "src/utils";

interface Code {
	tFile: TFile;
	wikilink: string;
}

interface DataFileReference {
	file: TFile;
	blockId: string;
}

// group 1: linkpath, group 2: blockID
const embeddedBlockLinkRegex = /^!\[\[(.+?)#(\^[\w-]+)\]\]$/;

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
		this.setInstructions(SUGGESTER_INSTRUCTIONS);
		this.modalEl.addClass("quadro");
	}

	getItems(): Code[] {
		return this.codesInParagraph;
	}
	getItemText(code: Code): string {
		return getFullCode(code.tFile);
	}
	onChooseItem(code: Code): void {
		unassignCodeWhileInDataFile(this.editor, this.dataFile, code);
	}
}

async function unassignCodeWhileInDataFile(editor: Editor, dataFile: TFile, code: Code) {
	const app = editor.editorComponent.app;
	const ln = editor.getCursor().line;
	const lineText = editor.getLine(ln);

	// remove link from DATAFILE
	// needs to use wikilink instead of basename or the fullCode, since renaming
	// operations could have changed what the link actually looks like
	const regex = new RegExp(" ?\\[\\[" + code.wikilink + "\\]\\]");
	editor.setLine(ln, lineText.replace(regex, ""));

	// find corresponding line in CODEFILE
	const [blockId] = lineText.match(/\^\w+$/) || [];
	if (!blockId) {
		new Notice("No ID found in current line.\nReference in Code File thus not deleted.");
		return;
	}
	const codeFileLines = (await app.vault.read(code.tFile)).split("\n");
	const refInCodeFile = codeFileLines.findIndex((line) => {
		if (!line.includes(blockId)) return false;
		const linksInLine = line.match(/\[\[.+?\]\]/g) || [];
		for (const link of linksInLine) {
			const linkPath = link.slice(2, -2).split("#")[0] || "";
			const linkedFile = app.metadataCache.getFirstLinkpathDest(linkPath, code.tFile.path);
			if (linkedFile?.path === dataFile.path) return true;
		}
		return false;
	});

	if (refInCodeFile < 0) {
		new Notice(
			`"Code File "${code.tFile.basename}" contains not reference to ` +
				`to Data File "${dataFile.basename}" with the ID "${blockId}".` +
				"Reference in Code File is thus not deleted.",
			7000,
		);
		return;
	}
	codeFileLines.splice(refInCodeFile, 1);

	// remove corresponding line in CODEFILE
	await app.vault.modify(code.tFile, codeFileLines.join("\n"));

	updateStatusbar(app);
}

/** returns an error msg; returns empty string if no error */
async function removeCodeFileRefInDataFile(
	app: App,
	codeFile: TFile,
	dataFile: TFile,
	blockId: string,
): Promise<string | ""> {
	// retrieve referenced line in DATAFILE
	const dataFileLines = (await app.vault.read(dataFile)).split("\n");
	const lnumInDataFile = dataFileLines.findIndex((line) => line.endsWith(blockId));
	if (lnumInDataFile < 0)
		return `Data File ${dataFile.basename}, has no line with the ID "${blockId}".`;
	const dataFileLine = dataFileLines[lnumInDataFile] || "";

	// remove link to CODFILE from DATAFILE line
	const linksInDataFileLine = dataFileLine.match(/\[\[.+?\]\]/g) || [];
	const linkToCodeFile = linksInDataFileLine.find((link) => {
		link = link.slice(2, -2);
		const linkedTFile = app.metadataCache.getFirstLinkpathDest(link, dataFile.path);
		return linkedTFile instanceof TFile && linkedTFile.path === codeFile.path;
	});
	if (!linkToCodeFile)
		return `Data File ${dataFile.basename}, line "${blockId}" has no valid link to the Code-File.`;
	dataFileLines[lnumInDataFile] = dataFileLine.replace(linkToCodeFile, "").replace(/ {2,}/g, " ");
	await app.vault.modify(dataFile, dataFileLines.join("\n"));
	return "";
}

async function unassignCodeWhileInCodeFile(app: App, editor: Editor): Promise<void> {
	// Identify DATAFILE
	const lineText = editor.getLine(editor.getCursor().line);
	const [_, linkPath, blockId] = lineText.match(embeddedBlockLinkRegex) || [];
	const codeFile = editor.editorComponent.view.file;
	const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath || "", codeFile.path);
	if (!blockId || !linkPath || !dataFile) {
		new Notice("Current line has no correct reference.");
		return;
	}

	const errorMsg = await removeCodeFileRefInDataFile(app, codeFile, dataFile, blockId);
	if (!errorMsg) {
		new Notice(errorMsg + "\n\nAborting removal of Code.", 4000);
		return;
	}

	// CODEFILE: simply delete current line via Obsidian command :P
	app.commands.executeCommandById("editor:delete-paragraph");

	// moving to start of line prevents EditorSuggester from opening
	editor.setCursor({ line: editor.getCursor().line, ch: 0 });

	updateStatusbar(app);
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * A. code file -> determine datafile and code to remove from code file reference
 * B. data file, line has 1 code -> remove code, and its reference from code file
 * C. data file, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export async function unassignCodeCommand(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	if (currentlyInFolder(app, "Codes")) {
		// A: in code file
		unassignCodeWhileInCodeFile(app, editor);
	} else {
		const dataFile = editor.editorComponent.view.file;
		const lineText = editor.getLine(editor.getCursor().line);
		const wikilinksInParagr = lineText.match(/\[\[.+?\]\]/g) || [];

		const codesInParagr = wikilinksInParagr.reduce((acc: Code[], wikilink) => {
			wikilink = wikilink.slice(2, -2);
			const linkTarget = app.metadataCache.getFirstLinkpathDest(wikilink, dataFile.path);
			if (linkTarget instanceof TFile) {
				const isInCodeFolder = linkTarget.path.startsWith(CODE_FOLDER_NAME + "/");
				if (isInCodeFolder) acc.push({ tFile: linkTarget, wikilink: wikilink });
			}
			return acc;
		}, []);

		if (codesInParagr.length === 0) {
			new Notice("Line does not contain any valid codes.");
		} else if (codesInParagr.length === 1) {
			// B: in data file, line has 1 code
			unassignCodeWhileInDataFile(editor, dataFile, codesInParagr[0] as Code);
		} else {
			// C: in data file, line has 2+ codes
			new SuggesterForCodeToUnassign(app, editor, dataFile, codesInParagr).open();
		}
	}
}

export async function deleteCodeEverywhereCommand(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	if (!currentlyInFolder(app, "Codes")) {
		new Notice("Must be in Code File to delete the code everywhere.");
		return;
	}

	// determine all DATAFILES that are referenced in CODEFILE, and their blockID
	// (`app.metadataCache.resolvedLinks` does not contain blockIDs, so we need
	// to read and parse the file manually)
	const codeFile = editor.editorComponent.view.file;
	const allWikilinks = ((await app.vault.cachedRead(codeFile)) || "").match(/!\[\[.+?\]\]/g) || [];
	const referencedParasInDataFiles = allWikilinks.reduce((acc: DataFileReference[], link) => {
		const [_, linkPath, blockId] = link.match(embeddedBlockLinkRegex) || [];
		if (!linkPath || !blockId) return acc;
		const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath, codeFile.path);
		if (dataFile instanceof TFile) acc.push({ file: dataFile, blockId: blockId });
		return acc;
	}, []);

	// delete the reference in each DATAFILE
	const errorMsgs: string[] = [];
	for (const { file, blockId } of referencedParasInDataFiles) {
		const errorMsg = await removeCodeFileRefInDataFile(app, codeFile, file, blockId);
		if (errorMsg) errorMsgs.push(errorMsg);
	}

	// CODEFILE: can simply be deleted
	await app.vault.trash(codeFile, true);

	// REPORT
	const successes = referencedParasInDataFiles.length - errorMsgs.length;
	let msg = `Code File "${codeFile.basename}" and ${successes} references to it deleted.\n`;
	if (errorMsgs.length > 0)
		msg += `⚠️ ${errorMsgs.length} references could not be deleted:\n` + errorMsgs.join("\n");
	new Notice(msg, (5 + errorMsgs.length) * 1000);

	updateStatusbar(app);
}
