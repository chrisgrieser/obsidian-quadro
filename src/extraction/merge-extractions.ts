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
	permaNotice: Notice;
	constructor(plugin: Quadro, toBeMergedFile: TFile) {
		super(plugin);
		this.setPlaceholder(`Select Extraction File to merge "${toBeMergedFile.basename}" into.`);

		this.toBeMergedFile = toBeMergedFile;
		this.toBeMergedFrontmatter =
			this.app.metadataCache.getFileCache(this.toBeMergedFile)?.frontmatter || {};

		const congruenceInfo =
			'INFO\n"Incongruence" refers to the dimensions that can not be automatically merged. ' +
			"The discarded values are saved, so you can manually fix the Extraction File after the merge operation.";
		this.permaNotice = new Notice(congruenceInfo, 0);
	}

	override onClose() {
		this.permaNotice.hide();
	}

	override onNoSuggestion() {
		new Notice("There must be at least two extractions of the same type to merge.", 4000);
		this.close();
	}

	// helper function
	getDiscardedProperties(secondFile: TFile): FrontMatterCache {
		const frontmatter = this.app.metadataCache.getFileCache(secondFile)?.frontmatter || {};
		const discardedProps: FrontMatterCache = {};

		for (const key in this.toBeMergedFrontmatter) {
			const value1 = frontmatter[key];
			const value2 = this.toBeMergedFrontmatter[key];

			const isList = Array.isArray(value1) && Array.isArray(value2);
			const isEmpty = (!value1 && value1 !== 0) || (!value2 && value2 !== 0);
			const isEqual = value1 === value2;
			const ignoredKey = key === "extraction-date" || key === "extraction-source";

			if (isList || isEmpty || isEqual || ignoredKey) continue;
			discardedProps[key] = value1; // values from `toBeMergedFile` are kept
		}

		return discardedProps;
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
		const conflictingKeys = Object.keys(this.getDiscardedProperties(extractionFile)).length;
		const incongruentInfo = conflictingKeys > 0 ? `    (${conflictingKeys}x incongruent)` : "";
		return extractionFile.basename + incongruentInfo;
	}

	async onChooseItem(toMergeInFile: TFile) {
		const { plugin, app } = this;
		const discardedProps = this.getDiscardedProperties(toMergeInFile);

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
			const frontmatterStart = getFrontMatterInfo(newFileContent).contentStart;
			const discardedPropsCodeblock = [
				"",
				"```yaml",
				"# Properties that could be not be automatically merged",
				stringifyYaml(discardedProps).trim(),
				"```",
				"",
			].join("\n");
			newFileContent =
				newFileContent.slice(0, frontmatterStart) +
				discardedPropsCodeblock +
				newFileContent.slice(frontmatterStart);
		}

		// HACK timeout needed, so embeds are loaded correctly (and there is no `await` for that)
		setTimeout(async () => await app.vault.modify(mergedFile, newFileContent), 200);

		new Notice(`"${this.toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`, 4000);
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
