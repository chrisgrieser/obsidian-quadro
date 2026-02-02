import { MarkdownRenderer, Modal, Notice, type TFile } from "obsidian";
import { incrementProgress } from "src/auxiliary/progress-tracker";
import {
	getAllCodeFiles,
	getCodesFilesInParagraphOfDatafile,
	getFullCode,
} from "src/coding/coding-utils";
import { createOneCodeFile } from "src/coding/create-new-code-file";
import type Quadro from "src/main";
import { ExtendedFuzzySuggester } from "src/shared/modals";
import { getActiveEditor } from "src/shared/utils";
import { typeOfFile } from "src/shared/validation";

const MAX_PARAGRAPH_LINES = 8;
const MAX_PREVIEW_CHARS = 400;

type CodeFileItem = TFile | "new-code-file";

class TargetCodeSuggester extends ExtendedFuzzySuggester<CodeFileItem> {
	constructor(plugin: Quadro) {
		super(plugin);

		this.setPlaceholder("Selecciona el código destino");
		this.setInstructions([
			...this.hotkeyInstructions,
			{ command: "shift ⏎", purpose: "Crear nuevo código" },
		]);

		this.scope.register(["Shift"], "Enter", (event: KeyboardEvent) => {
			if (event.isComposing) return;
			event.preventDefault();
			this.close();
			this.onChooseItem("new-code-file", event);
		});
	}

	override onChooseItem(_item: CodeFileItem, _evt: MouseEvent | KeyboardEvent): void {
		// Default no-op; pickTargetCode() assigns the real handler.
	}

	getItems(): CodeFileItem[] {
		return [...getAllCodeFiles(this.plugin), "new-code-file"];
	}

	getItemText(item: CodeFileItem): string {
		if (item === "new-code-file") return "⭑ Crear nuevo código";
		return getFullCode(this.plugin, item);
	}
}

interface EmbedReference {
	lineIndex: number;
	lineText: string;
	dataFile: TFile;
	blockId: string;
	embedText: string;
	preview: string;
}

class EmbedMultiSelectModal extends Modal {
	plugin: Quadro;
	embeds: EmbedReference[];
	onSubmit: (selected: EmbedReference[]) => void;
	private selectedIndices = new Set<number>();
	private resolved = false;

	constructor(
		plugin: Quadro,
		embeds: EmbedReference[],
		onSubmit: (selected: EmbedReference[]) => void,
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.embeds = embeds;
		this.onSubmit = onSubmit;
		this.modalEl.addClass(plugin.cssclass);
	}

	override onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h4", { text: "Selecciona embeds para mover" });
		contentEl.createEl("p", {
			text: "Marca los embeds que deban pasar al nuevo código y luego confirma. Puedes revisar el texto completo antes de decidir.",
		});

		for (const [index, embed] of this.embeds.entries()) {
			const option = contentEl.createDiv({ cls: "quadro-split-option" });

			const checkbox = option.createEl("input", {
				attr: { type: "checkbox" },
			});
			checkbox.addClass("quadro-split-option__checkbox");
			checkbox.addEventListener("change", (event: Event) => {
				const target = event.currentTarget as HTMLInputElement;
				if (target.checked) this.selectedIndices.add(index);
				else this.selectedIndices.delete(index);
			});

			const body = option.createDiv({ cls: "quadro-split-option__body" });
			body.createEl("strong", { text: embed.dataFile.basename });
			body.createEl("small", { text: embed.dataFile.path });

			const snippetEl = body.createDiv({ cls: "quadro-split-option__snippet" });
			const preview = embed.preview || embed.lineText || "(línea vacía)";
			MarkdownRenderer.renderMarkdown(preview, snippetEl, embed.dataFile.path, this.plugin);
		}

		const buttons = contentEl.createDiv({ cls: "quadro-split-buttons" });
		const confirmBtn = buttons.createEl("button", {
			text: "Mover seleccionados",
		});
		confirmBtn.classList.add("mod-cta");
		confirmBtn.addEventListener("click", () => {
			this.resolved = true;
			this.onSubmit(this.embeds.filter((_, idx) => this.selectedIndices.has(idx)));
			this.close();
		});

