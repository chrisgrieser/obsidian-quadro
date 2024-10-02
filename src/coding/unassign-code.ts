import { App, Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { BLOCKID_REGEX, EMBEDDED_BLOCKLINK_REGEX } from "src/shared/add-ref-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { removeSingleFileRefFromDatafile } from "src/shared/remove-file-from-datafile";
import { WIKILINK_REGEX, ambiguousSelection, getActiveEditor, typeOfFile } from "src/shared/utils";
import { Code, codeFileDisplay, getCodesFilesInParagraphOfDatafile } from "./coding-utils";

//──────────────────────────────────────────────────────────────────────────────

/** suggester used when more than one code is assigned to the paragraph */
class SuggesterForCodeToUnassign extends ExtendedFuzzySuggester<Code> {
	codesInParagraph: Code[];
	dataFile: TFile;
	editor: Editor;

	constructor(plugin: Quadro, editor: Editor, dataFile: TFile, codes: Code[]) {
		super(plugin);
		this.codesInParagraph = codes;
		this.dataFile = dataFile;
		this.editor = editor;
		this.plugin = plugin;

		this.setPlaceholder("Select code to remove from paragraph");
	}

	getItems(): Code[] {
		return this.codesInParagraph;
	}
	getItemText(code: Code): string {
		return codeFileDisplay(this.plugin, code.tFile);
	}
	onChooseItem(code: Code): void {
		unassignCodeWhileInDataFile(this.editor, this.dataFile, code);
	}
}

//──────────────────────────────────────────────────────────────────────────────

async function unassignCodeWhileInDataFile(
	editor: Editor,
	dataFile: TFile,
	code: Code,
): Promise<void> {
	const app = editor.editorComponent.app;
	const ln = editor.getCursor().line;
	const lineText = editor.getLine(ln);

	// remove link from DATAFILE
	const updatedLine = lineText.replace(code.wikilink, "");
	editor.setLine(ln, updatedLine);

	// find corresponding line in CODEFILE
	const [blockId] = lineText.match(BLOCKID_REGEX) || [];
	if (!blockId) {
		new Notice("No ID found in current line.\nReference in Code File thus not deleted.", 0);
		return;
	}
	const codeFileLines = (await app.vault.read(code.tFile)).split("\n");
	const refInCodeFile = codeFileLines.findIndex((line) => {
		if (!line.includes(blockId)) return false;
		const linksInLine = line.match(new RegExp(WIKILINK_REGEX, "g")) || [];
		for (const wikilink of linksInLine) {
			const [_, innerWikilink] = wikilink.match(WIKILINK_REGEX) || [];
			if (!innerWikilink) continue;
			const linkedFile = app.metadataCache.getFirstLinkpathDest(innerWikilink, code.tFile.path);
			if (linkedFile?.path === dataFile.path) return true;
		}
		return false;
	});
	if (refInCodeFile < 0) {
		new Notice(
			`"Code File "${code.tFile.basename}" contains no reference to ` +
				`Data File "${dataFile.basename}" with the ID "${blockId}". ` +
				"Reference in Code File is thus not deleted.",
			0,
		);
		return;
	}

	// remove corresponding line in CODEFILE
	codeFileLines.splice(refInCodeFile, 1);
	await app.vault.modify(code.tFile, codeFileLines.join("\n"));
	new Notice(`Assignment of code "${code.tFile.basename}" removed.`, 3500);
}

async function unassignCodeWhileInCodeFile(app: App, editor: Editor): Promise<void> {
	const lineText = editor.getLine(editor.getCursor().line);

	// Remove from DATAFILE
	const [_, linkPath, blockId] = lineText.match(EMBEDDED_BLOCKLINK_REGEX) || [];
	const codeFile = editor.editorComponent.view.file;
	if (!codeFile) {
		new Notice("No file open.", 4000);
		return;
	}
	const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath || "", codeFile.path);
	if (!blockId || !linkPath || !dataFile) {
		new Notice("Current line has no correct reference.", 0);
		return;
	}

	const errorMsg = await removeSingleFileRefFromDatafile(app, codeFile, dataFile, blockId);
	if (errorMsg) {
		new Notice(errorMsg + "\n\nAborting removal of Code.", 0);
		return;
	}

	// Remove from CODEFILE
	app.commands.executeCommandById("editor:delete-paragraph");
	editor.setCursor({ line: editor.getCursor().line, ch: 0 }); // moving to BoL prevents EditorSuggester from opening

	new Notice(`Assignment of code "${codeFile.basename}" removed.`, 3500);
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * A CODEFILE -> determine datafile and code to remove from code file reference
 * B1 DATAFILE, line has 1 code -> remove code, and its reference from code file
 * B2 DATAFILE, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export function unassignCodeCommand(plugin: Quadro): void {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;

	// A: in CODEFILE
	if (typeOfFile(plugin) === "Code File") unassignCodeWhileInCodeFile(app, editor);

	// GUARD
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File or Code File to unassign a code.", 4000);
		return;
	}

	// B: in DATAFILE
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) {
		new Notice("No file open.", 4000);
		return;
	}
	const paragraphText = editor.getLine(editor.getCursor().line);
	const codesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText);

	if (codesInPara.length === 0) {
		new Notice("Line does not contain any codes to remove.", 3500);
	} else if (codesInPara.length === 1) {
		// B1: in DATAFILE, line has 1 code
		unassignCodeWhileInDataFile(editor, dataFile, codesInPara[0] as Code);
	} else {
		// B2: in DATAFILE, line has 2+ codes
		new SuggesterForCodeToUnassign(plugin, editor, dataFile, codesInPara).open();
	}
}
