import { type Editor, Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import type Quadro from "src/main";
import { BLOCKID_REGEX } from "src/shared/add-blockid-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile, WIKILINK_REGEX } from "src/shared/utils";
import { type Code, codeFileDisplay, getCodesFilesInParagraphOfDatafile } from "./coding-utils";

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
		unassignCodeWhileInDataFile(this.plugin, this.editor, this.dataFile, code);
	}
}

//──────────────────────────────────────────────────────────────────────────────

async function unassignCodeWhileInDataFile(
	plugin: Quadro,
	editor: Editor,
	dataFile: TFile,
	code: Code,
): Promise<void> {
	const app = plugin.app;
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);

	// GUARD no blockid
	const [blockId] = lineText.match(BLOCKID_REGEX) || [];
	if (!blockId) {
		new Notice("Cannot unassign code: No id found at current line.", 0);
		return;
	}

	// 1. remove link from DATAFILE
	const updatedLine = lineText.replace(code.wikilink, "");
	editor.setLine(cursor.line, updatedLine);
	cursor.ch = Math.min(updatedLine.length - 1, cursor.ch);
	editor.setCursor(cursor); // restore cursor position

	// 2. remove link from CODEFILE
	app.vault.process(code.tFile, (content) => {
		// search for reference line in Codefile
		const codeFileLines = content.split("\n");
		const refInCodeFile = codeFileLines.findIndex((line) => {
			if (!line.includes(blockId)) return false;
			const linksInLine = line.match(new RegExp(WIKILINK_REGEX, "g")) || [];
			for (const wikilink of linksInLine) {
				const [_, innerlink] = wikilink.match(WIKILINK_REGEX) || [];
				if (!innerlink) continue;
				const linkedFile = app.metadataCache.getFirstLinkpathDest(innerlink, code.tFile.path);
				if (linkedFile?.path === dataFile.path) return true;
			}
			return false;
		});

		// GUARD
		if (refInCodeFile < 0) {
			const msg =
				`"Code File "${code.tFile.basename}" contains no reference to ` +
				`Data File "${dataFile.basename}" with the ID "${blockId}". ` +
				"Reference in Code File is thus not deleted.";
			new Notice(msg, 0);
			return content; // unmodified
		}

		// remove reference line from CODEFILE
		codeFileLines.splice(refInCodeFile, 1);
		content = codeFileLines.join("\n");
		new Notice(`Assignment of code "${code.tFile.basename}" removed.`, 3500);
		incrementProgress(plugin, "Code File", "unassign");

		return content;
	});
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

	// GUARD
	if (!editor) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to unassign a code.", 4000);
		return;
	}
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
		unassignCodeWhileInDataFile(plugin, editor, dataFile, codesInPara[0] as Code);
	} else {
		new SuggesterForCodeToUnassign(plugin, editor, dataFile, codesInPara).open();
	}
}
