import { App, Editor, FuzzySuggestModal, Notice, TFile } from "obsidian";
import {
   ASSIGN_CODE_INITIAL_ORDER,
   CODE_FOLDER_NAME,
   MINIGRAPH,
   TFILE_SORT_FUNC,
} from "../settings";
import {
   SUGGESTER_INSTRUCTIONS,
   currentlyInFolder,
   getFullCode,
   safelyGetActiveEditor,
} from "../utils";
import { ensureBlockId } from "./block-id";
import { createOneCodeFile } from "./create-new-code-file";

//──────────────────────────────────────────────────────────────────────────────

class SuggesterForCodeAssignment extends FuzzySuggestModal<TFile | "new-code-file"> {
	editor: Editor;
	codesInPara: TFile[];
	dataFile: TFile;

	constructor(app: App, editor: Editor, codesInPara: TFile[], dataFile: TFile) {
		super(app);
		this.editor = editor;
		this.codesInPara = codesInPara;
		this.dataFile = dataFile;
		this.setPlaceholder("Select code to assign");
		this.setInstructions([
			...SUGGESTER_INSTRUCTIONS,
			{ command: 'type "new"', purpose: "Create new code" },
		]);
		this.modalEl.addClass("quadro");
	}

	//───────────────────────────────────────────────────────────────────────────
	// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions

	// code-files, sorted by last use (which is relevant when query is empty)
	getItems(): (TFile | "new-code-file")[] {
		const initialOrderOnEmptyQuery = TFILE_SORT_FUNC[ASSIGN_CODE_INITIAL_ORDER];

		const allCodeFiles: (TFile | "new-code-file")[] = this.app.vault
			.getMarkdownFiles()
			.filter((tFile) => {
				const isInCodeFolder = tFile.path.startsWith(CODE_FOLDER_NAME + "/");
				const isAlreadyAssigned = this.codesInPara.find((code) => code.path === tFile.path);
				return isInCodeFolder && !isAlreadyAssigned;
			})
			.sort(initialOrderOnEmptyQuery);

		allCodeFiles.push("new-code-file");

		return allCodeFiles;
	}

	// display codename + minigraph, and an extra item for creating a new code file
	getItemText(item: TFile | "new-code-file"): string {
		if (item === "new-code-file") return "🞜 Create new code";

		const { char, charsPerBlock, maxLength } = MINIGRAPH;
		const miniGraph = "    " + char.repeat(Math.min(maxLength, item.stat.size / charsPerBlock));
		const fullCode = getFullCode(item);
		return fullCode + miniGraph;
	}

	onChooseItem(codeFile: TFile | "new-code-file") {
		if (codeFile instanceof TFile) {
			this.assignCode(codeFile, this.dataFile);
		} else {
			createOneCodeFile(this.app, (codeFile) => this.assignCode(codeFile, this.dataFile));
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** DATAFILE: Add blockID & link to Code-File in the current line
	 * CODEFILE: Append embedded blocklink to Data-File */
	async assignCode(codeFile: TFile, dataFile: TFile) {
		const cursor = this.editor.getCursor();
		const fullCode = getFullCode(codeFile);
		let lineText = this.editor.getLine(cursor.line);

		const selection = this.editor.getSelection();
		if (selection) {
			// spaces need to be moved outside, as otherwise they make the highlights invalid
			const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
			this.editor.replaceSelection(highlightAdded);
			lineText = this.editor.getLine(cursor.line);
		}
		const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);

		// DATAFILE Changes
		const updatedLine = `${lineWithoutId} [[${fullCode}]] ${blockId}`;
		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// CODEFILE Changes
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

	if (currentlyInFolder(app, "Codes")) {
		new Notice("You cannot assign codes to a code file.");
		return;
	}

	const hasHighlightMarkupInSel = editor.getSelection().includes("==");
	if (hasHighlightMarkupInSel) {
		new Notice("Selection contains highlights.\nOverlapping highlights are not supported.");
		return;
	}

	const dataFile = editor.editorComponent.view.file;
	const lineText = editor.getLine(editor.getCursor().line);
	const wikilinksInParagr = lineText.match(/\[\[.+?\]\]/g) || [];
	const codesInPara = wikilinksInParagr.reduce((acc: TFile[], wikilink) => {
		wikilink = wikilink.slice(2, -2);
		const target = app.metadataCache.getFirstLinkpathDest(wikilink, dataFile.path);
		if (target instanceof TFile && target.path.startsWith(CODE_FOLDER_NAME + "/"))
			acc.push(target);
		return acc;
	}, []);

	new SuggesterForCodeAssignment(app, editor, codesInPara, dataFile).open();
}