		const cancelBtn = buttons.createEl("button", {
			text: "Cancelar",
		});
		cancelBtn.addEventListener("click", () => {
			this.close();
		});
	}

	override onClose(): void {
		if (!this.resolved) this.onSubmit([]);
		this.contentEl.empty();
	}
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeParagraph(text: string, blockId: string): string {
	const blockRegex = new RegExp(`\\s*${escapeRegExp(blockId)}\\b`, "g");
	let sanitized = text.replace(blockRegex, "");
	sanitized = sanitized.replace(
		/\[\[(.+?)(?:\|(.+?))?\]\]/g,
		(_, target: string, alias: string | undefined) => alias ?? target,
	);
	sanitized = sanitized.replace(
		/!\[\[(.+?)(?:\|(.+?))?\]\]/g,
		(_, target: string, alias: string | undefined) => alias ?? target,
	);
	sanitized = sanitized.replace(/\s{2,}/g, " ");
	sanitized = sanitized.replace(/\n\s+/g, "\n");
	return sanitized.trim();
}

function extractParagraphPreview(lines: string[], blockId: string): string {
	const idx = lines.findIndex((line) => line.includes(blockId));
	if (idx === -1) return "";

	const listItemRegex = /^\s*([-*+]|\d+\.)\s/;

	let start = idx;
	let collected = 1;
	while (start > 0 && lines[start - 1]?.trim() !== "" && collected < MAX_PARAGRAPH_LINES) {
		const previousLine = lines[start - 1] ?? "";
		if (listItemRegex.test(previousLine)) break;
		start--;
		collected++;
	}

	let end = idx;
	while (
		end + 1 < lines.length &&
		lines[end + 1]?.trim() !== "" &&
		end - start + 1 < MAX_PARAGRAPH_LINES
	) {
		const nextLine = lines[end + 1] ?? "";
		if (listItemRegex.test(nextLine)) break;
		end++;
	}

	const paragraph = lines.slice(start, end + 1).join("\n");
	let preview = sanitizeParagraph(paragraph, blockId);

	if (preview.length === 0) {
		preview = sanitizeParagraph(lines[idx] ?? "", blockId);
	}

	if (preview.length > MAX_PREVIEW_CHARS) {
		preview = preview.slice(0, MAX_PREVIEW_CHARS).trimEnd() + "…";
	}

	return preview;
}

async function collectEmbeds(
	plugin: Quadro,
	sourceCodeFile: TFile,
	content: string,
): Promise<EmbedReference[]> {
	const embeds: EmbedReference[] = [];
	const lines = content.split("\n");
	const dataFileCache = new Map<string, string[]>();
	const embedRegex = /!\[\[([^\]]+?)\]\]/g;

	for (const [lineIndex, line] of lines.entries()) {
		for (const match of line.matchAll(embedRegex)) {
			const inner = match[1];
			if (!inner) continue;

			const [linkWithBlock] = inner.split("|", 1);
			const linkPathPart = linkWithBlock || "";
			const hashIndex = linkPathPart.indexOf("#");
			if (hashIndex === -1) continue;

			const linkPath = linkPathPart.slice(0, hashIndex);
			const blockId = linkPathPart.slice(hashIndex + 1);
			if (!blockId.startsWith("^")) continue;

			const dataFile = plugin.app.metadataCache.getFirstLinkpathDest(
				linkPath,
				sourceCodeFile.path,
			);
			if (!dataFile) continue;
			if (typeOfFile(plugin, dataFile) !== "Data File") continue;

			let dataLines = dataFileCache.get(dataFile.path);
			if (!dataLines) {
				const dataContent = await plugin.app.vault.cachedRead(dataFile);
				dataLines = dataContent.split("\n");
				dataFileCache.set(dataFile.path, dataLines);
			}

			const preview = extractParagraphPreview(dataLines, blockId);

			embeds.push({
				lineIndex,
				lineText: line,
				dataFile,
				blockId,
				embedText: match[0] ?? `![[${inner}]]`,
				preview,
			});
		}
	}

	return embeds;
}

