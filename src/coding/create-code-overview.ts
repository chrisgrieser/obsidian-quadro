import { Notice, TFile, TFolder, normalizePath } from "obsidian";
import Quadro from "src/main";
import { countTimesCodeIsAssigned } from "./coding-utils";

/**
 * @param plugin - plugin instance
 * @param folder - currently iterated folder
 * @param outputPath - path of overview file, needed for markdown-link-generation
 * @param currentDepth - used to calculate indentation
 * @param accOutput - accumulator
 * @returns updated `accOutput`
 */
function recurseCodeFolder(
	plugin: Quadro,
	folder: TFolder,
	outputPath: string,
	currentDepth = 0,
	accOutput: string[] = [],
): string[] {
	const { app, settings } = plugin;

	// sort folders first
	const children = [...folder.children]; // cannot use structuralCopy, due to circular references
	children.sort((a, b) => {
		if (a instanceof TFolder && b instanceof TFile) return -1;
		if (a instanceof TFile && b instanceof TFolder) return 1;
		return a.name.localeCompare(b.name);
	});

	// recursively iterate children, if file add code assignment count
	for (const child of children) {
		const indent = "\t".repeat(currentDepth);
		if (child instanceof TFolder) {
			const tfolder = child;
			const hasCodeFiles = tfolder.children.some(
				(child) => child instanceof TFile && child.extension === "md",
			);
			if (!hasCodeFiles) continue; // excludes empty folder or attachments folders
			const lineText = indent + "- " + tfolder.name;
			accOutput.push(lineText);
			accOutput = recurseCodeFolder(plugin, tfolder, outputPath, currentDepth + 1, accOutput);
		} else if (child instanceof TFile) {
			const codeFile = child;
			const isTemplate = codeFile.path === settings.coding.folder + "/Template.md";
			const nonMarkdownFile = codeFile.extension !== "md";
			if (isTemplate || nonMarkdownFile) continue;

			const codeDesc = app.metadataCache.getFileCache(codeFile)?.frontmatter?.["code description"];
			const desc = codeDesc ? ": " + codeDesc : "";
			const codeAssignedCount = countTimesCodeIsAssigned(plugin, codeFile);
			const wikiLink = app.fileManager.generateMarkdownLink(
				codeFile,
				outputPath,
				"",
				`${codeFile.basename}`,
			);

			const lineText = `${indent}- 📄 ${wikiLink} (${codeAssignedCount}x)${desc}`;
			accOutput.push(lineText);
		}
	}
	return accOutput;
}

//──────────────────────────────────────────────────────────────────────────────

export async function createOverviewOfCodesCommand(plugin: Quadro) {
	const { app, settings } = plugin;
	const codeFolder = app.vault.getFolderByPath(settings.coding.folder);
	if (!codeFolder) {
		new Notice("Code Folder not found.");
		return;
	}
	const outputPath = normalizePath(settings.analysis.folder + "/Code Overview.md");

	// compile output
	app.metadataTypeManager.setType("last update", "datetime");
	const isoDate = new Date().toISOString().slice(0, -5); // slice get Obsidian's date format
	const outputLines = recurseCodeFolder(plugin, codeFolder, outputPath);
	const output = [
		"---",
		"last update: " + isoDate,
		"---",
		"",
		"> [!INFO]",
		"> This file is auto-generated. Manual edits will be overwritten the next time the command is run.",
		"",
		...outputLines,
	].join("\n");

	// create/update overview file
	let outputFile = app.vault.getFileByPath(outputPath);
	if (outputFile) {
		app.vault.modify(outputFile, output);
	} else {
		outputFile = await app.vault.create(outputPath, output);
	}
	app.workspace.getLeaf().openFile(outputFile);
}
