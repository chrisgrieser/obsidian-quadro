import { Editor, FuzzySuggestModal, Notice, TFile } from "obsidian";
import { ensureBlockId } from "src/block-id";
import Quadro from "src/main";
import { QuadroSettings, sortFuncs } from "src/settings/defaults";
import {
	SUGGESTER_INSTRUCTIONS,
	ambiguousSelection,
	currentlyInFolder,
	safelyGetActiveEditor,
} from "../utils";
import { getFullCode } from "./coding-utils";
import { createOneCodeFile } from "./create-new-code-file";

class SuggesterForCodeAssignment extends FuzzySuggestModal<TFile | "new-code-file"> {
	editor: Editor;
	codesInPara: TFile[];
	dataFile: TFile;
	settings: QuadroSettings;
	plugin: Quadro;

	constructor(plugin: Quadro, editor: Editor, codesInPara: TFile[], dataFile: TFile) {
		super(plugin.app);
		this.plugin = plugin;
		this.editor = editor;
		this.app = plugin.app;
		this.settings = plugin.settings;
		this.codesInPara = codesInPara;
		this.dataFile = dataFile;

		this.setPlaceholder("Select code to assign");
		this.setInstructions([
			...SUGGESTER_INSTRUCTIONS,
			{ command: 'type "new"', purpose: "Create new code" },
		]);
		this.modalEl.addClass("quadro");
	}

	// code-files, sorted by last use (which is relevant when query is empty)
	getItems(): (TFile | "new-code-file")[] {
		const allCodeFiles: (TFile | "new-code-file")[] = this.app.vault
			.getMarkdownFiles()
			.filter((tFile) => {
				const isInCodeFolder = tFile.path.startsWith(this.settings.coding.folder + "/");
				const isAlreadyAssigned = this.codesInPara.find((code) => code.path === tFile.path);
				return isInCodeFolder && !isAlreadyAssigned;
			})
			.sort(sortFuncs[this.settings.coding.sortFunc]);

		allCodeFiles.push("new-code-file");

		return allCodeFiles;
	}

	// display codename + minigraph, and an extra item for creating a new code file
	getItemText(item: TFile | "new-code-file"): string {
		if (item === "new-code-file") return "🞜 Create new code";
		const fullCode = getFullCode(this.plugin, item);

		const { char, charsPerBlock, maxLength, enabled } = this.settings.coding.minigraph;
		const miniGraph = enabled
			? "    " + char.repeat(Math.min(maxLength, item.stat.size / charsPerBlock))
			: "";

		return fullCode + miniGraph;
	}

	onChooseItem(codeFile: TFile | "new-code-file"): void {
		if (codeFile instanceof TFile) {
			this.assignCode(codeFile, this.dataFile);
		} else {
			createOneCodeFile(this.plugin, (codeFile) => this.assignCode(codeFile, this.dataFile));
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
	const editor = safelyGetActiveEditor(app);
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
