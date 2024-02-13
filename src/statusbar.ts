import { App, TFolder } from "obsidian";
import { CODE_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "./settings";
import { currentlyInFolder } from "./utils";

export function updateStatusbar(app: App): void {
	// get statusbar via app instead of passing it around and then into this function
	const elems: Element[] = Array.from(app.statusBar?.containerEl?.children);
	const statusbar = elems.find((el) => el.hasClass("plugin-quadro"));
	if (!statusbar) return;

	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		statusbar.setText("");
		return;
	}

	//───────────────────────────────────────────────────────────────────────────

	const segments: string[] = [];
	const links = app.metadataCache.resolvedLinks[activeFile.path] || {};

	// CODEFILE: links = times code was assigned
	if (currentlyInFolder(app, "Codes")) {
		let codesAssigned = 0;
		for (const [_, count] of Object.entries(links)) {
			codesAssigned += count;
		}
		segments.push(`Code ${codesAssigned}x assigned`);
	}
	// EXTRACTION FILE: number of extractions made for the type
	else if (currentlyInFolder(app, "Extractions")) {
		const extractionType = activeFile.parent as TFolder;
		const extractionsMade = extractionType.children.length - 1; // -1 due to `Template.md`
		segments.push(`${extractionsMade}x extracted`);
	}
	// DATAFILE: differentiate links by whether they are extractions or codes
	else {
		let codesAssigned = 0;
		let extractionsMade = 0;
		for (const [filepath, count] of Object.entries(links)) {
			if (filepath.startsWith(CODE_FOLDER_NAME + "/")) codesAssigned += count;
			if (filepath.startsWith(EXTRACTION_FOLDER_NAME + "/")) extractionsMade++;
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
