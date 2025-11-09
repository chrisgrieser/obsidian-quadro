import { type Editor, type EditorPosition, moment, type TFile } from "obsidian";
import { getFullParagraphScope, moveToLastLineOfParagraph } from "src/shared/utils";

// DOCS https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
export const BLOCKID_REGEX = /\^[\w-]+$/;

function orderPositions(a: EditorPosition, b: EditorPosition): { from: EditorPosition; to: EditorPosition } {
	if (a.line < b.line) return { from: a, to: b };
	if (a.line > b.line) return { from: b, to: a };
	if (a.ch <= b.ch) return { from: a, to: b };
	return { from: b, to: a };
}

export function selectionAlreadyHighlighted(editor: Editor): boolean {
	const selections = editor.listSelections();
	if (selections.length === 0) return false;
	const { anchor, head } = selections[0]!;
	if (anchor.line !== head.line) return false;

	const { from, to } = orderPositions(anchor, head);
	if (from.line !== to.line) return false;
	if (from.ch === to.ch) return false;

	const lineText = editor.getLine(from.line);
	const beforeStart = Math.max(0, from.ch - 2);
	const afterEnd = Math.min(lineText.length, to.ch + 2);
	const result = editor.getRange({ line: from.line, ch: beforeStart }, { line: to.line, ch: afterEnd });

	return result.includes("==");
}

export function prepareDatafileLineUpdate(editor: Editor): {
	blockId: string;
	lineWithoutId: string;
} {
	// 1. update line text with highlight markup (if selection)
	const selection = editor.getSelection();
	let highlightHandled = false;

	if (selection) {
		const [activeSelection] = editor.listSelections();
		if (activeSelection) {
			const { from, to } = orderPositions(activeSelection.anchor, activeSelection.head);
			if (from.line === to.line) {
				const lineIndex = from.line;
				const lineText = editor.getLine(lineIndex);
				const highlightStartMarker = lineText.indexOf("==");
				const highlightEndMarker =
					highlightStartMarker >= 0 ? lineText.indexOf("==", highlightStartMarker + 2) : -1;

				if (highlightStartMarker >= 0 && highlightEndMarker > highlightStartMarker) {
					const linePlain = lineText.replace(/==/g, "");
					const computePlainOffset = (ch: number): number =>
						editor.getRange({ line: lineIndex, ch: 0 }, { line: lineIndex, ch }).replace(/==/g, "")
							.length;

					const selectionStartPlain = computePlainOffset(from.ch);
					const selectionEndPlain = computePlainOffset(to.ch);

					const highlightStartPlain = lineText
						.slice(0, highlightStartMarker)
						.replace(/==/g, "")
						.length;
					const highlightLengthPlain = lineText
						.slice(highlightStartMarker + 2, highlightEndMarker)
						.replace(/==/g, "")
						.length;
					const highlightEndPlain = highlightStartPlain + highlightLengthPlain;

					if (
						selectionStartPlain >= highlightStartPlain &&
						selectionEndPlain <= highlightEndPlain
					) {
						highlightHandled = true;
					} else if (
						selectionStartPlain < highlightEndPlain &&
						selectionEndPlain > highlightStartPlain
					) {
						const newStartPlain = Math.min(selectionStartPlain, highlightStartPlain);
						const newEndPlain = Math.max(selectionEndPlain, highlightEndPlain);

						const beforePlain = linePlain.slice(0, newStartPlain);
						const highlightPlain = linePlain.slice(newStartPlain, newEndPlain);
						const afterPlain = linePlain.slice(newEndPlain);
						const newLine = `${beforePlain}==${highlightPlain}==${afterPlain}`;

						editor.setLine(lineIndex, newLine);
						editor.setCursor({
							line: lineIndex,
							ch: Math.min(beforePlain.length + highlightPlain.length + 2, newLine.length),
						});
						highlightHandled = true;
					}
				}
			}
		}
	}

	const paragraphScope = getFullParagraphScope(editor);
	const paragraphText = paragraphScope.lines.join("\n");

	if (selection && !highlightHandled && !selectionAlreadyHighlighted(editor) && !paragraphText.includes("==")) {
		// spaces need to be moved outside, otherwise they make the highlights invalid
		const highlightAdded = selection.replace(/^( ?)(.+?)( ?)$/g, "$1==$2==$3");
		editor.replaceSelection(highlightAdded);
	}

	// 2. move cursor to last line of paragraph
	// (This is relevant since when there are soft line breaks in a paragraph,
	// block-ids are only valid on the last line of the paragraph, see #12.)
	const lnum = moveToLastLineOfParagraph(editor);

	// 3. get existing blockID or generate new one
	const lineText = editor.getLine(lnum);
	const [blockIdOfLine] = lineText.match(BLOCKID_REGEX) || [];
	const blockId = blockIdOfLine || "^id-" + moment().format("YYYY-MM-DD--HH-mm-ss");
	const lineWithoutId = blockIdOfLine ? lineText.slice(0, -blockIdOfLine.length) : lineText;
	return { blockId: blockId, lineWithoutId: lineWithoutId.trim() };
}

/** assumes datafile is the file in the passed editor */
export function insertblockIdInDatafile(
	editor: Editor,
	referencedFile: TFile,
	labelForReferenceFile: string,
	lineWithoutId: string,
	blockId: string,
): void {
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) return;
	const app = editor.editorComponent.app;

	app.vault.setConfig("useMarkdownLinks", false); // ensure wikilinks
	const linkToReferencedFile = app.fileManager.generateMarkdownLink(
		referencedFile,
		dataFile.path,
		"",
		labelForReferenceFile,
	);
	const updatedLine = [lineWithoutId, linkToReferencedFile, blockId].join(" ");

	const cursor = editor.getCursor(); // `setLine` moves cursor, so we need to move it back
	editor.setLine(cursor.line, updatedLine);
	editor.setCursor(cursor);
}
