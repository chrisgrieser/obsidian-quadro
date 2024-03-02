import { TFile } from "obsidian";
import Quadro from "src/main";

export function getFullCode(plugin: Quadro, tFile: TFile): string {
	return tFile.path.slice(plugin.settings.coding.folder.length + 1, -3);
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
	const { app, settings } = plugin;
	const wikilinkRegex = /\[\[(.+?)([|#].*?)?\]\]/;

	const wikilinksInParagr = paragraphText.match(new RegExp(wikilinkRegex, "g")) || [];

	const codesInParagr = wikilinksInParagr.reduce((acc: Code[], wikilink) => {
		const [_, innerWikilink] = wikilink.match(wikilinkRegex) || [];
		if (!innerWikilink) return acc;

		const linkTarget = app.metadataCache.getFirstLinkpathDest(innerWikilink, dataFile.path);
		const isInCodeFolder =
			linkTarget instanceof TFile && linkTarget.path.startsWith(settings.coding.folder + "/");
		if (isInCodeFolder) acc.push({ tFile: linkTarget, wikilink: wikilink });

		return acc;
	}, []);
	return codesInParagr;
}
