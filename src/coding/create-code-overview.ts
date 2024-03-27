import { Notice, TFile, TFolder, normalizePath } from "obsidian";
import Quadro from "src/main";
import { countTimesCodeIsAssigned } from "./coding-utils";

function recurseCodeFolder(
	plugin: Quadro,
	folder: TFolder, // current iteration
	outputPath: string, // only required for markdownLink-generation
	currentDepth = 0, // used to calculate indentation
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
			accOutput.push(indent + "- 📁 " + tfolder.name);
			accOutput = recurseCodeFolder(plugin, tfolder, outputPath, currentDepth + 1, accOutput);
		} else if (child instanceof TFile) {
			const tfile = child;
			const isTemplate = tfile.path === settings.coding.folder + "/Template.md";
			if (isTemplate) continue;

			const wikiLink = app.fileManager.generateMarkdownLink(tfile, outputPath, "", tfile.basename);
			const codeAssignedCount = countTimesCodeIsAssigned(plugin, tfile);
			accOutput.push(`${indent}- 📄 ${wikiLink} (${codeAssignedCount}x)`);
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
	const output = ["---", "last update: " + isoDate, "---", "", ...outputLines].join("\n");

	// create/update overview file
	let outputFile = app.vault.getFileByPath(outputPath);
	if (outputFile) {
		app.vault.modify(outputFile, output);
	} else {
		outputFile = await app.vault.create(outputPath, output);
	}
	app.workspace.getLeaf().openFile(outputFile);
}
