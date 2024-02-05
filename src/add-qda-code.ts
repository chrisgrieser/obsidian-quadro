// SOURCE example for a suggester from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal
//──────────────────────────────────────────────────────────────────────────────

import { Notice, SuggestModal } from "obsidian";
import type { App, Editor, TFile } from "obsidian";

// CONFIG values are hardcoded for now, will be made configurable later
const codeFolderName = "Codes";
// const delimiter = "♦︎"; // icon for meta-information at the end of a block

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
		const matchingCodeNotes: TFile[] = this.app.vault.getMarkdownFiles().filter((tFile) => {
			const relPathInCodeFolder = tFile.path.slice(codeFolderName.length + 1);
			const matchesQuery = relPathInCodeFolder.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(codeFolderName + "/");
			return matchesQuery && isInCodeFolder;
		});
		return matchingCodeNotes;
	}

	renderSuggestion(codeNote: TFile, el: HTMLElement) {
		const parentInCodeFolder = codeNote.parent.path.slice(codeFolderName.length + 1);
		const codeName = codeNote.basename;
		el.createEl("div", { text: codeName });
		el.createEl("small", { text: parentInCodeFolder });
	}

	async onChooseSuggestion(targetNote: TFile, _evt: MouseEvent | KeyboardEvent) {
		const curLine = this.editor.getCursor().line;
		const codedText = this.editor.getLine(curLine);
		const wikilinkToCurrentNote = `[[${this.editor.editorComponent.view.file.basename}]]`;

		// const newContents = curContent + "**" + tp.file.title + "** " + blockRef + "\n\n";
		const textToAppend = `\n${codedText} ${wikilinkToCurrentNote}`;
		await this.app.vault.append(targetNote, textToAppend);

		const relPathInCodeFolder = targetNote.path.slice(codeFolderName.length + 1, -3);
		new Notice(`Added Code "${relPathInCodeFolder}"`);
	}
}
