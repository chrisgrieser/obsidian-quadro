import { Modal, type Editor, Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import {
	type Code,
	codeFileDisplay,
	getCodesFilesInParagraphOfDatafile,
} from "src/coding/coding-utils";
import type Quadro from "src/main";
import { BLOCKID_REGEX } from "src/shared/add-blockid-to-datafile";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import {
	getActiveEditor,
	getFullParagraphScope,
	getParagraphRangeFromLines,
	moveToLastLineOfParagraph,
	WIKILINK_REGEX,
} from "src/shared/utils";
import { typeOfFile } from "src/shared/validation";

//──────────────────────────────────────────────────────────────────────────────

/** suggester used when more than one code is assigned to the paragraph */
class SuggesterForCodeToUnassign extends ExtendedFuzzySuggester<Code> {
	codesInParagraph: Code[];
	dataFile: TFile;
	editor: Editor;

	constructor(plugin: Quadro, editor: Editor, dataFile: TFile, codes: Code[]) {
		super(plugin);
		this.codesInParagraph = codes;
		this.dataFile = dataFile;
		this.editor = editor;
		this.plugin = plugin;

		this.setPlaceholder("Select code to remove from paragraph");
	}

	getItems(): Code[] {
		return this.codesInParagraph;
	}
	getItemText(code: Code): string {
		return codeFileDisplay(this.plugin, code.tFile);
	}
	async onChooseItem(code: Code): Promise<void> {
		await unassignCodeWhileInDataFile(this.plugin, this.editor, this.dataFile, code);
	}
}

//──────────────────────────────────────────────────────────────────────────────

class ConfirmHighlightRemovalModal extends Modal {
	private resolveDecision: (value: boolean) => void;
	private resolved = false;
	private message: string;
	private plugin: Quadro;

	constructor(plugin: Quadro, message: string, resolve: (value: boolean) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.message = message;
		this.resolveDecision = resolve;
	}

	override onOpen(): void {
		const { contentEl } = this;
		this.modalEl.addClass(this.plugin.cssclass);
		contentEl.empty();
		const body = contentEl.createDiv({ cls: "quadro-modal__body" });
		body.createEl("p", { text: this.message });

		const buttons = body.createDiv({ cls: "quadro-modal__actions" });

		const removeBtn = buttons.createEl("button", { text: "Remove highlight" });
		removeBtn.addClass("mod-cta");
		removeBtn.addEventListener("click", () => {
			this.resolved = true;
			this.resolveDecision(true);
			this.close();
		});

		const keepBtn = buttons.createEl("button", { text: "Keep highlight" });
		keepBtn.addEventListener("click", () => {
			this.resolved = true;
			this.resolveDecision(false);
			this.close();
		});
	}

	override onClose(): void {
		if (!this.resolved) this.resolveDecision(false);
		this.contentEl.empty();
	}
}

async function promptToRemoveHighlight(plugin: Quadro, dataFile: TFile): Promise<boolean> {
	const message = `No codes remain for this paragraph in "${dataFile.basename}". Remove the highlight?`;
	return await new Promise<boolean>((resolve) => {
		new ConfirmHighlightRemovalModal(plugin, message, resolve).open();
	});
}

const LINK_CLEANUP_SPACES = /\s+\^/;

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeCodeLinkFromLine(line: string, wikilink: string): string {
	const pattern = new RegExp(`\\s*${escapeRegExp(wikilink)}\\s*`);
	let updated = line.replace(pattern, " ");
	updated = updated.replace(LINK_CLEANUP_SPACES, " ^");
	return updated.replace(/\s{2,}/g, " ").trimEnd();
}

function removeBlockIdFromLine(line: string, blockId: string): string {
	const pattern = new RegExp(`\\s*${escapeRegExp(blockId)}$`);
	return line.replace(pattern, "").trimEnd();
}

function removeHighlightMarkers(text: string): string {
	return text.replace(/==/g, "");
}

function removeHighlightFromEditorParagraph(editor: Editor, start: number, end: number): void {
	for (let idx = start; idx <= end; idx++) {
		const updated = removeHighlightMarkers(editor.getLine(idx));
		editor.setLine(idx, updated);
	}
}

function removeHighlightFromLines(lines: string[], start: number, end: number): void {
	for (let idx = start; idx <= end; idx++) {
		lines[idx] = removeHighlightMarkers(lines[idx] ?? "");
	}
}

async function unassignCodeWhileInDataFile(
	plugin: Quadro,
	editor: Editor,
	dataFile: TFile,
	code: Code,
): Promise<void> {
	const app = plugin.app;
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);

	// GUARD no blockid
	const [blockId] = lineText.match(BLOCKID_REGEX) || [];
	if (!blockId) {
		new Notice("Cannot unassign code: no ID found at current line.", 0);
		return;
	}

	// 1. remove link from DATAFILE
	let updatedLine = removeCodeLinkFromLine(lineText, code.wikilink);
	const remainingCodes = getCodesFilesInParagraphOfDatafile(plugin, dataFile, updatedLine);
	const noCodesRemain = remainingCodes.length === 0;
	if (noCodesRemain) updatedLine = removeBlockIdFromLine(updatedLine, blockId);
	editor.setLine(cursor.line, updatedLine);
	cursor.ch = Math.max(Math.min(updatedLine.length, cursor.ch), 0);
	editor.setCursor(cursor); // restore cursor position

	// optional highlight removal
	if (noCodesRemain) {
		const paragraphScope = getFullParagraphScope(editor);
		const paragraphHasHighlight = paragraphScope.lines.some((line) => line.includes("=="));
		if (paragraphHasHighlight) {
			const shouldRemoveHighlight = await promptToRemoveHighlight(plugin, dataFile);
			if (shouldRemoveHighlight) {
				removeHighlightFromEditorParagraph(editor, paragraphScope.start, paragraphScope.end);
				const newCursorLine = Math.min(cursor.line, editor.lineCount() - 1);
				const newCursorLineText = editor.getLine(newCursorLine);
				const newCursorCh = Math.min(newCursorLineText.length, cursor.ch);
				editor.setCursor({ line: newCursorLine, ch: newCursorCh });
			}
		}
	}

	// 2. remove link from CODEFILE
	app.vault.process(code.tFile, (content) => {
		// search for reference line in Codefile
		const codeFileLines = content.split("\n");
		const refInCodeFile = codeFileLines.findIndex((line) => {
			if (!line.includes(blockId)) return false;
			const linksInLine = line.match(new RegExp(WIKILINK_REGEX, "g")) || [];
			for (const wikilink of linksInLine) {
				const [_, innerlink] = wikilink.match(WIKILINK_REGEX) || [];
				if (!innerlink) continue;
				const linkedFile = app.metadataCache.getFirstLinkpathDest(innerlink, code.tFile.path);
				if (linkedFile?.path === dataFile.path) return true;
			}
			return false;
		});

		// GUARD
		if (refInCodeFile < 0) {
			const msg =
				`"Code File "${code.tFile.basename}" contains no reference to ` +
				`Data File "${dataFile.basename}" with the ID "${blockId}". ` +
				"Reference in Code File is thus not deleted.";
			new Notice(msg, 0);
			return content; // unmodified
		}

		// remove reference line from CODEFILE
		const hasNext = refInCodeFile + 1 < codeFileLines.length;
		if (hasNext && codeFileLines[refInCodeFile + 1]?.trim() === "") {
			codeFileLines.splice(refInCodeFile, 2);
		} else {
			codeFileLines.splice(refInCodeFile, 1);
		}
		content = codeFileLines.join("\n");
		return content;
	});

	new Notice(`Assignment of code "${code.tFile.basename}" removed.`, 3500);
	incrementProgress(plugin, "Code File", "unassign");
}