async function pickTargetCode(plugin: Quadro): Promise<TFile | null> {
	return await new Promise<TFile | null>((resolve) => {
		const suggester = new TargetCodeSuggester(plugin);
		let finished = false;
		let awaitingNewCode = false;

		const finalize = (codeFile: TFile | null): void => {
			if (finished) return;
			finished = true;
			resolve(codeFile);
		};

		suggester.onClose = () => {
			setTimeout(() => {
				if (!finished && !awaitingNewCode) finalize(null);
			}, 0);
		};

		suggester.onChooseItem = (item) => {
			if (item === "new-code-file") {
				awaitingNewCode = true;
				createOneCodeFile(plugin, (codeFile) => {
					awaitingNewCode = false;
					finalize(codeFile);
				});
				return;
			}
			finalize(item);
		};

		suggester.open();
	});
}

async function selectEmbeds(
	plugin: Quadro,
	initialEmbeds: EmbedReference[],
): Promise<EmbedReference[]> {
	return await new Promise<EmbedReference[]>((resolve) => {
		new EmbedMultiSelectModal(plugin, initialEmbeds, (selected) => resolve(selected)).open();
	});
}

async function removeEmbedsFromSource(
	plugin: Quadro,
	sourceCodeFile: TFile,
	selectedEmbeds: EmbedReference[],
): Promise<boolean> {
	if (selectedEmbeds.length === 0) return false;

	const embedsPerLine = new Map<number, string[]>();
	for (const embed of selectedEmbeds) {
		const list = embedsPerLine.get(embed.lineIndex) ?? [];
		list.push(embed.embedText);
		embedsPerLine.set(embed.lineIndex, list);
	}

	let removedAny = false;

	await plugin.app.vault.process(sourceCodeFile, (content) => {
		const lines = content.split("\n");
		let changed = false;

		for (const [index, embedTexts] of embedsPerLine.entries()) {
			if (index < 0 || index >= lines.length) continue;

			const currentLine = lines[index];
			if (!currentLine) continue;

			let updatedLine = currentLine;
			for (const embedText of embedTexts) {
				const pattern = new RegExp(escapeRegExp(embedText), "g");
				updatedLine = updatedLine.replace(pattern, "").trim();
			}

			if (updatedLine === currentLine) continue;

			removedAny = true;
			changed = true;
			lines[index] = updatedLine.trim() === "" ? "" : updatedLine.replace(/\s{2,}/g, " ");
		}

		if (!changed) return content;

		const cleaned = lines
			.join("\n")
			.replace(/\n{3,}/g, "\n\n")
			.replace(/^\n+/, "");
		return cleaned;
	});

	return removedAny;
}

async function appendEmbedsToTarget(
	plugin: Quadro,
	targetCodeFile: TFile,
	selectedEmbeds: EmbedReference[],
): Promise<number> {
	if (selectedEmbeds.length === 0) return 0;

	const currentContent = await plugin.app.vault.read(targetCodeFile);
	const existingEmbeds = new Set(
		currentContent
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line !== ""),
	);

	const addedEmbeds = new Set<string>();
	const embedsToAppend: string[] = [];
	for (const embed of selectedEmbeds) {
		const text = embed.embedText.trim();
		if (text === "") continue;
		if (existingEmbeds.has(text) || addedEmbeds.has(text)) continue;
		addedEmbeds.add(text);
		embedsToAppend.push(text);
	}

	if (embedsToAppend.length === 0) return 0;

	const needsLeadingNewline =
		currentContent.length > 0 &&
		!currentContent.endsWith("\n") &&
		!currentContent.endsWith("\r\n");
	const textToAppend = `${needsLeadingNewline ? "\n" : ""}${embedsToAppend.join("\n")}\n`;
	await plugin.app.vault.append(targetCodeFile, textToAppend);
	return embedsToAppend.length;
}

