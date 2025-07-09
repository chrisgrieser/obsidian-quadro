import { around } from "monkey-around";
import { Notice, TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import type Quadro from "src/main";
import { typeOfFile } from "src/shared/validation";

/** MONKEY-AROUND `app.vault.trash` to intercept attempts of the user to
 * delete files via native Obsidian methods. Check if the file is a CODE FILE,
 * and if so removed all referenced in DATA_FILES, before proceeding with the
 * original `app.vault.trash`. (The references cannot be deleted afterwards using
 * the `app.vault.on("delete", ...)` event, as various required information for
 * finding all references is flushed already.)
 * How to monkey-around: https://discord.com/channels/686053708261228577/840286264964022302/1157501519831253002 */
export function setupTrashWatcher(plugin: Quadro): ReturnType<typeof around> {
	const vault = plugin.app.vault;

	const uninstaller = around(vault, {
		trash: (originalMethod) => {
			return async (file, useSystemTrash): Promise<void> => {
				const filetype = typeOfFile(plugin, file);
				const isCodeOrExtractionFile =
					filetype === "Code File" || filetype === "Extraction File";

				if (isCodeOrExtractionFile && file instanceof TFile) {
					await removeAllFileRefs(plugin, file);
					incrementProgress(plugin, filetype, "delete");
				} else if (filetype === "Data File") {
					incrementProgress(plugin, filetype, "delete");
				}

				await originalMethod.apply(vault, [file, useSystemTrash]);
			};
		},
	});
	return uninstaller;
}

async function removeAllFileRefs(plugin: Quadro, refFile: TFile): Promise<void> {
	const app = plugin.app;
	let changedFilesCount = 0;
	let removedLinksCount = 0;

	// get all files that point to `refFile`
	const filesPointingToRefFile: string[] = [];
	for (const [filepath, links] of Object.entries(app.metadataCache.resolvedLinks)) {
		const targets = Object.keys(links);
		if (targets.includes(refFile.path)) filesPointingToRefFile.push(filepath);
	}
	const uniqueOutdatedFiles = [...new Set(filesPointingToRefFile)];

	// in each of those files, remove all links to `refFile`
	for (const filepath of uniqueOutdatedFiles) {
		const outdatedFile = app.vault.getFileByPath(filepath);
		if (!outdatedFile) continue;

		await app.vault.process(outdatedFile, (content) => {
			const outlinks = app.metadataCache.getFileCache(outdatedFile)?.links || [];
			const rangesToRemove: [number, number][] = [];
			for (const link of outlinks) {
				if (link.link !== refFile.basename && link.link !== refFile.path) continue;
				const { start, end } = link.position;
				rangesToRemove.push([start.offset, end.offset]);
			}

			rangesToRemove.sort((a, b) => b[0] - a[0]); // backwards so offsets do not shift
			for (let [start, end] of rangesToRemove) {
				if (content[end] === " ") end++; // don't leave a double space
				content = content.slice(0, start) + content.slice(end);
				removedLinksCount++;
			}
			return content;
		});
		changedFilesCount++;
	}

	// notify
	const s1 = removedLinksCount === 1 ? "" : "s";
	const s2 = changedFilesCount === 1 ? "" : "s";
	const hasHave = removedLinksCount === 1 ? "has" : "have";
	const msg = [
		"Quadro",
		`"${refFile.basename}" was deleted.`,
		"",
		`${removedLinksCount} reference${s1} in ${changedFilesCount} file${s2} ${hasHave} been removed.`,
	].join("\n");
	console.info(msg);
	new Notice(msg, 8000);
}
