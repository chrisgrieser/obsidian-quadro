import { App, FrontMatterCache, Notice, TFile, TFolder } from "obsidian";
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

// SOURCE https://discord.com/channels/686053708261228577/840286264964022302/1207053341989929070
export function moveCursorToFirstProperty(app: App, type: "key" | "value"): void {
	app.vault.setConfig("propertiesInDocument", "visible");
	const selector = `.workspace-leaf.mod-active .metadata-property:first-of-type .metadata-property-${type} :is([contenteditable='true'], input)`;
	const elem = activeDocument.querySelector(selector);
	if (!(elem instanceof HTMLElement)) return;

	if (elem instanceof HTMLInputElement) {
		elem.focus();
		// number types cannot be selected, thus temporarily convert to text
		if (elem.getAttribute("type") === "number") {
			elem.setAttribute("type", "text");
			elem.select(); // select all text in the field
			elem.setAttribute("type", "number");
		} else {
			elem.select();
		}
	} else {
		const range = activeDocument.createRange();
		const sel = window.getSelection();
		range.setStart(elem, 0);
		range.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(range);
	}
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

/** also ensures that extraction type array is not empty */
export function getAllExtractionTypes(plugin: Quadro): TFolder[] | undefined {
	const { app, settings } = plugin;
	const extFolder = app.vault.getFolderByPath(settings.extraction.folder);
	if (!extFolder) {
		new Notice("ERROR: Could not find Extraction Folder.", 4000);
		return;
	}
	const extractionTypes = extFolder.children.filter((ch) => ch instanceof TFolder) as TFolder[];
	if (extractionTypes.length === 0) {
		new Notice("ERROR: Could not find any Extraction Types.", 4000);
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