//──────────────────────────────────────────────────────────────────────────────

/** Unassigning code has to deal with 3 scenarios (disregarding invalid cases):
 * A CODEFILE -> determine datafile and code to remove from code file reference
 * B1 DATAFILE, line has 1 code -> remove code, and its reference from code file
 * B2 DATAFILE, line has 2+ codes -> prompt user which code to remove, then same as 2.
 */
export async function unassignCodeCommand(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const editor = getActiveEditor(app);

	// GUARD
	if (!editor) return;
	const fileType = typeOfFile(plugin);

	if (fileType === "Code File") {
		const codeFile = editor.editorComponent.view.file;
		if (!codeFile) {
			new Notice("No file open.", 4000);
			return;
		}
		await unassignCodeWhileInCodeFile(plugin, editor, codeFile);
		return;
	}

	if (fileType !== "Data File") {
		new Notice("You must be in a Data or Code File to unassign a code.", 4000);
		return;
	}

	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) {
		new Notice("No file open.", 4000);
		return;
	}

	const lnum = moveToLastLineOfParagraph(editor); // to remove from multiline paragraphs, see #15
	const lineText = editor.getLine(lnum);
	const codesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, lineText);

	if (codesInPara.length === 0) {
		new Notice("Line does not contain any codes to remove.", 3500);
	} else if (codesInPara.length === 1) {
		await unassignCodeWhileInDataFile(plugin, editor, dataFile, codesInPara[0] as Code);
	} else {
		new SuggesterForCodeToUnassign(plugin, editor, dataFile, codesInPara).open();
	}
}

