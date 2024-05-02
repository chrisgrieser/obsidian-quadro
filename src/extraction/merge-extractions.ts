import { FrontMatterCache, Notice, TFile, TFolder, stringifyYaml } from "obsidian";
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

		const msg = [
			"MERGING INFO",
			"- List properties are fully merged.",
			`- For conflicting, non-list properties, the values from "${toBeMergedFile.basename}" take priority.`,
			"- The discarded values are copied to the clipboard.",
		].join("\n");
		this.permaNotice = new Notice(msg, 0);

		this.toBeMergedFile = toBeMergedFile;
		this.toBeMergedFrontmatter =
			this.app.metadataCache.getFileCache(this.toBeMergedFile)?.frontmatter || {};
	}

	override onClose() {
		this.permaNotice.hide();
	}

	override onNoSuggestion() {
		new Notice("There must be at least two extractions of the same type to merge.", 4000);
		this.close();
	}

	// helper function
	getConflictingProperties(secondFile: TFile): FrontMatterCache {
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
		const conflictingKeys = Object.keys(this.getConflictingProperties(extractionFile));
		const conflictInfo =
			conflictingKeys.length > 0
				? conflictingKeys.length <= 5
					? `   ⚠️ conflicting: ${conflictingKeys.join(", ")}`
					: `   ⚠️ ${conflictingKeys.length} conflicting properties`
				: "";
		return extractionFile.basename + conflictInfo;
	}

	async onChooseItem(toMergeInFile: TFile) {
		const { plugin, app } = this;

		// save discarded properties
		const discardedProps = stringifyYaml(this.getConflictingProperties(toMergeInFile));
		if (discardedProps !== "{}") {
			navigator.clipboard.writeText(discardedProps);
			const msg = `Discarded properties copied to clipboard\n―――――――\n${discardedProps}`;
			new Notice(msg, 7000);
		}

		// MERGE (via Obsidian API)
		// INFO temporarily disable trashWatcher, as the merge operation trashes
		// the toBeMergedFile file, triggering an unwanted removal of references
		if (plugin.trashWatcherUninstaller) plugin.trashWatcherUninstaller();
		await app.fileManager.mergeFile(toMergeInFile, this.toBeMergedFile, "", false);
		plugin.trashWatcherUninstaller = setupTrashWatcher(plugin);
		const mergedFile = toMergeInFile;

		// cleanup merged file
		const newFileContent = (await app.vault.read(mergedFile))
			.replaceAll("**Paragraph extracted from:**\n", "")
			.replaceAll("\n\n\n", "\n");

		// HACK needed, so embeds are loaded (and there is no `await` for that)
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
