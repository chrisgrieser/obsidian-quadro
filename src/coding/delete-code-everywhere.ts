import { around } from "monkey-around";
import { App, Notice, TFile } from "obsidian";
import Quadro from "src/main";
import { currentlyInFolder, getActiveEditor } from "src/shared/utils";
import { DataFileReference, removeIndividualCodeRefFromDatafile } from "./unassign-code";

/** MONKEY-AROUND `app.vault.trash` to intercept attempts of the user to
 * delete files via native Obsidian methods. Check if the file is a CODE FILE,
 * and if so removed all referenced in DATA_FILES, before proceeding with the
 * original `app.vault.trash`. (The references cannot be deleted afterwards using
 * the `app.vault.on("delete", ...)` event, as various required information for
 * finding all references is flushed already.)
 * source for the how to monkey-around: https://discord.com/channels/686053708261228577/840286264964022302/1157501519831253002 */
export function trashWatcher(plugin: Quadro): ReturnType<typeof around> {
	const { app, settings } = plugin;

	const uninstaller = around(app.vault, {
		trash: (originalMethod) => {
			return async (file, useSystemTrash) => {
				const isCodeFile =
					file instanceof TFile &&
					file.path.startsWith(settings.coding.folder + "/") &&
					file.path.endsWith(".md");

				if (isCodeFile) {
					console.log(
						`"Intercepted deletion of "${file.name}", deleting all references to the Code File before proceeding with deletion.`,
					);
					await deleteReferencesToCodeFile(app, file);
				}

				await originalMethod.apply(app.vault, [file, useSystemTrash]);
			};
		},
	});
	return uninstaller;
}

/** Trigger deletion of references to CODEFILE via command. Convenience Command
 * for the user, so it is more transparent to them that they are not just
 * deleting the file, but also all references to it. */
export async function deleteCodeEverywhereCommand(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor) return;
	if (!currentlyInFolder(plugin, "Codes")) {
		new Notice("Must be in Code File to delete the code everywhere.");
		return;
	}

	const codeFile = editor.editorComponent.view.file;

	// due to our monkeying-around, `app.vault.trash` already triggers
	// `deleteReferencesToCodeFile`, so we don't need to call it again here
	await app.vault.trash(codeFile, true);
}

async function deleteReferencesToCodeFile(app: App, codeFile: TFile): Promise<void> {
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

	// REPORT
	const successes = referencedParasInDataFiles.length - errorMsgs.length;
	let msg = `Code File "${codeFile.basename}" and ${successes} references to it deleted.\n`;
	if (errorMsgs.length > 0)
		msg +=
			`\n⚠️ ${errorMsgs.length} references could not be deleted:\n- ` + errorMsgs.join("\n- ");
	new Notice(msg, (5 + errorMsgs.length) * 1700);
}
