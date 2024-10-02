import { around } from "monkey-around";
import { TFile } from "obsidian";
import Quadro from "./main";
import { removeAllFileRefsFromDataFile } from "./shared/remove-file-from-datafile";
import { typeOfFile } from "./shared/utils";

/** MONKEY-AROUND `app.vault.trash` to intercept attempts of the user to
 * delete files via native Obsidian methods. Check if the file is a CODE FILE,
 * and if so removed all referenced in DATA_FILES, before proceeding with the
 * original `app.vault.trash`. (The references cannot be deleted afterwards using
 * the `app.vault.on("delete", ...)` event, as various required information for
 * finding all references is flushed already.)
 * source for the how to monkey-around: https://discord.com/channels/686053708261228577/840286264964022302/1157501519831253002 */
export function setupTrashWatcher(plugin: Quadro): ReturnType<typeof around> {
	const vault = plugin.app.vault;

	const uninstaller = around(vault, {
		trash: (originalMethod) => {
			return async (file, useSystemTrash): Promise<void> => {
				const filetype = typeOfFile(plugin, file);
				const isCodeOrExtractionFile =
					filetype === "Code File" || filetype === "Extraction File";

				if (isCodeOrExtractionFile && file instanceof TFile) {
					const msg = `Intercepted deletion of "${file.name}", deleting all references to the ${filetype} before proceeding with deletion.`;
					console.info(msg);
					await removeAllFileRefsFromDataFile(plugin, file);
				}

				await originalMethod.apply(vault, [file, useSystemTrash]);
			};
		},
	});
	return uninstaller;
}
