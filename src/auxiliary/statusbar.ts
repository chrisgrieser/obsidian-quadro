import { countTimesCodeIsAssigned } from "src/coding/coding-utils";
import { getExtractionsOfType } from "src/extraction/extraction-utils";
import type Quadro from "src/main";
import { typeOfFile } from "src/shared/validation";

export function updateStatusbar(plugin: Quadro): void {
	const { app, statusbar, settings } = plugin;
	const shortened = settings.statusbar.shortened;
	const segments: string[] = [];
	const filetype = typeOfFile(plugin);
	const activeFile = app.workspace.getActiveFile();

	// GUARD
	if (!activeFile || !["Data File", "Code File", "Extraction File"].includes(filetype)) {
		statusbar.setText("");
		statusbar.setCssProps({ display: "none" }); // avoids padding of empty statusbar item
		return;
	}

	//───────────────────────────────────────────────────────────────────────────

	// CODEFILE: outgoing links = times code was assigned
	if (filetype === "Code File") {
		const codeFile = activeFile;
		const count = countTimesCodeIsAssigned(plugin, codeFile);
		const text = shortened ? `${count}C` : `Code ${count}x assigned`;
		segments.push(text);
	}

	// EXTRACTION FILE: number of extractions made for the type
	else if (filetype === "Extraction File") {
		const extractionType = activeFile.parent;
		if (extractionType) {
			const count = getExtractionsOfType(plugin, extractionType).length;
			const text = shortened ? `${count}E` : `${count}x extracted`;
			segments.push(text);
		}
	}

	// DATAFILE: differentiate links by whether they are extractions or codes
	else if (filetype === "Data File") {
		const outgoingLinks = app.metadataCache.resolvedLinks[activeFile.path] || {};
		let codes = 0;
		let extractions = 0;
		for (const [filepath, count] of Object.entries(outgoingLinks)) {
			if (filepath.startsWith(settings.coding.folder + "/")) codes += count;
			if (filepath.startsWith(settings.extraction.folder + "/")) extractions++;
		}
		if (codes > 0) segments.push(`${codes}${shortened ? "C" : " Codes"}`);
		if (extractions > 0) segments.push(`${extractions}${shortened ? "E" : " Extractions"}`);
	}

	// any type of file: count invalid links
	const unresolvedLinks = app.metadataCache.unresolvedLinks[activeFile.path] || {};
	let unresolvedTotal = 0;
	for (const [_, value] of Object.entries(unresolvedLinks)) {
		unresolvedTotal += value;
	}
	if (unresolvedTotal > 0) segments.push(`${unresolvedTotal}${shortened ? "?" : "invalid links"}`);

	//───────────────────────────────────────────────────────────────────────────

	// GUARD
	if (segments.length === 0) {
		statusbar.setText("");
		statusbar.setCssProps({ display: "none" });
		return;
	}

	const text = shortened
		? segments.join(" ")
		: segments // singular/plural s
				.map((segment) => (segment.startsWith("1 ") ? segment.slice(0, -1) : segment))
				.join(", ");
	statusbar.setText(text);
	statusbar.setCssProps({ display: "block" });
}
