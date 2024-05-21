import { Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import {
	insertReferenceToDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-ref-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	ambiguousSelection,
	getActiveEditor,
	selHasHighlightMarkup,
	typeOfFile,
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
		this.setInstructions([
			...this.hotkeyInstructions,
			{ command: "shift ⏎", purpose: "Create new code" },
		]);

		this.scope.register(["Shift"], "Enter", (event: KeyboardEvent): void => {
			// INFO more specific actions like using the selection can be done via
			// the undocumented `this.chooser`
			if (event.isComposing) return;
			event.preventDefault();
			this.close();
			this.onChooseItem("new-code-file");
		});
	}

	// code-files, sorted by last use (which is relevant when query is empty)
	getItems(): CodeAssignItem[] {
		const allCodeFiles = getAllCodeFiles(this.plugin);
		const allNotAlreadyAssigned = allCodeFiles.filter(
			(codeFile) => !this.codesInPara.find((code) => code.path === codeFile.path),
		);

		return [...allNotAlreadyAssigned, "new-code-file"];
	}

	getItemText(item: CodeAssignItem): string {
		if (item === "new-code-file") return "🞜 Create new code";
		return codeFileDisplay(this.plugin, item);
	}

	onChooseItem(codeFile: CodeAssignItem): void {
		if (codeFile === "new-code-file") {
			createOneCodeFile(this.plugin, (codeFile) => this.assignCode(codeFile, this.dataFile));
		} else {
			this.assignCode(codeFile, this.dataFile);
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** DATAFILE: Add blockID & link to Code-File in the current line
	 * CODEFILE: Append embedded blocklink to Data-File */
	async assignCode(codeFile: TFile, dataFile: TFile): Promise<void> {
		const editor = this.editor;
		const fullCode = getFullCode(this.plugin, codeFile);

		// DATAFILE Changes
		const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);
		insertReferenceToDatafile(editor, codeFile, fullCode, lineWithoutId, blockId);

		// CODEFILE Changes
		const textToAppend = `![[${dataFile.path.slice(0, -3)}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function assignCodeCommand(plugin: Quadro): void {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor || ambiguousSelection(editor)) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to assign a code.", 4000);
		return;
	}
	const hasHighlightMarkupInSel = selHasHighlightMarkup(editor);
	if (hasHighlightMarkupInSel) return;

	// Determine codes already assigned to paragraph, so they can be excluded
	// from the list of codes in the Suggester
	const dataFile = editor.editorComponent.view.file;
	const paragraphText = editor.getLine(editor.getCursor().line);
	const codesFilesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText).map(
		(code) => code.tFile,
	);

	new SuggesterForCodeAssignment(plugin, editor, codesFilesInPara, dataFile).open();
}
