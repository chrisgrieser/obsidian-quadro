// SOURCE example for a suggester from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal

import { SuggestModal } from "obsidian";
import type { App, Editor, TFile } from "obsidian";

// CONFIG values are hardcoded for now, will be made configurable later
const codeFolderName = "Codes";

//──────────────────────────────────────────────────────────────────────────────

async function newBlockId(editor: Editor): Promise<string> {
	const tfile = editor.editorComponent.view.file;
	const fullText = await this.app.vault.cachedRead(tfile);
	const blockIdsInText = fullText.match(/\^\w+(?=\n)/g);
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

export class SuggesterForAddingQdaCode extends SuggestModal<TFile> {
	// patch constructor to pass editor from editorCallback
	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
	}
	editor: Editor;

	//───────────────────────────────────────────────────────────────────────────

	// TODO use fuzzy suggester instead of regular search
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
		const cursorPos = this.editor.getCursor();
		const ln = cursorPos.line;
		let lineContent = this.editor.getLine(ln);
		const linkToCodeFile = `[[${codeFile.basename}]]`;
		const blockIdOfLine = lineContent.match(/\^\w+$/);

		// TODO use selection for highlighting
		// const selectedText = tp.file.selection();
		// if (selectedText !== "") {
		// 	// ensures that no leading space of the selection disrupts highlighting markup
		// 	const highlightedText = selectedText.replace(/^( ?)(.+?)( ?)$/, "$1==$2==$3");
		// 	blockText = blockText.replace(selectedText, highlightedText);
		// }

		let id: string;
		if (blockIdOfLine) {
			id = blockIdOfLine[0];
			lineContent = lineContent.slice(0, -id.length); // remove blockID from line
		} else {
			id = await newBlockId(this.editor);
		}
		this.editor.setLine(ln, lineContent.trim() + " " + linkToCodeFile + " " + id);
		this.editor.setCursor(cursorPos); // setLine moves cursor, thus we need to move it back

		// CODE-FILE: Append embedded block from Data-file
		const dataFileName = this.editor.editorComponent.view.file.basename;
		const textToAppend = `\n- [[${dataFileName}]] ![[${dataFileName}#${id}]]`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}
