import moment from "moment";
import {
	App,
	FrontMatterCache,
	Notice,
	TFile,
	getFrontMatterInfo,
	normalizePath,
	stringifyYaml,
} from "obsidian";
import Quadro from "src/main";

/** FIX wrong embeds sometimes occurring */
function reloadLivePreview(app: App): void {
	// potential alternative: `app.workspace.activeEditor.leaf.rebuildView()`
	app.workspace.activeEditor?.editor?.editorComponent?.view?.currentMode?.cleanupLivePreview?.();
}

export async function mergeFiles(
	plugin: Quadro,
	toBeMergedFile: TFile,
	toMergeInFile: TFile,
	backupDir?: string,
): Promise<void> {
	const { app, settings } = plugin;

	// PRE MERGE BACKUP
	backupDir = normalizePath(
		(backupDir || toBeMergedFile.parent?.path || "") + "/" + plugin.backupDirName,
	);
	if (!app.vault.getFolderByPath(backupDir)) await app.vault.createFolder(backupDir);
	const timestamp = moment().format("YY-MM-DD_HH-mm-ss"); // ensures unique filename

	await app.vault.copy(toBeMergedFile, `${backupDir}/${toBeMergedFile.basename} ${timestamp}.md`);
	await app.vault.copy(toMergeInFile, `${backupDir}/${toMergeInFile.basename} ${timestamp}.md`);

	// MERGE FRONTMATTER into into `` & SAVE DISCARDED PROPS
	const ignoreProps = [
		...settings.extraction.ignorePropertyOnMerge,
		"extraction-date",
		"merge-date",
	];
	const toMergeInFrontmatter = app.metadataCache.getFileCache(toMergeInFile)?.frontmatter || {};

	const discardedProps: FrontMatterCache = {};
	await app.fileManager.processFrontMatter(toBeMergedFile, (toBeMergedFrontmatter) => {
		for (const key in toMergeInFrontmatter) {
			const val1 = toBeMergedFrontmatter[key];
			const val2 = toMergeInFrontmatter[key];
			const val1Empty = !val1 && val1 !== 0 && val1 !== false;
			const val2Empty = !val2 && val2 !== 0 && val2 !== false;
			const isIgnored = ignoreProps.includes(key);
			const isEqual = val1 === val2;

			if (isIgnored || isEqual || val2Empty) continue;
			if (val1Empty) {
				toBeMergedFrontmatter[key] = val2;
				continue;
			}
			if (Array.isArray(val1) && Array.isArray(val2)) {
				toBeMergedFrontmatter[key] = [...new Set([...val1, ...val2])];
				continue;
			}

			toBeMergedFrontmatter[key] = val1;
			discardedProps[key] = val2; // save the value that was discarded
		}

		// obsidian has trouble with timezone data, thus leaving it out
		toBeMergedFrontmatter["merge-date"] = moment().format("YYYY-MM-DDTHH:mm");
	});

	// MERGE CONTENT into `toMergeInFile`
	const toBeMerged = await app.vault.read(toBeMergedFile);
	const toMergeIn = await app.vault.read(toMergeInFile);
	const toBeMergedContent = toBeMerged.slice(getFrontMatterInfo(toBeMerged).contentStart);
	const toMergeInContent = toMergeIn.slice(getFrontMatterInfo(toMergeIn).contentStart);

	let discardedInfo = "";
	const hasDiscardedProps = Object.keys(discardedProps).length > 0;
	if (hasDiscardedProps) {
		const listOfDiscarded = stringifyYaml(discardedProps)
			.trim()
			.split("\n")
			.map((item) => "- " + item);
		const heading = "#### Properties that could be not be automatically merged";
		discardedInfo = "\n" + [heading, ...listOfDiscarded, "", "---"].join("\n") + "\n\n";
	}

	const mergedContent = (toBeMergedContent + "\n" + toMergeInContent)
		.replaceAll("**Paragraph extracted from:**\n", "")
		.replace(/\n{2,}/g, "\n");
	const toBeMergedRawfm = toBeMerged.slice(0, getFrontMatterInfo(toBeMerged).contentStart);
	await app.vault.modify(toBeMergedFile, toBeMergedRawfm + discardedInfo + mergedContent);

	// POINT REFERENCES from `toMergeInFile` to `toBeMergedFile``
	const outdatesFiles: string[] = [];
	for (const [filepath, links] of Object.entries(app.metadataCache.resolvedLinks)) {
		const targets = Object.keys(links);
		if (targets.includes(toMergeInFile.path)) outdatesFiles.push(filepath);
	}
	const uniqueOutdatesFiles = [...new Set(outdatesFiles)];
	for (const filepath of uniqueOutdatesFiles) {
		const linkedFile = app.metadataCache.getFirstLinkpathDest(filepath, toMergeInFile.path);
		if (!linkedFile) continue;

		const content = await app.vault.read(linkedFile);
		// CAVEAT not fully safe, links may be formatted differently
		const newContent = content.replaceAll(
			`${toMergeInFile.basename}]]`,
			`${toBeMergedFile.basename}]]`,
		);
		await app.vault.modify(linkedFile, newContent);
	}

	// DISCARD `toMergeInFile`
	// not using `vault.trash` as we already have a backup & to avoid the need to
	// temporarily disable out trash-watcher
	app.vault.delete(toMergeInFile); // can be async

	// POST MERGE
	reloadLivePreview(app);
	const msg = [
		`"${toBeMergedFile.basename}" merged into "${toMergeInFile.basename}".`,
		"",
		`A backup of the original files has been saved in the subfolder "${plugin.backupDirName}."`,
	].join("\n");
	new Notice(msg, 7000);
}
