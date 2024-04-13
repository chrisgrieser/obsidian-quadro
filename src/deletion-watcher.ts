import { around } from "monkey-around";
import { TFile } from "obsidian";
import { deleteReferencesToCodeFile } from "./coding/delete-code-everywhere";
import Quadro from "./main";
import { isSpecialFile } from "./shared/utils";

/** MONKEY-AROUND `app.vault.trash` to intercept attempts of the user to
 * delete files via native Obsidian methods. Check if the file is a CODE FILE,
 * and if so removed all referenced in DATA_FILES, before proceeding with the
 * original `app.vault.trash`. (The references cannot be deleted afterwards using
 * the `app.vault.on("delete", ...)` event, as various required information for
 * finding all references is flushed already.)
 * source for the how to monkey-around: https://discord.com/channels/686053708261228577/840286264964022302/1157501519831253002 */
export function setupTrashWatcher(plugin: Quadro): ReturnType<typeof around> {
	const { app } = plugin;

	const uninstaller = around(app.vault, {
		trash: (originalMethod) => {
			return async (file, useSystemTrash) => {
				const specialFile = isSpecialFile(plugin, file);
				const msg = `Intercepted deletion of "${file.name}", deleting all references to the ${specialFile} before proceeding with deletion.`;

				if (specialFile === "CodeFile") {
					console.info(msg);
					await deleteReferencesToCodeFile(app, file as TFile);
				} else if (specialFile === "ExtractionFile") {
					console.info(msg);
					await deleteReferencesToCodeFile(app, file as TFile);
				}

				await originalMethod.apply(app.vault, [file, useSystemTrash]);
			};
		},
	});
	return uninstaller;
}
