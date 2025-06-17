import {
	type App,
	type FrontMatterCache,
	getFrontMatterInfo,
	moment,
	Notice,
	normalizePath,
	stringifyYaml,
	type TFile,
} from "obsidian";
import { getFullCode } from "src/coding/coding-utils";
import type Quadro from "src/main";
import { BACKUP_DIRNAME } from "src/settings/constants";
import { getActiveEditor } from "./utils";

/** FIX embedded blocks not being loaded correctly */
function reloadLivePreview(app: App): void {
	// potential alternative: `app.workspace.activeEditor.leaf.rebuildView()`
	app.workspace.activeEditor?.editor?.editorComponent?.view?.currentMode?.cleanupLivePreview?.();
}

export async function mergeFiles(
	plugin: Quadro,
	mergeKeepFile: TFile,
	mergeAwayFile: TFile,
	backupDir: string,
	filetype: "Code File" | "Extraction File",
): Promise<void> {
	const { app, settings } = plugin;

	// PRE-MERGE BACKUP
	backupDir = normalizePath(backupDir + "/" + BACKUP_DIRNAME);
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
			if (!Object.hasOwn(mergeAwayFrontmatter, key)) continue;
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

		// Obsidian apparently has trouble with timezone data, thus leaving it out
		mergeKeepFrontmatter["merge-date"] = moment().format("YYYY-MM-DDTHH:mm");
	});

	// MERGE CONTENT into `mergeKeepFile`
	const mergeAwayText = await app.vault.cachedRead(mergeAwayFile);
	await app.vault.process(mergeKeepFile, (mergeKeepText) => {
		const mergeKeepContent = mergeKeepText.slice(getFrontMatterInfo(mergeKeepText).contentStart);
		const mergeAwayContent = mergeAwayText.slice(getFrontMatterInfo(mergeAwayText).contentStart);

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
		const mergeKeepRawFm = mergeKeepText.slice(0, getFrontMatterInfo(mergeKeepText).contentStart);
		return mergeKeepRawFm + discardedInfo + mergedContent;
	});

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
	let updatedLinksCount = 0;
	for (const filepath of uniqueOutdatedFiles) {
		const outdatedFile = app.vault.getFileByPath(filepath);
		if (!outdatedFile) continue;

		await app.vault.process(outdatedFile, (content) => {
			const outlinks = app.metadataCache.getFileCache(outdatedFile)?.links || [];
			const rangesToUpdate: [number, number][] = [];
			for (const link of outlinks) {
				if (link.link !== mergeAwayFile.basename && link.link !== mergeAwayFile.path) continue;
				const { start, end } = link.position;
				rangesToUpdate.push([start.offset, end.offset]);
			}

			rangesToUpdate.sort((a, b) => b[0] - a[0]); // backwards so offsets do not shift
			for (const [start, end] of rangesToUpdate) {
				const alias = filetype === "Code File" ? "|" + getFullCode(plugin, mergeKeepFile) : "";
				const newLinkText = `[[${mergeKeepFile.basename}${alias}]]`;
				content = content.slice(0, start) + newLinkText + content.slice(end);
				updatedLinksCount++;
			}
			return content;
		});
		changedFilesCount++;
	}

	// DISCARD `mergeAway`
	// Not using `app.vault.trash` as we already have a backup & to avoid the
	// need to temporarily disable our trash-watcher.
	app.vault.delete(mergeAwayFile); // can be async

	// NOTIFY
	const s1 = updatedLinksCount === 1 ? "" : "s";
	const s2 = changedFilesCount === 1 ? "" : "s";
	const msg = [
		`"${mergeAwayFile.basename}" merged into "${mergeKeepFile.basename}".`,
		`${updatedLinksCount} reference${s1} in ${changedFilesCount} file${s2} updated.`,
		`A backup of the original files has been saved in the subfolder "${BACKUP_DIRNAME}."`,
	].join("\n\n");
	new Notice(msg, 10000);
}
