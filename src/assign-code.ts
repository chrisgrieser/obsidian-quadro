import { App, Editor, FuzzySuggestModal, MarkdownView, Notice, TFile } from "obsidian";
import { createCodeFile } from "./create-new-code-file";
import {
   ASSIGN_CODE_INITIAL_ORDER,
   CODE_FOLDER_NAME,
   MINIGRAPH,
   TFILE_SORT_FUNC
} from "./settings";

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a unique id will be created. */
async function ensureBlockId(
	file: TFile,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const blockIdOfLine = lineText.match(/\^\w+$/);
	if (blockIdOfLine) {
		const blockId = blockIdOfLine[0];
		const lineWithoutId = lineText.slice(0, -blockId.length);
		return { blockId: blockId, lineWithoutId: lineWithoutId };
	}

	const fullText: string = await this.app.vault.cachedRead(file);
	const blockIdsInText = fullText.match(/\^\w+(?=\n)/g);
	if (!blockIdsInText) return { blockId: "^id1", lineWithoutId: lineText };

	let counter = blockIdsInText ? blockIdsInText.length : 0;
	let newBlockId: string;

	// ensure blockId does not exist yet
	// (this can happen if user changed the id manually)
	do {
		counter++;
		newBlockId = "^id" + counter;
	} while (blockIdsInText.includes(newBlockId));

	return { blockId: newBlockId, lineWithoutId: lineText };
}

class SuggesterForCodeAssignment extends FuzzySuggestModal<TFile | "new-code-file"> {
	editor: Editor;

	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
		this.setPlaceholder("Select code to assign");
		this.setInstructions([
			{ command: "↑↓", purpose: "Navigate" },
			{ command: "⏎", purpose: "Select" },
			{ command: 'type "new"', purpose: "Create new code" },
		]);
	}

	//───────────────────────────────────────────────────────────────────────────
	// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions

	// code-files, sorted by last use (which is relevant when query is empty)
	getItems(): (TFile | "new-code-file")[] {
		const initialOrderOnEmptyQuery = TFILE_SORT_FUNC[ASSIGN_CODE_INITIAL_ORDER];

		const allCodeFiles: (TFile | "new-code-file")[] = this.app.vault
			.getMarkdownFiles()
			.filter((tFile) => tFile.path.startsWith(CODE_FOLDER_NAME + "/"))
			.sort(initialOrderOnEmptyQuery);

		allCodeFiles.push("new-code-file");
		return allCodeFiles;
	}

	// display codename + minigraph, and an extra item for creating a new code file
	getItemText(item: TFile | "new-code-file"): string {
		if (item === "new-code-file") return "🞜 Create new code";

		const { char, charsPerBlock, maxLength } = MINIGRAPH;
		const miniGraph = "    " + char.repeat(Math.min(maxLength, item.stat.size / charsPerBlock));

		const fullCode = item.path.slice(CODE_FOLDER_NAME.length + 1, -3);
		return fullCode + miniGraph;
	}

	onChooseItem(codeFile: TFile | "new-code-file") {
		const dataFile: TFile = this.editor.editorComponent.view.file;

		if (codeFile instanceof TFile) {
			this.assignCode(codeFile, dataFile);
		} else {
			createCodeFile(this.app, (codeFile) => this.assignCode(codeFile, dataFile));
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** Data-File: Add blockID & link to Code-File in the current line
	 * Code-File: Append embedded blocklink to Data-File */
	async assignCode(codeFile: TFile, dataFile: TFile) {
		const cursor = this.editor.getCursor();
		const nameOfCode = codeFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
		let lineText = this.editor.getLine(cursor.line);

		// GUARD
		const lineAlreadyHasCode =
			lineText.includes(`[[${nameOfCode}]]`) || lineText.includes(`[[${codeFile.basename}]]`);
		if (lineAlreadyHasCode) {
			new Notice(`Paragraph already has code "${nameOfCode}"`);
			return;
		}

		const selection = this.editor.getSelection();
		if (selection) {
			// spaces need to be moved outside, as otherwise they make the highlights invalid
			const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
			this.editor.replaceSelection(highlightAdded);
			lineText = this.editor.getLine(cursor.line);
		}
		const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);

		// Data-File Changes
		const updatedLine = `${lineWithoutId} [[${nameOfCode}]] ${blockId}`;
		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// Code-File Changes
		const dataFilePath = dataFile.path.slice(0, -3);
		const textToAppend = `![[${dataFilePath}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function assignCode(editorOrApp: Editor | App) {
	// GUARD
	let editor: Editor;
	if (editorOrApp instanceof App) {
		const view = editorOrApp.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active editor.");
			return;
		}
		editor = view.editor;
	} else {
		editor = editorOrApp;
	}

	const isInCodeFolder = editor.editorComponent.view.file.path.startsWith(CODE_FOLDER_NAME + "/");
	if (isInCodeFolder) {
		new Notice("You cannot assign a code to a code file.");
		return;
	}
	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.");
		return;
	}

	new SuggesterForCodeAssignment(editor.editorComponent.app, editor).open();
}