async function unassignCodeWhileInCodeFile(plugin: Quadro, editor: Editor, codeFile: TFile): Promise<void> {
	const { app } = plugin;
	const cursor = editor.getCursor();
	const lineNumber = cursor.line;
	const lineText = editor.getLine(lineNumber);
	const match = lineText.match(WIKILINK_REGEX);

	if (!match) {
		new Notice("Current line does not reference a data paragraph.", 3500);
		return;
	}

	const [, target, suffix] = match;
	const blockId =
		suffix?.match(/\^[\w-]+/)?.[0] ??
		lineText.match(BLOCKID_REGEX)?.[0];
	if (!blockId) {
		new Notice("No paragraph ID detected in the selected reference.", 3500);
		return;
	}

	const dataFile = app.metadataCache.getFirstLinkpathDest(target, codeFile.path);
	if (!dataFile || typeOfFile(plugin, dataFile) !== "Data File") {
		new Notice("Referenced paragraph no longer resolves to a data file.", 0);
		return;
	}

	const originalContent = await app.vault.read(dataFile);
	const lines = originalContent.split("\n");
	const lineIdx = lines.findIndex((line) => line.includes(blockId));
	if (lineIdx < 0) {
		new Notice(`No paragraph with ID "${blockId}" found in "${dataFile.basename}".`, 0);
		return;
	}

	const paragraphRange = getParagraphRangeFromLines(lines, lineIdx);
	const paragraphText = lines.slice(paragraphRange.start, paragraphRange.end + 1).join("\n");
	const codes = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText);
	const code = codes.find((item) => item.tFile.path === codeFile.path);
	if (!code) {
		new Notice(`Paragraph does not reference "${codeFile.basename}" anymore.`, 0);
		return;
	}

	lines[lineIdx] = removeCodeLinkFromLine(lines[lineIdx], code.wikilink);
	const updatedParagraphLines = lines.slice(paragraphRange.start, paragraphRange.end + 1);
	updatedParagraphLines[lineIdx - paragraphRange.start] = lines[lineIdx];
	const updatedParagraphText = updatedParagraphLines.join("\n");
	const remainingCodes = getCodesFilesInParagraphOfDatafile(plugin, dataFile, updatedParagraphText);

	const noCodesRemain = remainingCodes.length === 0;
	if (noCodesRemain) {
		lines[lineIdx] = removeBlockIdFromLine(lines[lineIdx], blockId);
		updatedParagraphLines[lineIdx - paragraphRange.start] = lines[lineIdx];
	}

	let shouldRemoveHighlight = false;
	const paragraphHasHighlight = updatedParagraphLines.some((line) => line.includes("=="));
	if (paragraphHasHighlight && noCodesRemain) {
		shouldRemoveHighlight = await promptToRemoveHighlight(plugin, dataFile);
		if (shouldRemoveHighlight) removeHighlightFromLines(lines, paragraphRange.start, paragraphRange.end);
	}

	const newContent = lines.join("\n");
	if (newContent !== originalContent) await app.vault.modify(dataFile, newContent);

	const from = { line: lineNumber, ch: 0 };
	const hasNext = lineNumber + 1 < editor.lineCount();
	const to = hasNext ? { line: lineNumber + 1, ch: 0 } : { line: lineNumber, ch: lineText.length };
	editor.replaceRange("", from, to);
	editor.setCursor({ line: Math.min(lineNumber, editor.lineCount() - 1), ch: 0 });

	new Notice(`Assignment of code "${codeFile.basename}" removed.`, 3500);
	incrementProgress(plugin, "Code File", "unassign");
}
