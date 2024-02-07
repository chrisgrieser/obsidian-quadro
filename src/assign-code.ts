import { FuzzySuggestModal, Notice, TFile } from "obsidian";
import type { App, Editor } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";
import { createCodeFile } from "./create-new-file";

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

//──────────────────────────────────────────────────────────────────────────────

export class SuggesterForCodeAssignment extends FuzzySuggestModal<TFile | "new-code-file"> {
	editor: Editor;

	constructor(app: App, editor: Editor) {
		super(app);

		// save reference to editor from `editorCallback`, so we do not need to
		// retrieve the editor manually
		this.editor = editor;

		this.setPlaceholder("Select code");
		this.setInstructions([
			{ command: "↑↓", purpose: "Navigate" },
			{ command: "⏎", purpose: "Select" },
			{ command: 'type "new"', purpose: "Create new code" },
		]);
	}

	//───────────────────────────────────────────────────────────────────────────
	// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions

	getItems(): (TFile | "new-code-file")[] {
		const allCodeFiles: (TFile | "new-code-file")[] = this.app.vault
			.getMarkdownFiles()
			.filter((tFile) => tFile.path.startsWith(CODE_FOLDER_NAME + "/"));
		allCodeFiles.push("new-code-file");
		return allCodeFiles;
	}

	getItemText(item: TFile | "new-code-file"): string {
		if (item === "new-code-file") return "🞜 Create new code";

		const { char, charsPerBlock, maxLength } = MINIGRAPH;
		const miniGraph = "    " + char.repeat(Math.min(maxLength, item.stat.size / charsPerBlock));

		const codeName = item.path.slice(CODE_FOLDER_NAME.length + 1, -3);
		return codeName + miniGraph;
	}

	onChooseItem(file: TFile | "new-code-file") {
		const dataFile: TFile = this.editor.editorComponent.view.file;

		if (file instanceof TFile) {
			this.assignCode(file, dataFile);
		} else {
			createCodeFile((codeFile) => this.assignCode(codeFile, dataFile));
		}
	}

	//───────────────────────────────────────────────────────────────────────────

	/** Data-File: Add blockID & link to Code-File in the current line
	 * Code-File: Append embedded blocklink to Data-File */
	async assignCode(codeFile: TFile, dataFile: TFile) {
		const cursor = this.editor.getCursor();
		const nameOfCode = codeFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
		let lineText = this.editor.getLine(cursor.line).trim();

		// GUARD
		const lineAlreadyHasCode =
			lineText.includes(`[[${nameOfCode}]]`) || lineText.includes(`[[${codeFile.basename}]]`);
		if (lineAlreadyHasCode) {
			new Notice(`Paragraph already has code "${nameOfCode}"`);
			return;
		}

		const selection = this.editor.getSelection();
		if (selection) {
			// Depending on the selection the user made, `replaceSelection` can result
			// in double-spaces, thus removing them
			this.editor.replaceSelection(`==${selection.trim()}==`);
			lineText = this.editor.getLine(cursor.line).trim().replace(/ {2,}/g, " ");
		}
		const { blockId, lineWithoutId } = await ensureBlockId(dataFile, lineText);

		// Data-File Changes
		const updatedLine = `${lineWithoutId} [[${nameOfCode}]] ${blockId}`;
		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// Code-File Changes
		const dataFilePath = dataFile.path.slice(0, -3);
		const textToAppend = `- ![[${dataFilePath}#${blockId}]]\n`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}
