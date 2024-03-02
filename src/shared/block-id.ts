import moment from "moment";
// DOCS https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
//──────────────────────────────────────────────────────────────────────────────

// INFO blockIds may only contain letters, numbers, and a hyphen
export const BLOCKID_REGEX = /\^[\w-]+$/;

// group 1: linkpath, group 2: blockID
export const EMBEDDED_BLOCKLINK_REGEX = /^!\[\[(.+?)#(\^[\w-]+)\]\]$/;

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a random 6-digit ID is created. A random ID is
 * preferable over counting the number of IDs, it is less likely that content
 * will be deleted due to the same blockID being used multiple times in
 * different files. */
export async function ensureBlockId(
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const [blockIdOfLine] = lineText.match(BLOCKID_REGEX) || [];

	// line already has blockID
	if (blockIdOfLine) {
		const lineWithoutId = lineText.slice(0, -blockIdOfLine.length).trim();
		return { blockId: blockIdOfLine, lineWithoutId: lineWithoutId };
	}

	// line has no blockID
	const newId = "^id-" + moment().format("YYMMDD-HHmmss");
	return { blockId: newId, lineWithoutId: lineText.trim() };
}
