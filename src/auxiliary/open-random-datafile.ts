import { Notice } from "obsidian";
import Quadro from "src/main";

export async function openRandomUnreadDatafile(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const currentFile = plugin.app.workspace.getActiveFile()?.path || "";
	const targetKey = plugin.readKey;

	const files = app.vault.getMarkdownFiles().filter((f) => {
		const notCurrent = f.path !== currentFile;
		const frontmatterCache = app.metadataCache.getFileCache(f)?.frontmatter;
		const hasPropertyAndValue = frontmatterCache?.[targetKey] === false;
		return notCurrent && hasPropertyAndValue;
	});
	if (files.length === 0) {
		new Notice(`No notes in with "${targetKey}: false" found.`);
		return;
	}
	const randomIndex = Math.floor(Math.random() * files.length);
	const randomFile = files[randomIndex];
	await app.workspace.getLeaf().openFile(randomFile);
}
