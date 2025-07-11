import { type Editor, Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import {
	codeFileDisplay,
	getAllCodeFiles,
	getCodesFilesInParagraphOfDatafile,
	getFullCode,
} from "src/coding/coding-utils";
import { createOneCodeFile } from "src/coding/create-new-code-file";
import type Quadro from "src/main";
import {
	insertblockIdInDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-blockid-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor } from "src/shared/utils";
import {
	activeFileHasInvalidName,
	ambiguousSelection,
	selHasHighlightMarkup,
	typeOfFile,
} from "src/shared/validation";

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
		if (item === "new-code-file") return "⭑ Create new code";
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
		insertblockIdInDatafile(editor, codeFile, fullCode, lineWithoutId, blockId);

		// CODEFILE Changes
		const textToAppend = `![[${dataFile.path.slice(0, -3)}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
		incrementProgress(this.plugin, "Code File", "assign");
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function assignCodeCommand(plugin: Quadro): void {
	const { app } = plugin;
	const editor = getActiveEditor(app);

	// GUARD preconditions for coding
	const invalid =
		!editor ||
		ambiguousSelection(editor) ||
		selHasHighlightMarkup(editor) ||
		activeFileHasInvalidName(app);
	if (invalid) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to assign a code.", 4000);
		return;
	}

	// Determine codes already assigned to paragraph, so they can be excluded
	// from the list of codes in the Suggester
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) {
		new Notice("No file open.", 4000);
		return;
	}
	const paragraphText = editor.getLine(editor.getCursor().line);
	const codesFilesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText).map(
		(code) => code.tFile,
	);

	new SuggesterForCodeAssignment(plugin, editor, codesFilesInPara, dataFile).open();
}
