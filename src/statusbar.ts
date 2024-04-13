import { countTimesCodeIsAssigned } from "./coding/coding-utils";
import { countExtractionsForType } from "./extraction/extraction-utils";
import Quadro from "./main";
import { typeOfFile } from "./shared/utils";

export function updateStatusbar(plugin: Quadro): void {
	const { app, statusbar, settings } = plugin;

	// GUARD
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		statusbar.setText("");
		return;
	}

	const segments: string[] = [];

	//───────────────────────────────────────────────────────────────────────────

	// CODEFILE: outgoing links = times code was assigned
	if (typeOfFile(plugin) === "Code File") {
		const codeFile = activeFile;
		const codeAssignedCount = countTimesCodeIsAssigned(plugin, codeFile);
		segments.push(`Code ${codeAssignedCount}x assigned`);
	}
	// EXTRACTION FILE: number of extractions made for the type
	else if (typeOfFile(plugin) === "Extraction File") {
		const extractionType = activeFile.parent;
		if (extractionType) {
			const extractionsMade = countExtractionsForType(extractionType);
			segments.push(`${extractionsMade}x extracted`);
		}
	}
	// DATAFILE: differentiate links by whether they are extractions or codes
	else {
		const outgoingLinks = app.metadataCache.resolvedLinks[activeFile.path] || {};
		let codeAssignedCount = 0;
		let extractionsMade = 0;
		for (const [filepath, count] of Object.entries(outgoingLinks)) {
			if (filepath.startsWith(settings.coding.folder + "/")) codeAssignedCount += count;
			if (filepath.startsWith(settings.extraction.folder + "/")) extractionsMade++;
		}
		if (codeAssignedCount > 0) segments.push(`${codeAssignedCount} Codes`);
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
