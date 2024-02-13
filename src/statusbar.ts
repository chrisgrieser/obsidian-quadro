import { App, MarkdownView } from "obsidian";
import { CODE_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "./settings";
import { currentlyInFolder } from "./utils";

export function updateStatusbar(app: App): void {
	// get statusbar via app instead of passing it around and then into this function
	const elems: Element[] = Array.from(app.statusBar?.containerEl?.children);
	const statusbar = elems.find((el) => el.hasClass("plugin-quadro"));
	if (!statusbar) return;

	// GUARD no file open, or in extraction folder (where counts are not meaningful)
	const activeFilepath =
		app.workspace.getActiveViewOfType(MarkdownView)?.editor.editorComponent.view?.file?.path;
	if (!activeFilepath || currentlyInFolder(app, "Extractions")) {
		statusbar.setText("");
		return;
	}

	//───────────────────────────────────────────────────────────────────────────

	let text = "";
	const links = app.metadataCache.resolvedLinks[activeFilepath] || {};

	// CODEFILE: links = times code was assigned
	if (currentlyInFolder(app, "Codes")) {
		let codesAssigned = 0;
		for (const [_, count] of Object.entries(links)) {
			codesAssigned += count;
		}
		text = `Code ${codesAssigned}x assigned`;
	}
	// DATAFILE: differentiate links by whether they are extractions or codes
	else {
		let codesAssigned = 0;
		let extractionsMade = 0;
		for (const [filepath, count] of Object.entries(links)) {
			if (filepath.startsWith(CODE_FOLDER_NAME + "/")) codesAssigned += count;
			if (filepath.startsWith(EXTRACTION_FOLDER_NAME + "/")) extractionsMade++;
		}
		const codeInfo = codesAssigned > 0 ? `${codesAssigned} Codes` : "";
		const extractionInfo = extractionsMade > 0 ? `${extractionsMade} Extractions` : "";

		text = [codeInfo, extractionInfo].filter(Boolean).join(", ");
	}

	// any type of file: count invalid links
	const unresolvedLinks = app.metadataCache.unresolvedLinks[activeFilepath] || {};
	let unresolvedTotal = 0;
	for (const [_, value] of Object.entries(unresolvedLinks)) {
		unresolvedTotal += value;
	}
	let invalidInfo = "";
	if (unresolvedTotal === 1) invalidInfo = ", 1 invalid link";
	else if (unresolvedTotal > 1) invalidInfo = `, ${unresolvedTotal} invalid links`;

	//───────────────────────────────────────────────────────────────────────────
	statusbar.setText(text + invalidInfo);
}
