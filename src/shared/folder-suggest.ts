import { AbstractInputSuggest, TFolder } from "obsidian";
import { getFullCode } from "src/coding/coding-utils";
import Quadro from "src/main";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	textInputEl: HTMLInputElement;
	plugin: Quadro;

	constructor(plugin: Quadro, textInputEl: HTMLInputElement) {
		super(plugin.app, textInputEl);
		this.textInputEl = textInputEl;
		this.plugin = plugin;
	}

	getSuggestions(query: string): TFolder[] {
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
		this.textInputEl.value = folder.path;
		this.textInputEl.trigger("input");
		this.close();
	}
}

/** A Code Group is a subfolder of the code folder. */
export class CodeGroupSuggest extends FolderSuggest {
	// only suggest folders in the Codes Folder, and only if a "/" was types
	override getSuggestions(query: string): TFolder[] {
		if (!query.includes("/")) return [];

		const settings = this.plugin.settings;
		const allFiles = this.plugin.app.vault.getAllLoadedFiles();

		const matchingFolders = allFiles.filter((abstractFile) => {
			const isFolder = abstractFile instanceof TFolder;
			const matchesQuery = abstractFile.path.includes(query);
			const isInCodeFolder = abstractFile.path.startsWith(settings.coding.folder + "/");
			return isFolder && matchesQuery && isInCodeFolder;
		}) as TFolder[];

		return matchingFolders;
	}

	override renderSuggestion(folder: TFolder, el: HTMLElement): void {
		const fullCode = getFullCode(this.plugin, folder) + "/";
		el.createEl("span", { text: fullCode });
	}

	override selectSuggestion(folder: TFolder): void {
		this.textInputEl.value = getFullCode(this.plugin, folder) + "/";
		this.textInputEl.trigger("input");
		this.close();
	}
}
