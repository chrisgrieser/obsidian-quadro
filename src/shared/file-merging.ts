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
import { getFullCode } from "src/coding/coding-utils";
import Quadro from "src/main";
import { getActiveEditor } from "./utils";

/** FIX wrong embeds sometimes occurring */
function reloadLivePreview(app: App): void {
	// potential alternative: `app.workspace.activeEditor.leaf.rebuildView()`
	app.workspace.activeEditor?.editor?.editorComponent?.view?.currentMode?.cleanupLivePreview?.();
}

export async function mergeFiles(
	plugin: Quadro,
	mergeKeepFile: TFile,
	mergeAwayFile: TFile,
	backupDir: string,
	isCodeFile: boolean,
): Promise<void> {
	const { app, settings } = plugin;

	// PRE-MERGE BACKUP
	backupDir = normalizePath(backupDir + "/" + plugin.backupDirName);
	if (!app.vault.getFolderByPath(backupDir)) await app.vault.createFolder(backupDir);
	const timestamp = moment().format("YY-MM-DD_HH-mm-ss"); // ensures unique filename
	await app.vault.copy(mergeKeepFile, `${backupDir}/${mergeKeepFile.basename} ${timestamp}.md`);
	await app.vault.copy(mergeAwayFile, `${backupDir}/${mergeAwayFile.basename} ${timestamp}.md`);

	// MERGE FRONTMATTER into into `mergeKeepFile`
	// & SAVE DISCARDED PROPS
	const ignoreProps = [
		...settings.extraction.ignorePropertyOnMerge,
		"extraction-date",
		"merge-date",
	];
	const mergeAwayFrontmatter = app.metadataCache.getFileCache(mergeAwayFile)?.frontmatter || {};

	const discardedProps: FrontMatterCache = {};
	await app.fileManager.processFrontMatter(mergeKeepFile, (mergeKeepFrontmatter) => {
		for (const key in mergeAwayFrontmatter) {
			const val1 = mergeKeepFrontmatter[key];
			const val2 = mergeAwayFrontmatter[key];
			const val1Empty = !val1 && val1 !== 0 && val1 !== false;
			const val2Empty = !val2 && val2 !== 0 && val2 !== false;
			const isIgnored = ignoreProps.includes(key);
			const isEqual = val1 === val2;

			if (isIgnored || isEqual || val2Empty) continue;
			if (val1Empty) {
				mergeKeepFrontmatter[key] = val2;
				continue;
			}
			if (Array.isArray(val1) && Array.isArray(val2)) {
				mergeKeepFrontmatter[key] = [...new Set([...val1, ...val2])];
				continue;
			}

			mergeKeepFrontmatter[key] = val1;
			discardedProps[key] = val2; // save the value that is discarded
		}

		// obsidian has trouble with timezone data, thus leaving it out
		mergeKeepFrontmatter["merge-date"] = moment().format("YYYY-MM-DDTHH:mm");
	});

	// MERGE CONTENT into `mergeKeepFile`
	const mergeKeep = await app.vault.read(mergeKeepFile);
	const mergeAway = await app.vault.read(mergeAwayFile);
	const mergeKeepContent = mergeKeep.slice(getFrontMatterInfo(mergeKeep).contentStart);
	const mergeAwayContent = mergeAway.slice(getFrontMatterInfo(mergeAway).contentStart);

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

	const mergedContent = (mergeKeepContent + "\n" + mergeAwayContent)
		.replaceAll("**Paragraph extracted from:**\n", "")
		.replace(/\n{2,}/g, "\n");
	const mergeKeepRawfm = mergeKeep.slice(0, getFrontMatterInfo(mergeKeep).contentStart);
	await app.vault.modify(mergeKeepFile, mergeKeepRawfm + discardedInfo + mergedContent);
	reloadLivePreview(app);
	getActiveEditor(app)?.setCursor({ line: 0, ch: 0 }); // move cursor to beginning of file

	// POINT REFERENCES from `mergeAway` to `mergeKeep`
	const filesPointingToMergeAway: string[] = [];
	for (const [filepath, links] of Object.entries(app.metadataCache.resolvedLinks)) {
		const targets = Object.keys(links);
		if (targets.includes(mergeAwayFile.path)) filesPointingToMergeAway.push(filepath);
	}
	const uniqueOutdatedFiles = [...new Set(filesPointingToMergeAway)];
	let changedFilesCount = 0;
	let changedLinksCount = 0;
	for (const filepath of uniqueOutdatedFiles) {
		const linkedFile = app.vault.getFileByPath(filepath);
		if (!linkedFile) continue;

		// UPDATE LINKS safely
		let content = await app.vault.read(linkedFile);
		const outlinks = app.metadataCache.getFileCache(linkedFile)?.links || [];
		for (const link of outlinks) {
			// skip if not pointing to `mergeAwayFile`
			if (link.link !== mergeAwayFile.basename && link.link !== mergeAwayFile.path) continue;

			// point links to `mergeKeepFile`
			const alias = isCodeFile ? "|" + getFullCode(plugin, mergeKeepFile) : "";
			const newLinkText = `[[${mergeKeepFile.basename}${alias}]]`;
			const { start, end } = link.position;
			content = content.slice(0, start.offset) + newLinkText + content.slice(end.offset);
			changedLinksCount++;
		}

		await app.vault.modify(linkedFile, content);
		changedFilesCount++;
	}

	// DISCARD `mergeAway`
	// not using `app.vault.trash` as we already have a backup & to avoid the
	// need to temporarily disable out trash-watcher
	app.vault.delete(mergeAwayFile); // can be async

	// NOTIFY
	const s1 = changedLinksCount === 1 ? "" : "s";
	const s2 = changedFilesCount === 1 ? "" : "s";
	const msg = [
		`"${mergeAwayFile.basename}" merged into "${mergeKeepFile.basename}".`,
		`${changedLinksCount} reference${s1} in ${changedFilesCount} file${s2} updated.`,
		`A backup of the original files has been saved in the subfolder "${plugin.backupDirName}."`,
	].join("\n\n");
	new Notice(msg, 12000);
}
