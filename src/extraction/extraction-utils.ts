import {
	type App,
	type FrontMatterCache,
	MarkdownView,
	Notice,
	type TFile,
	TFolder,
	type WorkspaceTabs,
} from "obsidian";
import type Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { LIVE_PREVIEW } from "src/shared/utils";
import { typeOfFile } from "src/shared/validation";

export async function openExtractionInNewWin(plugin: Quadro, tfile: TFile): Promise<void> {
	const { app, settings } = plugin;
	const mode = settings.extraction.openingMode;

	const currentLeaf = app.workspace.getLeaf();
	if (mode === "tab") {
		const tabgroup = currentLeaf.parent as WorkspaceTabs;
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
		(newWin.parent as WorkspaceTabs).setDimension(2); // resize split to 66% width/height
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

export class SuggesterForExtractionTypes extends ExtendedFuzzySuggester<TFolder> {
	extractionTypes: TFolder[];
	callback: (selectedExtrType: TFolder) => void;

	constructor(plugin: Quadro, callback: (selectedExtrType: TFolder) => void) {
		super(plugin);
		this.extractionTypes = getAllExtractionTypes(plugin) as TFolder[];
		this.callback = callback;
		this.setPlaceholder("Select extraction type");
	}

	getItems(): TFolder[] {
		return this.extractionTypes.sort((a, b) => {
			const aCount = getExtractionsOfType(this.plugin, a).length;
			const bCount = getExtractionsOfType(this.plugin, b).length;
			return bCount - aCount;
		});
	}

	getItemText(extractionType: TFolder): string {
		const displayCount = this.plugin.settings.extraction.displayCount;
		if (!displayCount) return extractionType.name;

		const count = getExtractionsOfType(this.plugin, extractionType).length;
		return `${extractionType.name} (${count}x)`;
	}

	onChooseItem(extractionType: TFolder): void {
		this.callback(extractionType);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export function getExtractionFileDisplay(plugin: Quadro, extractionFile: TFile): string {
	const { app, settings } = plugin;
	const frontmatter = app.metadataCache.getFileCache(extractionFile)?.frontmatter;
	const displayProps = settings.extraction.displayProperty;
	if (!frontmatter || displayProps.length === 0) return extractionFile.basename;

	// count of extraction-sources
	const sourceCount = frontmatter?.["extraction-source"]?.length || 0;
	const displayCount = sourceCount > 1 ? `${sourceCount}x` : "";

	// use first existing property as display
	const displayKey = displayProps.find((key) => {
		const val = frontmatter[key];
		const keyExists = Array.isArray(val) ? val.length > 0 : val || val === 0;
		return keyExists;
	});

	if (!displayKey) return extractionFile.basename;

	let displayVal = frontmatter[displayKey];
	if (Array.isArray(displayVal)) displayVal = displayVal.join(", ");
	const displayProp = displayVal ? `${displayKey}: ${displayVal}` : "";

	const components = [extractionFile.basename, displayCount, displayProp].filter(Boolean);
	return components.join("  ⬩  ");
}

/** gets properties from Template.md of extraction type */
export function getPropertiesForExtractionType(
	app: App,
	extractionType: TFolder,
): FrontMatterCache | undefined {
	const templateFile = app.vault.getFileByPath(`${extractionType.path}/Template.md`);
	if (!templateFile) {
		new Notice(
			`ERROR: Could not find "Template.md" for Extraction Type "${extractionType.name}".`,
			0,
		);
		return;
	}
	const frontmatter = app.metadataCache.getFileCache(templateFile)?.frontmatter;
	if (!frontmatter) {
		new Notice(
			`ERROR: Properties of "Template.md" for Extraction Type "${extractionType.name}" are invalid.`,
			0,
		);
		return;
	}
	return frontmatter;
}

/** if extraction folder is missing, or has no valid extraction types, notifies
 * the user and returns undefined */
export function getAllExtractionTypes(plugin: Quadro): TFolder[] | undefined {
	const { app, settings } = plugin;

	const extFolder = app.vault.getFolderByPath(settings.extraction.folder);
	if (!extFolder) {
		new Notice("Error: could not find Extraction Folder.", 0);
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

export function getExtractionsOfType(plugin: Quadro, extractionType: TFolder): TFile[] {
	const extractionsMade = extractionType.children.filter(
		(file) => typeOfFile(plugin, file) === "Extraction File",
	) as TFile[];
	return extractionsMade;
}
