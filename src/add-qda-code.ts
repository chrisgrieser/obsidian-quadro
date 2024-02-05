// SOURCE example from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal
//──────────────────────────────────────────────────────────────────────────────

import { Notice, SuggestModal } from "obsidian";

import type { TFile } from "obsidian";
type CodeNote = TFile & {};

// CONFIG values are hardcoded for now, will be made configurable later
const codeFolderName = "Codes";
//──────────────────────────────────────────────────────────────────────────────

export class SuggesterForAddingQdaCode extends SuggestModal<CodeNote> {
	getSuggestions(query: string): CodeNote[] {
		const matchingCodeNotes: CodeNote[] = this.app.vault.getMarkdownFiles().filter((tFile) => {
			const matchesQuery = tFile.basename.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(codeFolderName + "/");
			return matchesQuery && isInCodeFolder;
		});
		return matchingCodeNotes;
	}

	renderSuggestion(codeNote: CodeNote, el: HTMLElement) {
		const relPathInCodeFolder = codeNote.parent.path.slice(codeFolderName.length + 1);
		const codeName = codeNote.basename;
		el.createEl("div", { text: codeName });
		el.createEl("small", { text: relPathInCodeFolder });
	}

	onChooseSuggestion(codeNote: CodeNote, _evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected: ${codeNote.basename}`);
	}
}
