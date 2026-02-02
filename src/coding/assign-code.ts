import { type Editor, Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import {
	codeFileDisplay,
	getAllCodeFiles,
	getCodesFilesInParagraphOfDatafile,
	getFullCode,
} from "src/coding/coding-utils";
import { createOneCodeFile } from "src/coding/create-new-code-file";
import type Quadro from "src/main";
import {
	insertblockIdInDatafile,
	prepareDatafileLineUpdate,
} from "src/shared/add-blockid-to-datafile";
import { ExtendedInputModal } from "src/shared/modals";
import { getActiveEditor } from "src/shared/utils";
import {
	activeFileHasInvalidName,
	ambiguousSelection,
	selHasHighlightMarkup,
	typeOfFile,
} from "src/shared/validation";

class CodeAssignmentModal extends ExtendedInputModal {
	private allCodeFiles: TFile[];
	private assignedPaths: Set<string>;
	private selectedCodes = new Map<string, TFile>();
	private resolveSelection?: (value: TFile[]) => void;
	private resolved = false;
	private listEl!: HTMLDivElement;
	private searchInput!: HTMLInputElement;
	private assignButton!: HTMLButtonElement;

	constructor(plugin: Quadro, _editor: Editor, _dataFile: TFile, alreadyAssigned: TFile[]) {
		super(plugin);
		this.assignedPaths = new Set(alreadyAssigned.map((code) => code.path));
		this.allCodeFiles = getAllCodeFiles(plugin).filter(
			(codeFile) => !this.assignedPaths.has(codeFile.path),
		);
	}

	openAndGetSelection(): Promise<TFile[]> {
		return new Promise((resolve) => {
			this.resolveSelection = resolve;
			this.open();
		});
	}

	override onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		const body = contentEl.createDiv({ cls: "quadro-modal__body" });
		body.createEl("h3", { text: "Assign codes" });

		const searchContainer = body.createDiv({ cls: "quadro-code-picker__search" });
		this.searchInput = searchContainer.createEl("input", {
			type: "search",
			placeholder: "Filter codes…",
		});
		this.searchInput.addEventListener("input", () => this.renderList());
		this.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				const first = this.getFilteredCodes()[0];
				if (first) this.toggleSelection(first);
			}
		});

		const actionRow = body.createDiv({
			cls: "quadro-modal__actions quadro-code-picker__actions",
		});
		const newCodeBtn = actionRow.createEl("button", { text: "Create new code" });
		newCodeBtn.addEventListener("click", () => {
			createOneCodeFile(this.plugin, (codeFile) => {
				this.allCodeFiles = [
					codeFile,
					...this.allCodeFiles.filter((c) => c.path !== codeFile.path),
				];
				this.toggleSelection(codeFile, true);
			});
		});

		this.assignButton = actionRow.createEl("button", { text: "Assign selected" });
		this.assignButton.classList.add("mod-cta");
		this.assignButton.disabled = true;
		this.assignButton.addEventListener("click", () => this.finish());

		this.listEl = body.createDiv({ cls: "quadro-code-picker__list" });
		this.renderList();

		this.searchInput.focus();
	}

	override onClose(): void {
		if (!this.resolved) this.resolveSelection?.([]);
		this.contentEl.empty();
	}

	private getFilteredCodes(): TFile[] {
		const query = this.searchInput.value.trim().toLowerCase();
		if (!query) return this.allCodeFiles;
		return this.allCodeFiles.filter((codeFile) => {
			const fullCode = getFullCode(this.plugin, codeFile).toLowerCase();
			const display = codeFileDisplay(this.plugin, codeFile).toLowerCase();
			return fullCode.includes(query) || display.includes(query);
		});
	}

	private renderList(): void {
		const previousScroll = this.listEl.scrollTop;
		this.listEl.empty();
		const filtered = this.getFilteredCodes();
		if (filtered.length === 0) {
			this.listEl.createDiv({
				cls: "quadro-code-picker__empty",
				text: "No codes match your search.",
			});
			this.listEl.scrollTop = previousScroll;
			return;
		}

		for (const codeFile of filtered) {
			const item = this.listEl.createDiv({ cls: "quadro-code-picker__item" });
			const checkbox = item.createEl("input", {
				attr: { type: "checkbox" },
			});
			checkbox.checked = this.selectedCodes.has(codeFile.path);
			checkbox.addEventListener("change", () =>
				this.toggleSelection(codeFile, checkbox.checked),
			);

			item.createSpan({ text: codeFileDisplay(this.plugin, codeFile) });

			item.addEventListener("click", (event) => {
				if ((event.target as HTMLElement).tagName === "INPUT") return;
				const selected = this.selectedCodes.has(codeFile.path);
				this.toggleSelection(codeFile, !selected);
				checkbox.checked = this.selectedCodes.has(codeFile.path);
			});

			if (this.selectedCodes.has(codeFile.path)) item.addClass("is-selected");
			else item.removeClass("is-selected");
		}

		this.updateAssignButton();
		this.listEl.scrollTop = previousScroll;
	}

	private toggleSelection(codeFile: TFile, explicit?: boolean): void {
		const shouldSelect = explicit ?? !this.selectedCodes.has(codeFile.path);
		if (shouldSelect) {
			this.selectedCodes.set(codeFile.path, codeFile);
		} else {
			this.selectedCodes.delete(codeFile.path);
		}

		this.updateAssignButton();
		this.renderList();
	}

	private updateAssignButton(): void {
		if (this.assignButton) this.assignButton.disabled = this.selectedCodes.size === 0;
	}

	private finish(): void {
		this.resolved = true;
		const selected = Array.from(this.selectedCodes.values());
		this.resolveSelection?.(selected);
		this.close();
	}
}

