import { Editor, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { sortFuncs } from "src/settings/defaults";
import { ensureBlockId } from "src/shared/block-id";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { ambiguousSelection, currentlyInFolder, getActiveEditor } from "../shared/utils";
import { getFullCode } from "./coding-utils";
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
		const settings = this.settings;
		const codeFolderItems =
			this.app.vault.getFolderByPath(settings.coding.folder)?.children || [];

		const allCodeFiles = codeFolderItems.filter((tFile) => {
			const isMarkdownFile = tFile instanceof TFile && tFile.extension === "md";
			const isAlreadyAssigned = this.codesInPara.find((code) => code.path === tFile.path);
			const isTemplate = tFile.name === "Template.md";
			return isMarkdownFile && !isAlreadyAssigned && !isTemplate;
		}) as TFile[];
		allCodeFiles.sort(sortFuncs[settings.coding.sortFunc]);

		const items: CodeAssignItem[] = allCodeFiles;
		items.push("new-code-file");

		return items;
	}

	// display codename + minigraph, and an extra item for creating a new code file
	getItemText(item: CodeAssignItem): string {
		if (item === "new-code-file") return "🞜 Create new code";
		const fullCode = getFullCode(this.plugin, item);

		const { char, charsPerBlock, maxLength, enabled } = this.settings.coding.minigraph;
		const miniGraph = enabled
			? "    " + char.repeat(Math.min(maxLength, item.stat.size / charsPerBlock))
			: "";

		return fullCode + miniGraph;
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
		const cursor = this.editor.getCursor();
		const fullCode = getFullCode(this.plugin, codeFile);
		let lineText = this.editor.getLine(cursor.line);

		const selection = this.editor.getSelection();
		if (selection) {
			// spaces need to be moved outside, otherwise they make the highlights invalid
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

export function assignCodeCommand(plugin: Quadro): void {
	const { app, settings } = plugin;
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
	const lineText = editor.getLine(editor.getCursor().line);
	const wikilinksInParagr = lineText.match(/\[\[.+?\]\]/g) || [];
	const codesInPara = wikilinksInParagr.reduce((acc: TFile[], wikilink: string) => {
		wikilink = wikilink.slice(2, -2);
		const target = app.metadataCache.getFirstLinkpathDest(wikilink, dataFile.path);
		if (target?.path.startsWith(settings.coding.folder + "/")) acc.push(target);
		return acc;
	}, []);

	new SuggesterForCodeAssignment(plugin, editor, codesInPara, dataFile).open();
}
