import { TFile } from "obsidian";
import Quadro from "src/main";
import { sortFuncs } from "src/settings/defaults";
import { WIKILINK_REGEX, typeOfFile } from "src/shared/utils";

export function getFullCode(plugin: Quadro, tFile: TFile): string {
	return tFile.path.slice(plugin.settings.coding.folder.length + 1, -3);
}

export function countTimesCodeIsAssigned(plugin: Quadro, codeFile: TFile): number {
	const outgoingLinks = plugin.app.metadataCache.resolvedLinks[codeFile.path] || {};
	let codesAssigned = 0;
	for (const [linkFromCodeFile, count] of Object.entries(outgoingLinks)) {
		if (typeOfFile(plugin, linkFromCodeFile) === "Data File") codesAssigned += count;
	}
	return codesAssigned;
}

//──────────────────────────────────────────────────────────────────────────────

export interface Code {
	tFile: TFile;
	wikilink: string;
}

export function getCodesFilesInParagraphOfDatafile(
	plugin: Quadro,
	dataFile: TFile,
	paragraphText: string,
): Code[] {
	const app = plugin.app;
	const wikilinksInParagr = paragraphText.match(new RegExp(WIKILINK_REGEX, "g")) || [];

	const codesInParagr = wikilinksInParagr.reduce((acc: Code[], wikilink) => {
		const [_, innerWikilink] = wikilink.match(WIKILINK_REGEX) || [];
		if (!innerWikilink) return acc;

		const linkedFile = app.metadataCache.getFirstLinkpathDest(innerWikilink, dataFile.path);
		if (linkedFile && typeOfFile(plugin, linkedFile) === "Code File")
			acc.push({ tFile: linkedFile, wikilink: wikilink });

		return acc;
	}, []);
	return codesInParagr;
}

//──────────────────────────────────────────────────────────────────────────────

/** Returns all Code Files, sorted based on user setting */
export function getAllCodeFiles(plugin: Quadro): TFile[] {
	const allCodeFiles = plugin.app.vault
		.getMarkdownFiles()
		.filter((tFile) => typeOfFile(plugin, tFile) === "Code File");

	const sortFuncToUse = sortFuncs[plugin.settings.coding.sortFunc];
	allCodeFiles.sort(sortFuncToUse);
	return allCodeFiles;
}

//──────────────────────────────────────────────────────────────────────────────

export function codeFileDisplay(plugin: Quadro, codeFile: TFile): string {
	const fullCode = getFullCode(plugin, codeFile);

	const displayCount = plugin.settings.coding.displayCount;
	if (!displayCount) return fullCode;

	const count = countTimesCodeIsAssigned(plugin, codeFile);
	return `${fullCode} (${count}x)`;
}
