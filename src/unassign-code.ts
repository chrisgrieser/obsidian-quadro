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
		rmCodeFromBothFiles(this.editor, this.dataFile, code);
	}
}

async function rmCodeFromBothFiles(editor: Editor, dataFile: TFile, code: Code) {
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

//──────────────────────────────────────────────────────────────────────────────

/** Determines codes assigned to paragraph, if more than one, then prompts user
 * to select one via the suggester */
export async function unAssignCode(editorOrApp: Editor | App) {
	// GUARD
	let editor: Editor;
	let app: App;
	if (editorOrApp instanceof App) {
		const view = editorOrApp.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active editor.");
			return;
		}
		editor = view.editor;
		app = editorOrApp;
	} else {
		editor = editorOrApp;
		app = editor.editorComponent.app;
	}

	const isInCodeFolder = editor.editorComponent.view.file.path.startsWith(CODE_FOLDER_NAME + "/");
	if (isInCodeFolder) {
		new Notice("You cannot remove from a code file.");
		return;
	}

	const lineText = editor.getLine(editor.getCursor().line);
	const wikilinksInParagraph = lineText.match(/\[\[.+?\]\]/g) || [];
	const dataFile = editor.editorComponent.view.file;

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
		rmCodeFromBothFiles(editor, dataFile, codeFilesInParagraph[0]);
	} else {
		new SuggesterForCodeToUnassign(app, editor, dataFile, codeFilesInParagraph).open();
	}
}
