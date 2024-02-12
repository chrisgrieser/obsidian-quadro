import { TFile } from "obsidian";

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a random 6-digit ID is created. A random ID is
 * preferable over counting the number of IDs, it is less likely that content
 * will be deleted due to the same blockID being used multiple times in
 * different files. */
export async function ensureBlockId(
	tFile: TFile,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const randomSixDigits = () =>
		Math.ceil(Math.random() * 1000000)
			.toString()
			.padStart(6, "0");

	// line already has blockID
	const [blockIdOfLine] = lineText.match(/\^\w+$/) || [];
	if (blockIdOfLine) {
		const lineWithoutId = lineText.slice(0, -blockIdOfLine.length).trim();
		return { blockId: blockIdOfLine, lineWithoutId: lineWithoutId };
	}

	// line has no blockID
	const fullText = await tFile.vault.cachedRead(tFile);
	const blockIdsInText: string[] = fullText.match(/\^\w+(?=\n)/g) || [];
	let newId: string;
	do {
		newId = "^id-" + randomSixDigits();
	} while (blockIdsInText.includes(newId));

	return { blockId: newId, lineWithoutId: lineText.trim() };
}
