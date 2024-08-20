import {
	FrontMatterCache,
	MarkdownView,
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
import { getExtractionFileDisplay, getExtractionsOfType } from "./extraction-utils";

class SuggesterForExtractionMerging extends ExtendedFuzzySuggester<TFile> {
	toBeMergedFile: TFile;
	toBeMergedFrontmatter: FrontMatterCache;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge "${toBeMergedFile.basename}" into.`);

		this.toBeMergedFile = toBeMergedFile;
		this.toBeMergedFrontmatter =
			this.app.metadataCache.getFileCache(toBeMergedFile)?.frontmatter || {};
	}

	getItems(): TFile[] {
		const extractionType = this.toBeMergedFile.parent as TFolder;
		const extractionsOfSameType = getExtractionsOfType(extractionType)
			.filter((extrFile) => extrFile.path !== this.toBeMergedFile.path)
			.sort((a, b) => b.stat.mtime - a.stat.mtime);
		if (extractionsOfSameType.length === 0) {
			new Notice("No other extractions have been created yet.", 4000);
			this.close();
		}
		return extractionsOfSameType;
	}

	getItemText(extractionFile: TFile): string {
		return getExtractionFileDisplay(this.plugin, extractionFile);
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
			// values from `toBeMergedFile` are kept, so we save values from `toMergeInFile`
			discardedProps[key] = value1;
		}

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, "", false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);
		const mergedFile = toMergeInFile;

		// CLEANUP merged file
		let newContent = (await app.vault.read(mergedFile))
			.replaceAll("**Paragraph extracted from:**\n", "")
			.replace(/\n{2,}/g, "\n")
			// biome-ignore lint/nursery/useTopLevelRegex: not relevant here
			.replace(/(---.*---)/s, "$1\n"); // line break after frontmatter

		// INSERT DISCARDED PROPERTIES between frontmatter and content
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

			const fmStart = getFrontMatterInfo(newContent).contentStart;
			newContent = newContent.slice(0, fmStart) + discardedInfo + newContent.slice(fmStart);
		}

		await app.vault.modify(mergedFile, newContent);
		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 5000);

		// VALIDATE extraction sources
		const extrSources =
			app.metadataCache.getFileCache(mergedFile)?.frontmatter?.["extraction-source"];
		if (extrSources.length < 2 || !Array.isArray(extrSources)) {
			const msg =
				"Extraction sources have not been been merged correctly.\n" +
				"Please check original files.";
			new Notice(msg, 0);
		}

		// FIX wrong embeds sometimes occurring
		app.workspace.getActiveViewOfType(MarkdownView)?.currentMode.cleanupLivePreview();
	}
}

export function mergeExtractionFilesCommand(plugin: Quadro) {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Extraction File") {
		new Notice("You must be in an Extraction File for this.", 4000);
		return;
	}

	const toBeMergedFile = editor.editorComponent.view.file;
	new SuggesterForExtractionMerging(plugin, toBeMergedFile).open();
}
