import { TFile } from "obsidian";
import Quadro from "src/main";
import { sortFuncs } from "src/settings/defaults";

export function getFullCode(plugin: Quadro, tFile: TFile): string {
	return tFile.path.slice(plugin.settings.coding.folder.length + 1, -3);
}

export function isCodeTemplateFile(plugin: Quadro, tFile: TFile | null): boolean {
	if (!tFile) return false;
	return tFile.path === plugin.settings.coding.folder + "/Template.md";
}

//──────────────────────────────────────────────────────────────────────────────

export interface Code {
	tFile: TFile;
	wikilink: string;
}

/** $0 matches the full link, $1 the inner link
 * includes optional trailing space to remove it when unassigning code */
export const WIKILINK_REGEX = /\[\[(.+?)([|#].*?)?\]\] ?/;

export function getCodesFilesInParagraphOfDatafile(
	plugin: Quadro,
	dataFile: TFile,
	paragraphText: string,
): Code[] {
	const { app, settings } = plugin;

	const wikilinksInParagr = paragraphText.match(new RegExp(WIKILINK_REGEX, "g")) || [];

	const codesInParagr = wikilinksInParagr.reduce((acc: Code[], wikilink) => {
		const [_, innerWikilink] = wikilink.match(WIKILINK_REGEX) || [];
		if (!innerWikilink) return acc;

		const linkTarget = app.metadataCache.getFirstLinkpathDest(innerWikilink, dataFile.path);
		const isInCodeFolder =
			linkTarget instanceof TFile && linkTarget.path.startsWith(settings.coding.folder + "/");
		if (isInCodeFolder) acc.push({ tFile: linkTarget, wikilink: wikilink });

		return acc;
	}, []);
	return codesInParagr;
}

//──────────────────────────────────────────────────────────────────────────────

/** Returns all Code Files, excluding the Template.md, and sorted based on setting */
export function getAllCodeFiles(plugin: Quadro): TFile[] {
	const settings = plugin.settings;
	const allFiles = plugin.app.vault.getMarkdownFiles();

	const allCodeFiles = allFiles.filter((tFile) => {
		const inCodeFolder = tFile.path.startsWith(settings.coding.folder + "/");
		const isMarkdownFile = tFile instanceof TFile && tFile.extension === "md";
		const isNotTemplate = tFile.name !== "Template.md";
		return isMarkdownFile && isNotTemplate && inCodeFolder;
	}) as TFile[];

	allCodeFiles.sort(sortFuncs[settings.coding.sortFunc]);
	return allCodeFiles;
}

//──────────────────────────────────────────────────────────────────────────────

/** displays full code & appends minigraph (if not disabled by user) */
export function codeFileDisplay(plugin: Quadro, codeFile: TFile): string {
	const fullCode = getFullCode(plugin, codeFile);

	const { char, charsPerBlock, maxLength, enabled } = plugin.settings.coding.minigraph;
	const miniGraph = enabled
		? "    " + char.repeat(Math.min(maxLength, codeFile.stat.size / charsPerBlock))
		: "";

	return fullCode + miniGraph;
}
