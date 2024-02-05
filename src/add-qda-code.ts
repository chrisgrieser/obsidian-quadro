// SOURCE example from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal
//──────────────────────────────────────────────────────────────────────────────

import { Notice, SuggestModal } from "obsidian";

import type { App, Editor, TFile } from "obsidian";
type CodeNote = TFile & {};

// CONFIG values are hardcoded for now, will be made configurable later
const codeFolderName = "Codes";
// const delimiter = "♦︎"; // icon for meta-information at the end of a block
//──────────────────────────────────────────────────────────────────────────────

export class SuggesterForAddingQdaCode extends SuggestModal<CodeNote> {
	// patch constructor to pass editor from editorCallback
	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
	}
	editor: Editor;

	//───────────────────────────────────────────────────────────────────────────

	// TODO use fuzzy suggester instead of regular search
	getSuggestions(query: string): CodeNote[] {
		const matchingCodeNotes: CodeNote[] = this.app.vault.getMarkdownFiles().filter((tFile) => {
			const relPathInCodeFolder = tFile.path.slice(codeFolderName.length + 1);
			const matchesQuery = relPathInCodeFolder.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(codeFolderName + "/");
			return matchesQuery && isInCodeFolder;
		});
		return matchingCodeNotes;
	}

	renderSuggestion(codeNote: CodeNote, el: HTMLElement) {
		const parentInCodeFolder = codeNote.parent.path.slice(codeFolderName.length + 1);
		const codeName = codeNote.basename;
		el.createEl("div", { text: codeName });
		el.createEl("small", { text: parentInCodeFolder });
	}

	async onChooseSuggestion(targetNote: CodeNote, _evt: MouseEvent | KeyboardEvent) {
		const curLine = this.editor.getCursor().line;
		const codedText = this.editor.getLine(curLine);
		// const wikilinkToOriginalNote = `[[${targetNote.basename}]]`;

		// const newContents = curContent + "**" + tp.file.title + "** " + blockRef + "\n\n";
		await this.app.vault.append(targetNote, "\n" + codedText);

		const relPathInCodeFolder = targetNote.path.slice(codeFolderName.length + 1, -3);
		new Notice(`Added Code "${relPathInCodeFolder}"`);
	}
}
