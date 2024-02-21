import { App, Editor, MarkdownView, Notice, OpenViewState, TFile } from "obsidian";
import { CODE_FOLDER_NAME, EXTRACTION_FOLDER_NAME } from "./settings";

export function currentlyInFolder(app: App, type: "Codes" | "Extractions"): boolean {
	const folderName = type === "Codes" ? CODE_FOLDER_NAME : EXTRACTION_FOLDER_NAME;
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) return false;
	const isInFolder = activeFile.path.startsWith(folderName + "/");
	return Boolean(isInFolder);
}

export function getFullCode(tFile: TFile): string {
	return tFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
}

/** if not there is no active markdown view, also display a notice */
export function safelyGetActiveEditor(app: App): Editor | null {
	// not using `app.workspace.activeEditor` to ignore canvases, tables, etc
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice("No active editor.");
		return null;
	}
	return view.editor;
}

export const SUGGESTER_INSTRUCTIONS = [
	{ command: "↑↓", purpose: "Navigate" },
	{ command: "⏎", purpose: "Select" },
	{ command: "esc", purpose: "Dismiss" },
];

//──────────────────────────────────────────────────────────────────────────────

export function moveCursorToFirstProperty(type: "key" | "value"): void {
	const selector = `.workspace-leaf.mod-active .metadata-property:first-of-type .metadata-property-${type} :is([contenteditable='true'], input)`;
	const firstProperty = document.querySelector(selector);

	// focus the field
	if (firstProperty instanceof HTMLElement) moveCursorToHthmlElement(firstProperty, 0);

	// select all text already in that field
	if (firstProperty instanceof HTMLInputElement) firstProperty.select();
}

// SOURCE https://discord.com/channels/686053708261228577/840286264964022302/1207053341989929070
function moveCursorToHthmlElement(elem: HTMLElement, pos: number): void {
	if (elem instanceof HTMLInputElement) {
		elem.focus();
		// number types cannot be selected, so convert to text
		const isNumber = elem.getAttribute("type") === "number";
		if (isNumber) elem.setAttribute("type", "text");
		elem.setSelectionRange(pos, pos);
		if (isNumber) elem.setAttribute("type", "number");
	} else {
		const range = document.createRange();
		const sel = window.getSelection();
		range.setStart(elem, pos);
		range.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(range);
	}
}

//──────────────────────────────────────────────────────────────────────────────

export const LIVE_PREVIEW: OpenViewState = { state: { source: false, mode: "source" } };

export async function openFileInSplitToRight(app: App, tfile: TFile): Promise<void> {
	const currentLeaf = app.workspace.getLeaf();

	// use existing leaf if it exists, otherwise create new one
	const leafToTheRight =
		app.workspace.getAdjacentLeafInDirection(currentLeaf, "right") ||
		app.workspace.createLeafBySplit(currentLeaf, "vertical", false);

	await leafToTheRight.openFile(tfile, LIVE_PREVIEW);
}

//──────────────────────────────────────────────────────────────────────────────

/** check if selection is unambiguous, ensuring that subsequent calls of
 * `getLine` or `getCursor` behave predictably */
export function ambiguousSelection(editor: Editor): boolean {
	const multilineSelection = editor.getCursor("head").line !== editor.getCursor("anchor").line;
	const multipleSelections = editor.listSelections().length > 1;
	if (multilineSelection || multipleSelections) {
		new Notice(
			"Paragraph not unambiguous since multiple lines are selected.\n\n" +
				"Unselect, move your cursor to the paragraph you want to affect, and use the command again.",
			5000,
		);
		return true;
	}
	return false;
}