async function updateDatafileLinks(
	plugin: Quadro,
	sourceCodeFile: TFile,
	targetCodeFile: TFile,
	selectedEmbeds: EmbedReference[],
): Promise<number> {
	if (selectedEmbeds.length === 0) return 0;

	const app = plugin.app;
	const newFullCode = getFullCode(plugin, targetCodeFile);
	const oldFullCode = getFullCode(plugin, sourceCodeFile);
	const newLinkCache = new Map<string, string>();

	let updatedParagraphs = 0;

	for (const embed of selectedEmbeds) {
		await app.vault.process(embed.dataFile, (content) => {
			const lines = content.split("\n");
			let changed = false;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line.includes(embed.blockId)) continue;
				if (!line.includes(oldFullCode)) continue;

				const codesInLine = getCodesFilesInParagraphOfDatafile(plugin, embed.dataFile, line);
				const codeMatch = codesInLine.find((code) => code.tFile.path === sourceCodeFile.path);
				if (!codeMatch) continue;

				if (!newLinkCache.has(embed.dataFile.path)) {
					const newLink = app.fileManager.generateMarkdownLink(
						targetCodeFile,
						embed.dataFile.path,
						"",
						newFullCode,
					);
					newLinkCache.set(embed.dataFile.path, newLink);
				}

				const newLink = newLinkCache.get(embed.dataFile.path) ?? `[[${newFullCode}]]`;

				const updatedLine = line
					.replace(codeMatch.wikilink, newLink)
					.replace(/\s{2,}/g, " ")
					.replace(/\s+\^/, " ^");

				lines[i] = updatedLine.trimEnd();
				changed = true;
				updatedParagraphs++;
				break;
			}

			if (!changed) return content;
			return lines.join("\n");
		});
	}

	return updatedParagraphs;
}

export async function splitCodeCommand(plugin: Quadro): Promise<void> {
	const editor = getActiveEditor(plugin.app);
	if (!editor) return;
	if (typeOfFile(plugin) !== "Code File") {
		new Notice("Debes estar en un Code File para dividirlo.", 4000);
		return;
	}

	const sourceCodeFile = editor.editorComponent.view.file;
	if (!sourceCodeFile) {
		new Notice("No hay archivo abierto.", 4000);
		return;
	}

	const content = await plugin.app.vault.read(sourceCodeFile);
	const embeds = await collectEmbeds(plugin, sourceCodeFile, content);
	if (embeds.length === 0) {
		new Notice("Este código no tiene embeds para mover.", 4000);
		return;
	}

	const targetCodeFile = await pickTargetCode(plugin);
	if (!targetCodeFile) return;
	if (targetCodeFile.path === sourceCodeFile.path) {
		new Notice("Selecciona un código destino distinto al actual.", 4000);
		return;
	}

	const selectedEmbeds = await selectEmbeds(plugin, embeds);
	if (selectedEmbeds.length === 0) {
		new Notice("No se seleccionó ningún embed.", 4000);
		return;
	}

	const removed = await removeEmbedsFromSource(plugin, sourceCodeFile, selectedEmbeds);
	const appended = await appendEmbedsToTarget(plugin, targetCodeFile, selectedEmbeds);
	const updatedParagraphs = await updateDatafileLinks(
		plugin,
		sourceCodeFile,
		targetCodeFile,
		selectedEmbeds,
	);

	if (!removed && appended === 0 && updatedParagraphs === 0) {
		new Notice("No se realizaron cambios.", 4000);
		return;
	}

	for (const _ of selectedEmbeds) {
		incrementProgress(plugin, "Code File", "unassign");
		incrementProgress(plugin, "Code File", "assign");
	}

	const message = [
		`Se dividieron ${selectedEmbeds.length} referencia(s) de "${getFullCode(plugin, sourceCodeFile)}" a "${getFullCode(plugin, targetCodeFile)}".`,
		removed
			? "• Embeds eliminados del código original."
			: "• Los embeds ya se habían eliminado del código original.",
		appended > 0
			? `• Embeds añadidos al código destino: ${appended}`
			: "• Los embeds ya existían en el código destino.",
		updatedParagraphs > 0
			? `• Párrafos actualizados con el nuevo código: ${updatedParagraphs}`
			: "• Los párrafos ya apuntaban al nuevo código.",
	].join("\n");

	new Notice(message, 6000);
}
