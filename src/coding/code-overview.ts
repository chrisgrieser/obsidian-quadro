import { TFile, TFolder } from "obsidian";
import Quadro from "src/main";
import { createCodeBlockFile } from "src/shared/utils";
import { countTimesCodeIsAssigned } from "./coding-utils";

export async function codeOverviewCommand(plugin: Quadro) {
	const label = plugin.codeblockLabels.codeOverview;
	const overviewName = "Code Overview";
	await createCodeBlockFile(plugin, label, overviewName);
}

//──────────────────────────────────────────────────────────────────────────────

function recurseCodeFolder(plugin: Quadro, folder: TFolder): string {
	const { app, settings } = plugin;

	// sort folders first
	const children = [...folder.children]; // cannot use structuralCopy, due to circular references
	children.sort((a, b) => {
		if (a instanceof TFolder && b instanceof TFile) return -1;
		if (a instanceof TFile && b instanceof TFolder) return 1;
		return a.name.localeCompare(b.name);
	});

	// recursively iterate children, if file: add code assignment count
	let text = "";
	for (const child of children) {
		if (child instanceof TFolder) {
			const tfolder = child;
			const hasCodeFiles = tfolder.children.some(
				(child) => child instanceof TFile && child.extension === "md",
			);
			if (!hasCodeFiles) continue; // excludes empty folder or attachments folders
			const childrenText = recurseCodeFolder(plugin, tfolder);
			text += `<li>📁 ${tfolder.name} ${childrenText}</li>`;
		} else if (child instanceof TFile) {
			const codeFile = child;
			const isTemplate = codeFile.path === settings.coding.folder + "/Template.md";
			const nonMarkdownFile = codeFile.extension !== "md";
			if (isTemplate || nonMarkdownFile) continue;

			const codeDesc = app.metadataCache.getFileCache(codeFile)?.frontmatter?.["code description"];
			const desc = codeDesc ? ": " + codeDesc : "";
			// `class="internal-link"` is needed for Obsidian to recognize it as clickable link
			const htmlLink = `<a href="${codeFile.path}" class="internal-link">${codeFile.basename}</a>`;
			const codeAssignedCount = countTimesCodeIsAssigned(plugin, codeFile);

			text += `<li>📄 ${htmlLink} (${codeAssignedCount}x)${desc}</li>`;
		}
	}
	return `<ul>${text}</ul>`;
}

export function processCodeOverviewCodeblock(plugin: Quadro): string {
	const { app, settings } = plugin;

	const codeFolder = app.vault.getFolderByPath(settings.coding.folder);
	if (!codeFolder) return `⚠️ Code folder "${settings.coding.folder}" not found.`;

	return recurseCodeFolder(plugin, codeFolder);
}
