import { AbstractInputSuggest, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	textInputEl?: HTMLInputElement;

	protected getSuggestions(query: string): TFolder[] {
		const matchingFolders = this.app.vault.getAllLoadedFiles().filter((abstractFile) => {
			const isFolder = abstractFile instanceof TFolder;
			const matchesQuery = abstractFile.path.includes(query);
			return isFolder && matchesQuery;
		}) as TFolder[];
		return matchingFolders;
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createEl("span", { text: folder.path });
	}

	selectSuggestion(folder: TFolder): void {
		if (this.textInputEl) {
			this.textInputEl.value = folder.path;
			this.textInputEl.trigger("input");
		}

		this.close();
	}
}
