import { Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { BLOCKID_REGEX } from "src/shared/add-ref-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
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

	// GUARD no blockid
	const [blockId] = lineText.match(BLOCKID_REGEX) || [];
	if (!blockId) {
		new Notice("No ID found in current line.\nReference in Code File thus not deleted.", 0);
		return;
	}

	// CODEFILE
	app.vault.process(code.tFile, (content) => {
		// search for reference line in Codefile
		const codeFileLines = content.split("\n");
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: later
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
	if (!editor || ambiguousSelection(editor)) return;

	// GUARD
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
		unassignCodeWhileInDataFile(editor, dataFile, codesInPara[0] as Code);
	} else {
		new SuggesterForCodeToUnassign(plugin, editor, dataFile, codesInPara).open();
	}
}
