import { App, Notice, TAbstractFile, TFile } from "obsidian";
import { CODE_FOLDER_NAME } from "src/settings";
import { currentlyInFolder, safelyGetActiveEditor } from "src/utils";
import { DataFileReference, removeIndividualCodeRefFromDatafile } from "./unassign-code";

let deletionViaWatcher = false;

/** When the user deletes a CODE FILE without the "Delete Code Everywhere"
 * command, try to restore the file temporarily to delete it via this plugin's
 * method to ensure that references to it are correctly deleted. (This could be
 * solved in a much cleaner way if Obsidian had an pre-delete event.) */
export async function fileDeletionWatcher(app: App, file: TAbstractFile): Promise<void> {
	// GUARD
	if (!(file instanceof TFile)) return;
	if (!file.path.startsWith(CODE_FOLDER_NAME + "/")) return;
	if (deletionViaWatcher) return;

	if (app.vault.config.trashOption !== "local") {
		const msg =
			'Code Files should be deleted via the "Delete Code Everywhere" command ' +
			"to ensure that references to it are correctly deleted as well.\n\n" +
			"Please restore the file and delete it again with that command, or " +
			'set the trash location to "local" in your Obsidian config to have Quadro' +
			"automantically handle deletions.";
		new Notice(msg, 15000);
		return;
	}

	// undelete
	const pathInTrash = ".trash/" + file.name;
	if (!(await app.vault.adapter.exists(pathInTrash))) {
		const msg =
			"Could not remove references to the Code File.\n\n" +
			'Please restore the file use the "Delete Code Everywhere" command.';
		new Notice(msg, 7000);
		return;
	}
	await app.vault.adapter.rename(pathInTrash, file.path); // adapter, since file isn't in vault anymore

	// INFO Timeout necessary to ensure metadata cache is restored – cleaner
	// solution would be to use the metadata-resolved event, but haven't found a
	// way to trigger it only once.
	setTimeout(async () => {
		deletionViaWatcher = true; // prevent recursive trigger of this function
		await deleteCodeEverywhere(app, file);
		deletionViaWatcher = false;
	}, 1000);
}

export async function deleteCodeEverywhereCommand(app: App): Promise<void> {
	const editor = safelyGetActiveEditor(app);
	if (!editor) return;
	if (!currentlyInFolder(app, "Codes")) {
		new Notice("Must be in Code File to delete the code everywhere.");
		return;
	}

	const codeFile = editor.editorComponent.view.file;
	deleteCodeEverywhere(app, codeFile);
}

async function deleteCodeEverywhere(app: App, codeFile: TFile): Promise<void> {
	// determine all DATAFILES that are referenced in CODEFILE, and their blockID
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
		const errorMsg = await removeIndividualCodeRefFromDatafile(app, codeFile, file, blockId);
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
