import { App, Editor, FuzzySuggestModal, Notice, TFile } from "obsidian";
import { createOneCodeFile } from "./create-new-code-file";
import {
   ASSIGN_CODE_INITIAL_ORDER,
   CODE_FOLDER_NAME,
   MINIGRAPH,
   TFILE_SORT_FUNC,
} from "../settings";
import { currentlyInCodeFolder, getFullCodeName, safelyGetActiveEditor } from "../utils";

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a random 6-digit ID is created. A random ID is
 * preferable over counting the number of IDs, it is less likely that content
 * will be deleted due to the same blockID being used multiple times in
 * different files. */
async function ensureBlockId(
	tFile: TFile,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const randomSixDigits = () =>
		Math.ceil(Math.random() * 1000000)
			.toString()
			.padStart(6, "0");

	// line already has blockID
	const [blockIdOfLine] = lineText.match(/\^\w+$/) || [];
	if (blockIdOfLine) {
		const lineWithoutId = lineText.slice(0, -blockIdOfLine.length).trim();
		return { blockId: blockIdOfLine, lineWithoutId: lineWithoutId };
	}

	// line has no blockID
	const fullText = await tFile.vault.cachedRead(tFile);
	const blockIdsInText: string[] = fullText.match(/\^\w+(?=\n)/g) || [];
	let newId: string;
	do {
		newId = "^id-" + randomSixDigits();
	} while (blockIdsInText.includes(newId));

	return { blockId: newId, lineWithoutId: lineText.trim() };
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
			{ command: "esc", purpose: "Dismiss" },
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

		return getFullCodeName(item) + miniGraph;
	}

	onChooseItem(codeFile: TFile | "new-code-file") {
		const dataFile: TFile = this.editor.editorComponent.view.file;

		if (codeFile instanceof TFile) {
			this.assignCode(codeFile, dataFile);
		} else {
			createOneCodeFile(this.app, (codeFile) => this.assignCode(codeFile, dataFile));
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** Data-File: Add blockID & link to Code-File in the current line
	 * Code-File: Append embedded blocklink to Data-File */
	async assignCode(codeFile: TFile, dataFile: TFile) {
		const cursor = this.editor.getCursor();
		const fullCode = getFullCodeName(codeFile);
		let lineText = this.editor.getLine(cursor.line);

		// GUARD
		const lineAlreadyHasCode =
			lineText.includes(`[[${fullCode}]]`) || lineText.includes(`[[${codeFile.basename}]]`);
		if (lineAlreadyHasCode) {
			new Notice(`Paragraph already has code "${fullCode}"`);
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
		const updatedLine = `${lineWithoutId} [[${fullCode}]] ${blockId}`;
		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// Code-File Changes
		const dataFilePath = dataFile.path.slice(0, -3);
		const textToAppend = `![[${dataFilePath}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function assignCode(app: App) {
	// GUARD
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;

	if (currentlyInCodeFolder(app)) {
		new Notice("You cannot assign codes to a code file.");
		return;
	}

	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.");
		return;
	}

	new SuggesterForCodeAssignment(editor.editorComponent.app, editor).open();
}
