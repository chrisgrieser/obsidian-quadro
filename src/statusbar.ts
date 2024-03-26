import { TFolder } from "obsidian";
import Quadro from "./main";
import { currentlyInFolder } from "./shared/utils";

export function updateStatusbar(plugin: Quadro): void {
	const { app, statusbar, settings } = plugin;

	// GUARD
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		statusbar.setText("");
		return;
	}

	const segments: string[] = [];
	const links = app.metadataCache.resolvedLinks[activeFile.path] || {};

	//───────────────────────────────────────────────────────────────────────────

	// CODEFILE: outgoing links = times code was assigned
	if (currentlyInFolder(plugin, "Codes")) {
		let codesAssigned = 0;
		for (const [linkTarget, count] of Object.entries(links)) {
			const linkToCodeFile = linkTarget.startsWith(settings.coding.folder);
			const linkToExtractionFile = linkTarget.startsWith(settings.extraction.folder);
			const linkToMdFile = linkTarget.endsWith(".md");
			if (linkToMdFile && !linkToExtractionFile && !linkToCodeFile) codesAssigned += count;
		}
		segments.push(`Code ${codesAssigned}x assigned`);
	}
	// EXTRACTION FILE: number of extractions made for the type
	else if (currentlyInFolder(plugin, "Extractions")) {
		const extractionType = activeFile.parent as TFolder;
		const extractionsMade = extractionType.children.length - 1; // -1 due to `Template.md`
		segments.push(`${extractionsMade}x extracted`);
	}
	// DATAFILE: differentiate links by whether they are extractions or codes
	else {
		let codesAssigned = 0;
		let extractionsMade = 0;
		for (const [filepath, count] of Object.entries(links)) {
			if (filepath.startsWith(settings.coding.folder + "/")) codesAssigned += count;
			if (filepath.startsWith(settings.extraction.folder + "/")) extractionsMade++;
		}
		if (codesAssigned > 0) segments.push(`${codesAssigned} Codes`);
		if (extractionsMade > 0) segments.push(`${extractionsMade} Extractions`);
	}

	// any type of file: count invalid links
	const unresolvedLinks = app.metadataCache.unresolvedLinks[activeFile.path] || {};
	let unresolvedTotal = 0;
	for (const [_, value] of Object.entries(unresolvedLinks)) {
		unresolvedTotal += value;
	}
	if (unresolvedTotal > 0) segments.push(`${unresolvedTotal} invalid links`);

	//───────────────────────────────────────────────────────────────────────────

	const text = segments
		.map((segment) => segment.replace(/^(1 .*)s$/, "$1")) // singular/plural
		.join(", ");
	statusbar.setText(text);
}
