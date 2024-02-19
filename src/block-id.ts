import { TFile } from "obsidian";

function randomSixDigits(): string {
	return Math.ceil(Math.random() * 1000000)
		.toString()
		.padStart(6, "0");
}

export const blockIdRegex = /\^[\w-]+$/;

// group 1: linkpath, group 2: blockID
export const embeddedBlockLinkRegex = /^!\[\[(.+?)#(\^[\w-]+)\]\]$/;

const allBlockIdsRegex = /\^[\w-]+(?=\n|$)/g;

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a random 6-digit ID is created. A random ID is
 * preferable over counting the number of IDs, it is less likely that content
 * will be deleted due to the same blockID being used multiple times in
 * different files. */
export async function ensureBlockId(
	tFile: TFile,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const [blockIdOfLine] = lineText.match(blockIdRegex) || [];

	// line already has blockID
	if (blockIdOfLine) {
		const lineWithoutId = lineText.slice(0, -blockIdOfLine.length).trim();
		return { blockId: blockIdOfLine, lineWithoutId: lineWithoutId };
	}

	// line has no blockID
	const fullText = await tFile.vault.cachedRead(tFile);
	const blockIdsInText: string[] = fullText.match(allBlockIdsRegex) || [];
	let newId: string;
	do {
		newId = "^id-" + randomSixDigits();
	} while (blockIdsInText.includes(newId));
	return { blockId: newId, lineWithoutId: lineText.trim() };
}
