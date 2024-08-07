import { Notice } from "obsidian";
import Quadro from "src/main";
import { getActiveEditor, typeOfFile } from "src/shared/utils";

/** Trigger deletion of references to CODEFILE via command. Convenience Command
 * for the user, so it is more transparent to them that they are not just
 * deleting the file, but also all references to it. */
export async function deleteCodeEverywhereCommand(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const editor = getActiveEditor(app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("Must be in a Code File to delete the code everywhere.", 4000);
		return;
	}

	const codeFile = editor.editorComponent.view.file;

	// due to our monkeying-around, `app.vault.trash` already triggers
	// `deleteReferencesToCodeFile`, so we don't need to call it again here
	await app.vault.trash(codeFile, true);
}
