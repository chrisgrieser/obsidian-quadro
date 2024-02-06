// SOURCE example for a suggester from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal

import { SuggestModal } from "obsidian";
import type { App, Editor, TFile } from "obsidian";

// CONFIG values are hardcoded for now
const codeFolderName = "Codes";

//──────────────────────────────────────────────────────────────────────────────

async function newBlockId(editor: Editor): Promise<string> {
	const tfile = editor.editorComponent.view.file;
	const fullText: string = await this.app.vault.cachedRead(tfile);
	const blockIdsInText = fullText.match(/\^\w+(?=\n)/g);
	if (!blockIdsInText) return "^id1";

	let counter = blockIdsInText ? blockIdsInText.length : 0;
	let newId: string;

	// ensure blockId is unique (e.g. user changed blockId manually)
	do {
		counter++;
		newId = "^id" + counter;
	} while (blockIdsInText.includes(newId));

	return newId;
}

//──────────────────────────────────────────────────────────────────────────────

export class SuggesterForAddCode extends SuggestModal<TFile> {
	constructor(app: App, editor: Editor) {
		super(app);
		this.setPlaceholder("Select Code");
		// save reference to editor from `editorCallback`, so we do not need to
		// retrieve the editor manually
		this.editor = editor;
	}
	editor: Editor;

	//───────────────────────────────────────────────────────────────────────────

	getSuggestions(query: string): TFile[] {
		const allFiles: TFile[] = this.app.vault.getMarkdownFiles();
		const matchingCodeFiles = allFiles.filter((tFile) => {
			const relPathInCodeFolder = tFile.path.slice(codeFolderName.length + 1);
			const matchesQuery = relPathInCodeFolder.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(codeFolderName + "/");
			return matchesQuery && isInCodeFolder;
		});
		return matchingCodeFiles;
	}

	renderSuggestion(codeFile: TFile, el: HTMLElement) {
		const parentInCodeFolder = codeFile.parent.path.slice(codeFolderName.length + 1);
		const codeName = codeFile.basename;
		el.createEl("div", { text: codeName });
		el.createEl("small", { text: parentInCodeFolder });
	}

	async onChooseSuggestion(codeFile: TFile, _evt: MouseEvent | KeyboardEvent) {
		// DATA-FILE: Add blockID & link to Code-file in the current line
		const cursor = this.editor.getCursor();
		const selection = this.editor.getSelection();
		if (selection) this.editor.replaceSelection(`==${selection.trim()}==`);
		let lineText = this.editor.getLine(cursor.line);

		// determine block-id
		const blockIdOfLine = lineText.match(/\^\w+$/);
		let id: string;
		if (blockIdOfLine) {
			id = blockIdOfLine[0];
			lineText = lineText.slice(0, -id.length); // remove blockID from line
		} else {
			id = await newBlockId(this.editor);
		}

		lineText = lineText.trim().replace(/ {2,}/g, " "); // `replaceSelection` can result in double-spaces
		this.editor.setLine(cursor.line, `${lineText} [[${codeFile.basename}]] ${id}`);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// CODE-FILE: Append embedded block from Data-file
		const dataFileName = this.editor.editorComponent.view.file.basename;
		const textToAppend = `\n- [[${dataFileName}]] ![[${dataFileName}#${id}]]`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}
