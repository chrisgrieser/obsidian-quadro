import { App, Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { BLOCKID_REGEX, EMBEDDED_BLOCKLINK_REGEX } from "src/shared/block-id";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	WIKILINK_REGEX,
	ambiguousSelection,
	currentlyInFolder,
	getActiveEditor,
} from "src/shared/utils";
import { removeSingleFileRefFromDatafile } from "../shared/remove-fileref-from-datafile";
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

async function unassignCodeWhileInDataFile(editor: Editor, dataFile: TFile, code: Code) {
	const app = editor.editorComponent.app;
	const ln = editor.getCursor().line;
	const lineText = editor.getLine(ln);

	// remove link from DATAFILE
	const updatedLine = lineText.replace(code.wikilink, "");
	editor.setLine(ln, updatedLine);

	// find corresponding line in CODEFILE
	const [blockId] = lineText.match(BLOCKID_REGEX) || [];
	if (!blockId) {
		new Notice("No ID found in current line.\nReference in Code File thus not deleted.");
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
			`"Code File "${code.tFile.basename}" contains not reference to ` +
				`Data File "${dataFile.basename}" with the ID "${blockId}". ` +
				"Reference in Code File is thus not deleted.",
			7000,
		);
		return;
	}

	// remove corresponding line in CODEFILE
	codeFileLines.splice(refInCodeFile, 1);
	await app.vault.modify(code.tFile, codeFileLines.join("\n"));
	new Notice(`Assignment of code "${code.tFile.basename}" removed.`);
}

async function unassignCodeWhileInCodeFile(app: App, editor: Editor): Promise<void> {
	const lineText = editor.getLine(editor.getCursor().line);

	// Remove from DATAFILE
	const [_, linkPath, blockId] = lineText.match(EMBEDDED_BLOCKLINK_REGEX) || [];
	const codeFile = editor.editorComponent.view.file;
	const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath || "", codeFile.path);
	if (!blockId || !linkPath || !dataFile) {
		new Notice("Current line has no correct reference.");
		return;
	}

	const errorMsg = await removeSingleFileRefFromDatafile(app, codeFile, dataFile, blockId);
	if (errorMsg) {
		new Notice(errorMsg + "\n\nAborting removal of Code.", 4000);
		return;
	}

	// Remove from CODEFILE
	app.commands.executeCommandById("editor:delete-paragraph");
	editor.setCursor({ line: editor.getCursor().line, ch: 0 }); // moving to BoL prevents EditorSuggester from opening

	new Notice(`Assignment of code "${codeFile.basename}" removed.`);
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * A. code file -> determine datafile and code to remove from code file reference
 * B. data file, line has 1 code -> remove code, and its reference from code file
 * C. data file, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export function unassignCodeCommand(plugin: Quadro): void {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;

	if (currentlyInFolder(plugin, "Codes")) {
		// A: in code file
		unassignCodeWhileInCodeFile(app, editor);
	} else {
		const dataFile = editor.editorComponent.view.file;
		const paragraphText = editor.getLine(editor.getCursor().line);
		const codesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText);

		if (codesInPara.length === 0) {
			new Notice("Line does not contain any codes to remove.");
		} else if (codesInPara.length === 1) {
			// B: in data file, line has 1 code
			unassignCodeWhileInDataFile(editor, dataFile, codesInPara[0] as Code);
		} else {
			// C: in data file, line has 2+ codes
			new SuggesterForCodeToUnassign(plugin, editor, dataFile, codesInPara).open();
		}
	}
}
