import { Notice } from "obsidian";
import Quadro from "src/main";
import { READ_KEY } from "src/settings/constants";

export async function openRandomUnreadDatafile(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const currentFile = plugin.app.workspace.getActiveFile()?.path || "";

	const files = app.vault.getMarkdownFiles().filter((f) => {
		const notCurrent = f.path !== currentFile;
		const frontmatterCache = app.metadataCache.getFileCache(f)?.frontmatter;
		// check for `false`, so files without the property are not included
		const hasPropertyAndValue = frontmatterCache?.[READ_KEY] === false;
		return notCurrent && hasPropertyAndValue;
	});
	if (files.length === 0) {
		new Notice(`No notes in with "${READ_KEY}: false" found.`);
		return;
	}
	const randomIndex = Math.floor(Math.random() * files.length);
	const randomFile = files[randomIndex];
	await app.workspace.getLeaf().openFile(randomFile);
}
