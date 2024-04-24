import { App, FrontMatterCache, MarkdownView, Notice, TFile, TFolder } from "obsidian";
import Quadro from "src/main";
import { LIVE_PREVIEW } from "src/shared/utils";

export async function openExtractionInNewWin(plugin: Quadro, tfile: TFile): Promise<void> {
	const { app, settings } = plugin;
	const mode = settings.extraction.openingMode;

	const currentLeaf = app.workspace.getLeaf();
	if (mode === "tab") {
		const tabgroup = currentLeaf.parent;
		const newTab = app.workspace.createLeafInParent(tabgroup, tabgroup.children.length);
		await newTab.openFile(tfile, LIVE_PREVIEW);
	} else {
		const direction1 = mode === "right-split" ? "right" : "bottom";
		const direction2 = mode === "right-split" ? "vertical" : "horizontal";

		// use existing leaf if it exists, otherwise create new one
		const newWin =
			app.workspace.getAdjacentLeafInDirection(currentLeaf, direction1) ||
			app.workspace.createLeafBySplit(currentLeaf, direction2, false);

		await newWin.openFile(tfile, LIVE_PREVIEW);
		newWin.parent.setDimension(2); // resize split to 66% width/height
	}
}

export function moveCursorToFirstProperty(app: App, type: "key" | "value"): void {
	app.vault.setConfig("propertiesInDocument", "visible");

	// HACK unclear what exactly causes the race condition, since previous
	// file opening is always awaited
	setTimeout(() => {
		const firstProperty =
			app.workspace.getActiveViewOfType(MarkdownView)?.metadataEditor.rendered[0];
		// TODO further debug which part is nulled https://discord.com/channels/686053708261228577/989603365606531104/1232745273680334888
		if (!firstProperty) return;
		const toFocus = type === "key" ? "focusKey" : "focusValue";
		firstProperty[toFocus]();
	}, 350);
}

//──────────────────────────────────────────────────────────────────────────────

/** gets properties from Template.md of extraction type */
export function getPropertiesForExtractionType(
	app: App,
	extractionType: TFolder,
): FrontMatterCache | undefined {
	const templateFile = app.vault.getFileByPath(`${extractionType.path}/Template.md`);
	if (!templateFile) {
		new Notice(
			`ERROR: Could not find "Template.md" for Extraction Type "${extractionType.name}".`,
			5000,
		);
		return;
	}
	const frontmatter = app.metadataCache.getFileCache(templateFile)?.frontmatter;
	if (!frontmatter) {
		new Notice(
			`ERROR: Properties of "Template.md" for Extraction Type "${extractionType.name}" are invalid.`,
			5000,
		);
		return;
	}
	return frontmatter;
}

/** if extraction folder is missing, or has no valid extraction types, notified
 * the user and returns undefined */
export function getAllExtractionTypes(plugin: Quadro): TFolder[] | undefined {
	const { app, settings } = plugin;

	const extFolder = app.vault.getFolderByPath(settings.extraction.folder);
	if (!extFolder) {
		new Notice("ERROR: Could not find Extraction Folder.", 4000);
		return;
	}

	const extractionTypes = extFolder.children.filter(
		(child) =>
			child instanceof TFolder &&
			child.children.find((grandchild) => grandchild.name === "Template.md"),
	) as TFolder[];
	if (extractionTypes.length === 0) {
		const msg = [
			"ERROR: Could not find any valid Extraction Types.",
			'Check that the extraction folder has subfolders, and that the subfolder has a "Template.md" file.',
			'You can also create a new extraction type with the command "Create new extraction type" or by pressing the button with the dashed box in the left sidebar.',
		].join("\n\n");
		new Notice(msg, 0);
		return;
	}

	return extractionTypes;
}

export function countExtractionsForType(extractionType: TFolder): number {
	const extractionsMade = extractionType.children.filter(
		(ch) => ch instanceof TFile && ch.extension === "md" && ch.name !== "Template.md",
	);
	return extractionsMade.length;
}
