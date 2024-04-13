import { App, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { WIKILINK_REGEX, isSpecialFile } from "./utils";

/** Given a file, identifies all references to it in DATAFILES, and removes
 * those. To identify DataFiles, uses the embedded links in the refFile. */
export async function removeAllFileRefsFromDataFile(plugin: Quadro, refFile: TFile) {
	const app = plugin.app;
	const errors: string[] = [];
	let successes = 0;
	const specialFile = isSpecialFile(plugin, refFile);

	const allEmbeds = app.metadataCache.getFileCache(refFile)?.embeds || [];
	for (const embed of allEmbeds) {
		const [linkPath, blockId] = embed.link.split("#");
		if (!linkPath || !blockId) continue;
		const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath, refFile.path);
		const isDataFile = dataFile instanceof TFile && !isSpecialFile(plugin, dataFile);
		if (!isDataFile) continue;

		// delete from DATAFILE
		const errorMsg = await removeSingleFileRefFromDatafile(app, refFile, dataFile, blockId);

		if (errorMsg) errors.push(errorMsg);
		else successes++;
	}

	// REPORT
	if (successes === 0 && errors.length === 0) {
		const errorMsg = `⚠️ ${specialFile} "${refFile.name}" has no references which could be deleted.`;
		new Notice(errorMsg);
		console.warn(errorMsg);
		return;
	}

	const successMsg = `${specialFile} "${refFile.name}" and ${successes} references to it deleted.\n`;
	if (errors.length > 0) {
		const msg = [
			successMsg,
			`⚠️ ${errors.length} references could not be deleted:`,
			"- " + errors.join("\n- "),
		].join("\n");
		console.warn(msg);
		new Notice(msg, 0);
	} else {
		new Notice(successMsg);
	}
}

/** Delete a reference to a CodeFile or ExtractionFile.
 * returns an error msg; returns empty string if no error.
 * NOTE: requires references to be formatted as wikilinks. */
export async function removeSingleFileRefFromDatafile(
	app: App,
	refFile: TFile,
	dataFile: TFile,
	blockId: string,
): Promise<string | ""> {
	// retrieve referenced line in DATAFILE
	const dataFileLines = (await app.vault.read(dataFile)).split("\n");
	const lnumInDataFile = dataFileLines.findIndex((line) => line.endsWith(blockId));
	if (lnumInDataFile < 0)
		return `Data File "${dataFile.basename}", has no line with the ID "${blockId}".`;
	const dataFileLine = dataFileLines[lnumInDataFile] || "";

	// identify link to CODFILE in that DATAFILE line
	const linksInDataFileLine = dataFileLine.match(new RegExp(WIKILINK_REGEX, "g")) || [];
	const linkToCodeFile = linksInDataFileLine.find((link) => {
		link = link.trim().slice(2, -2);
		const linkedTFile = app.metadataCache.getFirstLinkpathDest(link, dataFile.path);
		return linkedTFile instanceof TFile && linkedTFile.path === refFile.path;
	});
	if (!linkToCodeFile)
		return `Data File "${dataFile.basename}", line "${blockId}" has no valid link to the "${refFile.name}".`;

	// remove link to CODFILE from DATAFILE line
	dataFileLines[lnumInDataFile] = dataFileLine.replace(linkToCodeFile, "");
	await app.vault.modify(dataFile, dataFileLines.join("\n"));
	return "";
}
