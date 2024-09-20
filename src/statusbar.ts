import { countTimesCodeIsAssigned } from "./coding/coding-utils";
import { getExtractionsOfType } from "./extraction/extraction-utils";
import Quadro from "./main";
import { typeOfFile } from "./shared/utils";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: linear enough so it's fine
export function updateStatusbar(plugin: Quadro): void {
	const { app, statusbar, settings } = plugin;
	const segments: string[] = [];
	const filetype = typeOfFile(plugin);
	const activeFile = app.workspace.getActiveFile();

	// GUARD
	if (!activeFile || !["Data File", "Code File", "Extraction File"].includes(filetype)) {
		statusbar.setText("");
		return;
	}

	//───────────────────────────────────────────────────────────────────────────

	// CODEFILE: outgoing links = times code was assigned
	if (filetype === "Code File") {
		const codeFile = activeFile;
		const codeAssignedCount = countTimesCodeIsAssigned(plugin, codeFile);
		segments.push(`Code ${codeAssignedCount}x assigned`);
	}

	// EXTRACTION FILE: number of extractions made for the type
	else if (filetype === "Extraction File") {
		const extractionType = activeFile.parent;
		if (extractionType) {
			const count = getExtractionsOfType(plugin, extractionType).length;
			segments.push(`${count}x extracted`);
		}
	}

	// DATAFILE: differentiate links by whether they are extractions or codes
	else if (filetype === "Data File") {
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
		// singular/plural s
		.map((segment) => (segment.startsWith("1 ") ? segment.slice(0, -1) : segment))
		.join(", ");
	statusbar.setText(text);
}
