// SOURCE example for a suggester from the obsidian dev docs
// https://docs.obsidian.md/Plugins/User+interface/Modals#Select+from+list+of+suggestions
// DOCS https://docs.obsidian.md/Reference/TypeScript+API/SuggestModal

import { Notice, SuggestModal } from "obsidian";
import type { App, Editor, TFile, Vault } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";

type CodeFile = TFile & { codeCount?: number };

class CreateCodeFileIntent {
	constructor(newName: string, vault: Vault) {
		this.intendedName = newName.replace(/\.md$/, "").replace(/\\:/g, "-");
		this.vault = vault;
	}
	intendedName: string;
	vault: Vault;

	async realize(): Promise<CodeFile> {
		const parts = this.intendedName.split("/");
		const name = parts.pop() || "Untitled Code";
		const subfolder = parts.join("/");

		const folder = subfolder ? CODE_FOLDER_NAME + "/" + subfolder : CODE_FOLDER_NAME;
		if (!this.vault.getAbstractFileByPath(folder)) await this.vault.createFolder(folder);

		const codeFile = await this.vault.create(`${folder}/${name}.md`, "");
		new Notice(`Created new code file: "${this.intendedName}"`);
		return codeFile;
	}
}

//──────────────────────────────────────────────────────────────────────────────

/** Given a line, returns the blockID and the line without the blockID. If the
 * blockID does not exist, a unique id will be created. */
async function ensureBlockId(
	file: TFile,
	lineText: string,
): Promise<{ blockId: string; lineWithoutId: string }> {
	const blockIdOfLine = lineText.match(/\^\w+$/);
	if (blockIdOfLine) {
		const blockId = blockIdOfLine[0];
		const lineWithoutId = lineText.slice(0, -blockId.length);
		return { blockId: blockId, lineWithoutId: lineWithoutId };
	}

	const fullText: string = await this.app.vault.cachedRead(file);
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

export class SuggesterForAddCode extends SuggestModal<CodeFile | CreateCodeFileIntent> {
	constructor(app: App, editor: Editor) {
		super(app);
		this.setPlaceholder("Select Code");
		// save reference to editor from `editorCallback`, so we do not need to
		// retrieve the editor manually
		this.editor = editor;
	}
	editor: Editor;

	//───────────────────────────────────────────────────────────────────────────

	async getSuggestions(query: string): Promise<(CodeFile | CreateCodeFileIntent)[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const matchingCodeFiles: TFile[] = allFiles.filter((tFile) => {
			const relPathInCodeFolder = tFile.path.slice(CODE_FOLDER_NAME.length + 1);
			const matchesQuery = relPathInCodeFolder.toLowerCase().includes(query.toLowerCase());
			const isInCodeFolder = tFile.path.startsWith(CODE_FOLDER_NAME + "/");
			return matchesQuery && isInCodeFolder;
		});

		// when no matching code found, suggest creation of new code with query
		if (!matchingCodeFiles.length) return [new CreateCodeFileIntent(query, this.app.vault)];

		// PERF reading the linecount of a file could have performance impact,
		// investigate later if this is a problem on larger vaults
		const codeFilesOrderedByCount: Promise<CodeFile[]> = Promise.all(
			matchingCodeFiles.map(async (tFile) => {
				const content = await this.app.vault.cachedRead(tFile);
				return {
					...tFile,
					codeCount: content ? content.split("\n").length - 1 : 0,
				};
			}),
		).then((file) => file.sort((a, b) => b.codeCount - a.codeCount));
		return codeFilesOrderedByCount;
	}

	renderSuggestion(item: CodeFile | CreateCodeFileIntent, el: HTMLElement) {
		if (item instanceof CreateCodeFileIntent) {
			el.createEl("div", { text: `Create new code file: "${item.intendedName}"` });
		} else {
			const codeName = item.path.slice(CODE_FOLDER_NAME.length + 1, -3);
			el.createEl("div", { text: codeName });
			el.createEl("small", { text: `${item.codeCount}x` });
		}
	}

	async onChooseSuggestion(userChoice: CodeFile | CreateCodeFileIntent) {
		const codeFile: CodeFile =
			userChoice instanceof CreateCodeFileIntent ? await userChoice.realize() : userChoice;

		// DATA-FILE: Add blockID & link to Code-file in the current line
		const cursor = this.editor.getCursor();
		const selection = this.editor.getSelection();

		// Depending on the selection the user made, `replaceSelection` can result
		// in double-spaces, thus removing them
		if (selection) this.editor.replaceSelection(`==${selection.trim()}==`);
		const lineText = this.editor.getLine(cursor.line).trim().replace(/ {2,}/g, " ");

		const dataTFile = this.editor.editorComponent.view.file;
		const { blockId, lineWithoutId } = await ensureBlockId(dataTFile, lineText);
		const updatedLine = `${lineWithoutId} [[${codeFile.basename}]] ${blockId}`;

		this.editor.setLine(cursor.line, updatedLine);
		this.editor.setCursor(cursor); // `setLine` moves cursor, so we need to move it back

		// CODE-FILE: Append embedded block from Data-file
		const dataFileName = this.editor.editorComponent.view.file.basename;
		const textToAppend = `- [[${dataFileName}]] ![[${dataFileName}#${blockId}]]\n`;

		// HACK https://discord.com/channels/686053708261228577/840286264964022302/1204750762823913472
		try {
			await this.app.vault.append(codeFile, textToAppend);
		} catch (error) {
			console.warn(error);
		}
	}
}
