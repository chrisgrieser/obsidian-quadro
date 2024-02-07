// SOURCE example for a suggester from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal

import { SuggestModal } from "obsidian";
import type { App, Editor, TFile } from "obsidian";

// CONFIG values are hardcoded for now
const codeFolderName = "Codes";

type CodeFile = TFile & { codeCount: number };

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a unique id will be created. */
async function ensureBlockId(
	editor: Editor,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const blockIdOfLine = lineText.match(/\^\w+$/);
	if (blockIdOfLine) {
		const blockId = blockIdOfLine[0];
		const lineWithoutId = lineText.slice(0, -blockId.length);
		return { blockId: blockId, lineWithoutId: lineWithoutId };
	}

	const tfile = editor.editorComponent.view.file;
	const fullText: string = await this.app.vault.cachedRead(tfile);
	const blockIdsInText = fullText.match(/\^\w+(?=\n)/g);
	if (!blockIdsInText) return { blockId: "^id1", lineWithoutId: lineText };

	let counter = blockIdsInText ? blockIdsInText.length : 0;
	let newBlockId: string;

	// ensure blockId does not exist yet
	// (this can happen if user changed the id manually)
	do {
		counter++;
		newBlockId = "^id" + counter;
	} while (blockIdsInText.includes(newBlockId));

	return { blockId: newBlockId, lineWithoutId: lineText };
}

//──────────────────────────────────────────────────────────────────────────────

export class SuggesterForAddCode extends SuggestModal<CodeFile> {
	constructor(app: App, editor: Editor) {
		super(app);
		this.setPlaceholder("Select Code");
		// save reference to editor from `editorCallback`, so we do not need to
		// retrieve the editor manually
		this.editor = editor;
	}
	editor: Editor;

	//───────────────────────────────────────────────────────────────────────────

	async getSuggestions(query: string): Promise<CodeFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const matchingCodeFiles: TFile[] = allFiles.filter((tFile) => {
			const relPathInCodeFolder = tFile.path.slice(codeFolderName.length + 1);
			const matchesQuery = relPathInCodeFolder.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(codeFolderName + "/");
			return matchesQuery && isInCodeFolder;
		});

		// PERF reading the linecount of a file could have performance impact,
		// investigate later if this is a problem on larger vaults
		const codeFilesOrderedByCount: Promise<CodeFile[]> = Promise.all(
			matchingCodeFiles.map(async (tFile) => ({
				...tFile,
				codeCount: (await this.app.vault.cachedRead(tFile)).split("\n").length,
			})),
		).then((file) => file.sort((a, b) => b.codeCount - a.codeCount));
		return codeFilesOrderedByCount;
	}

	renderSuggestion(codeFile: CodeFile, el: HTMLElement) {
		const codeName = codeFile.path.slice(codeFolderName.length + 1, -3);
		el.createEl("div", { text: codeName });
		el.createEl("small", { text: `${codeFile.codeCount}x` });
	}

	async onChooseSuggestion(codeFile: CodeFile, _evt: MouseEvent | KeyboardEvent) {
		// DATA-FILE: Add blockID & link to Code-file in the current line
		const cursor = this.editor.getCursor();
		const selection = this.editor.getSelection();

		// Depending on the selection the user made, `replaceSelection` can result
		// in double-spaces, thus removing them
		if (selection) this.editor.replaceSelection(`==${selection.trim()}==`);
		const lineText = this.editor.getLine(cursor.line).trim().replace(/ {2,}/g, " ");

		const { blockId, lineWithoutId } = await ensureBlockId(this.editor, lineText);
		const updatedLine = `${lineWithoutId} [[${codeFile.basename}]] ${blockId}`;

		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// CODE-FILE: Append embedded block from Data-file
		const dataFileName = this.editor.editorComponent.view.file.basename;
		const textToAppend = `\n- [[${dataFileName}]] ![[${dataFileName}#${blockId}]]`;
		await this.app.vault.append(codeFile, textToAppend);
	}
}