async function assignCodeToParagraph(
	plugin: Quadro,
	editor: Editor,
	dataFile: TFile,
	codeFile: TFile,
): Promise<void> {
	const fullCode = getFullCode(plugin, codeFile);

	const { blockId, lineWithoutId } = prepareDatafileLineUpdate(editor);
	insertblockIdInDatafile(editor, codeFile, fullCode, lineWithoutId, blockId);

	const textToAppend = `![[${dataFile.path.slice(0, -3)}#${blockId}]]\n`;
	await ensureTrailingNewlineAndAppend(plugin, codeFile, textToAppend);
	incrementProgress(plugin, "Code File", "assign");
}

async function ensureTrailingNewlineAndAppend(
	plugin: Quadro,
	file: TFile,
	text: string,
): Promise<void> {
	const { app } = plugin;
	const currentContent = await app.vault.read(file);

	let prefix = "";
	if (!currentContent.endsWith("\n")) prefix += "\n";

	const trimmed = currentContent.trimEnd();
	const needsBlankAfterFrontmatter =
		trimmed.endsWith("---") && !/---\n\s*\n$/.test(currentContent);
	if (needsBlankAfterFrontmatter) prefix += "\n";

	const cleanedText = text.replace(/^\n+/, "");
	await app.vault.append(file, prefix + cleanedText);
}

//──────────────────────────────────────────────────────────────────────────────

export async function assignCodeCommand(plugin: Quadro): Promise<void> {
	const { app } = plugin;
	const editor = getActiveEditor(app);

	// GUARD preconditions for coding
	const invalid =
		!editor ||
		ambiguousSelection(editor) ||
		selHasHighlightMarkup(editor) ||
		activeFileHasInvalidName(app);
	if (invalid) return;
	if (typeOfFile(plugin) !== "Data File") {
		new Notice("You must be in a Data File to assign a code.", 4000);
		return;
	}

	// Determine codes already assigned to paragraph, so they can be excluded
	// from the list of codes in the Suggester
	const dataFile = editor.editorComponent.view.file;
	if (!dataFile) {
		new Notice("No file open.", 4000);
		return;
	}
	const paragraphText = editor.getLine(editor.getCursor().line);
	const codesFilesInPara = getCodesFilesInParagraphOfDatafile(plugin, dataFile, paragraphText).map(
		(code) => code.tFile,
	);

	const modal = new CodeAssignmentModal(plugin, editor, dataFile, codesFilesInPara);
	const selectedCodes = await modal.openAndGetSelection();
	if (selectedCodes.length === 0) return;

	for (const codeFile of selectedCodes) {
		await assignCodeToParagraph(plugin, editor, dataFile, codeFile);
	}
}
