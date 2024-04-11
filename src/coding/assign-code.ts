import { App, Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { ensureBlockId } from "src/shared/block-id";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	ambiguousSelection,
	currentlyInFolder,
	ensureWikilinksSetting,
	getActiveEditor,
} from "../shared/utils";
import {
	codeFileDisplay,
	getAllCodeFiles,
	getCodesFilesInParagraphOfDatafile,
	getFullCode,
} from "./coding-utils";
import { createOneCodeFile } from "./create-new-code-file";

type CodeAssignItem = TFile | "new-code-file";

class SuggesterForCodeAssignment extends ExtendedFuzzySuggester<CodeAssignItem> {
	editor: Editor;
	codesInPara: TFile[];
	dataFile: TFile;

	constructor(plugin: Quadro, editor: Editor, codesInPara: TFile[], dataFile: TFile) {
		super(plugin);
		this.editor = editor;
		this.codesInPara = codesInPara;
		this.dataFile = dataFile;

		this.setPlaceholder("Select code to assign");
		// creates second row of instructions for better visibility
		this.setInstructions([{ command: "shift ⏎", purpose: "Create new code" }]);

		this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent): void => {
			// INFO more specific actions like using the selection can be done via
			// the undocumented `this.chooser`
			if (evt.isComposing) return;
			this.close(); // before `onChooseItem`, otherwise results in some weird race conditions
			this.onChooseItem("new-code-file");
		});
	}

	// code-files, sorted by last use (which is relevant when query is empty)
	getItems(): CodeAssignItem[] {
		const allNotAlreadyAssigned = getAllCodeFiles(this.plugin).filter((codeFile) => {
			const isAlreadyAssigned = this.codesInPara.find((code) => code.path === codeFile.path);
			return !isAlreadyAssigned;
		});

		const items: CodeAssignItem[] = allNotAlreadyAssigned;
		items.push("new-code-file");

		return items;
	}

	getItemText(item: CodeAssignItem): string {
		if (item === "new-code-file") return "🞜 Create new code";
		return codeFileDisplay(this.plugin, item);
	}

	onChooseItem(codeFile: CodeAssignItem): void {
		if (codeFile === "new-code-file") {
			createOneCodeFile(this.plugin, (codeFile) =>
				this.assignCode(this.app, codeFile, this.dataFile),
			);
		} else {
			this.assignCode(this.app, codeFile, this.dataFile);
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** DATAFILE: Add blockID & link to Code-File in the current line
	 * CODEFILE: Append embedded blocklink to Data-File */
	async assignCode(app: App, codeFile: TFile, dataFile: TFile): Promise<void> {
		const cursor = this.editor.getCursor();
		const fullCode = getFullCode(this.plugin, codeFile);

		// DATAFILE Changes
		// add highlight if selection
		let lineText = this.editor.getLine(cursor.line);

		const selection = this.editor.getSelection();
		if (selection) {
			// spaces need to be moved outside, otherwise they make the highlights invalid
			const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
			this.editor.replaceSelection(highlightAdded);
			lineText = this.editor.getLine(cursor.line);
		}
		const { blockId, lineWithoutId } = ensureBlockId(lineText);

		ensureWikilinksSetting(app);
		const linkToCodeFile = app.fileManager.generateMarkdownLink(
			codeFile,
			dataFile.path,
			"",
			fullCode,
		);
		const updatedLine = `${lineWithoutId} ${linkToCodeFile} ${blockId}`;
		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// CODEFILE Changes
		const dataFileFullPath = dataFile.path.slice(0, -3);
		const textToAppend = `![[${dataFileFullPath}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function assignCodeCommand(plugin: Quadro): void {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;

	if (currentlyInFolder(plugin, "Codes") || currentlyInFolder(plugin, "Extractions")) {
		new Notice("You must be in a Data File to assign a code.", 3000);
		return;
	}

	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.");
		return;
	}

	// Determine codes already assigned to paragraph, so they can be excluded
	// from the list of codes in the Suggester
	const dataFile = editor.editorComponent.view.file;
	const paragraphText = editor.getLine(editor.getCursor().line);
	const codesFilesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText).map(
		(code) => code.tFile,
	);

	new SuggesterForCodeAssignment(plugin, editor, codesFilesInPara, dataFile).open();
}
