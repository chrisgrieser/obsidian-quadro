import { App, Notice, TFile } from "obsidian";
import { currentlyInFolder, safelyGetActiveEditor } from "src/utils";
import { DataFileReference, removeCodeFileRefInDataFile } from "./unassign-code";

export async function deleteCodeEverywhereCommand(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;
	if (!currentlyInFolder(app, "Codes")) {
		new Notice("Must be in Code File to delete the code everywhere.");
		return;
	}
	const codeFile = editor.editorComponent.view.file;

	// determine all DATAFILES that are referenced in CODEFILE, and their blockID
	// (`app.metadataCache.resolvedLinks` does not contain blockIDs, so we need
	// to use the embedded links in the CODEFILE)
	const allEmbeddedLinks = (app.metadataCache.getFileCache(codeFile)?.embeds || []).map(
		(embed) => embed.link,
	);

	const referencedParasInDataFiles = allEmbeddedLinks.reduce((acc: DataFileReference[], link) => {
		const [linkPath, blockId] = link.split("#");
		if (!linkPath || !blockId) return acc;
		const dataFile = app.metadataCache.getFirstLinkpathDest(linkPath, codeFile.path);
		if (dataFile instanceof TFile) acc.push({ file: dataFile, blockId: blockId });
		return acc;
	}, []);

	// delete the reference in each DATAFILE
	const errorMsgs: string[] = [];
	for (const { file, blockId } of referencedParasInDataFiles) {
		const errorMsg = await removeCodeFileRefInDataFile(app, codeFile, file, blockId);
		if (errorMsg) errorMsgs.push(errorMsg);
	}

	// CODEFILE: can simply be deleted
	await app.vault.trash(codeFile, true);

	// REPORT
	const successes = referencedParasInDataFiles.length - errorMsgs.length;
	let msg = `Code File "${codeFile.basename}" and ${successes} references to it deleted.\n`;
	if (errorMsgs.length > 0)
		msg +=
			`\n⚠️ ${errorMsgs.length} references could not be deleted:\n- ` + errorMsgs.join("\n- ");
	new Notice(msg, (5 + errorMsgs.length) * 1700);
}
