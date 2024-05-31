import {
	FrontMatterCache,
	Notice,
	TFile,
	TFolder,
	getFrontMatterInfo,
	stringifyYaml,
} from "obsidian";
import { setupTrashWatcher } from "src/deletion-watcher";
import Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor, typeOfFile } from "src/shared/utils";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	toBeMergedFrontmatter: FrontMatterCache;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge "${toBeMergedFile.basename}" into.`);

		this.toBeMergedFile = toBeMergedFile;
		this.toBeMergedFrontmatter =
			this.app.metadataCache.getFileCache(this.toBeMergedFile)?.frontmatter || {};
	}

	override onNoSuggestion() {
		new Notice("There must be at least two extractions of the same type to merge.", 5000);
		this.close();
	}

	getItems(): TFile[] {
		const extractionType = this.toBeMergedFile.parent as TFolder;
		const extractionsOfSameType = (
			extractionType.children.filter(
				(ch) =>
					ch instanceof TFile &&
					ch.extension === "md" &&
					ch.name !== "Template.md" &&
					ch.path !== this.toBeMergedFile.path,
			) as TFile[]
		).sort((a, b) => b.stat.mtime - a.stat.mtime);
		return extractionsOfSameType;
	}

	getItemText(extractionFile: TFile): string {
		const { app, settings } = this;
		const frontmatter = app.metadataCache.getFileCache(extractionFile)?.frontmatter;
		const displayProps = settings.extraction.displayPropertyOnMerge;
		if (!frontmatter || displayProps.length === 0) return extractionFile.basename;

		// use first existing property as display
		const displayKey = displayProps.find((key) => {
			const val = frontmatter[key];
			const keyExists = val || val === 0;
			return keyExists;
		});
		if (!displayKey) return extractionFile.basename;

		let displayVal = frontmatter[displayKey];
		if (Array.isArray(displayVal)) displayVal = displayVal.join(", ");

		const displayPropInfo = displayVal ? `  ⬩  ${displayKey}: ${displayVal}` : "";
		return extractionFile.basename + displayPropInfo;
	}

	async onChooseItem(toMergeInFile: TFile) {
		const { plugin, app, settings } = this;

		// save discarded properties
		const discardedProps: FrontMatterCache = {};
		const frontmatter = app.metadataCache.getFileCache(toMergeInFile)?.frontmatter || {};
		for (const key in this.toBeMergedFrontmatter) {
			const value1 = frontmatter[key];
			const value2 = this.toBeMergedFrontmatter[key];

			const isList = Array.isArray(value1) && Array.isArray(value2);
			const isEmpty = (!value1 && value1 !== 0) || (!value2 && value2 !== 0);
			const isEqual = value1 === value2;
			const ignoredKey = settings.extraction.ignorePropertyOnMerge.includes(key);

			if (isList || isEmpty || isEqual || ignoredKey) continue;
			discardedProps[key] = value1; // values from `toBeMergedFile` are kept
		}

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, "", false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);
		const mergedFile = toMergeInFile;

		// cleanup merged file
		let newFileContent = (await app.vault.read(mergedFile))
			.replaceAll("**Paragraph extracted from:**\n", "")
			.replaceAll("\n\n\n", "\n");

		// insert discarded properties between frontmatter and content
		const hasDiscardedProps = Object.keys(discardedProps).length > 0;
		if (hasDiscardedProps) {
			const listOfDiscarded = stringifyYaml(discardedProps)
				.trim()
				.split("\n")
				.map((item) => "- " + item);
			const discardedInfo = [
				"",
				"#### Properties that could be not be automatically merged",
				...listOfDiscarded,
				"",
				"---",
				"",
			].join("\n");

			const frontmatterStart = getFrontMatterInfo(newFileContent).contentStart;
			newFileContent =
				newFileContent.slice(0, frontmatterStart) +
				discardedInfo +
				newFileContent.slice(frontmatterStart);
		}

		// HACK timeout needed, so embeds are loaded correctly (and there is no `await` for that)
		setTimeout(async () => await app.vault.modify(mergedFile, newFileContent), 500);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 5000);
	}
}

export function mergeExtractionFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Extraction File") {
		new Notice("You must be in the Extraction File for this.", 3000);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	new SuggesterForExtractionMerging(plugin, toBeMergedFile).open();
}
