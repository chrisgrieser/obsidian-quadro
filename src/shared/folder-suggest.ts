import { AbstractInputSuggest, TFolder } from "obsidian";
import Quadro from "src/main";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	textInputEl: HTMLInputElement;
	plugin: Quadro;
	foldersInVault: TFolder[];

	constructor(plugin: Quadro, textInputEl: HTMLInputElement) {
		super(plugin.app, textInputEl);
		this.textInputEl = textInputEl;
		this.plugin = plugin;
		this.foldersInVault = plugin.app.vault
			.getAllLoadedFiles()
			.filter((abstractFile) => abstractFile instanceof TFolder) as TFolder[];
	}

	getSuggestions(query: string): TFolder[] {
		return this.foldersInVault.filter((folder) => folder.path.includes(query));
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

function pathRelativeToCodeFolder(plugin: Quadro, codeGroup: TFolder): string {
	return codeGroup.path.slice(plugin.settings.coding.folder.length + 1) + "/";
}

/** A Code Group is a subfolder of the code folder. */
export class CodeGroupSuggest extends FolderSuggest {
	override getSuggestions(query: string): TFolder[] {
		// only suggest folders in the Codes Folder, and only if a "/" was types
		if (!query.includes("/")) return [];

		const settings = this.plugin.settings;

		const matchingFolders = this.foldersInVault.filter((folder) => {
			const matchesQuery = folder.path.includes(query);
			const isInCodeFolder = folder.path.startsWith(settings.coding.folder + "/");
			return matchesQuery && isInCodeFolder;
		});

		return matchingFolders;
	}

	override renderSuggestion(folder: TFolder, el: HTMLElement): void {
		const fullCode = pathRelativeToCodeFolder(this.plugin, folder);
		el.createEl("span", { text: fullCode });
	}

	override selectSuggestion(folder: TFolder): void {
		this.textInputEl.value = pathRelativeToCodeFolder(this.plugin, folder);
		this.textInputEl.trigger("input");
		this.close();
	}
}
