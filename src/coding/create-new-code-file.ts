import { Notice, Setting, TFile, getFrontMatterInfo, normalizePath } from "obsidian";
import Quadro from "src/main";
import { ExtendedInputModal } from "src/shared/modals";

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputForOneFile extends ExtendedInputModal {
	fullCode = "";
	codeDesc = "";
	onSubmit: (fullCode: string, codeDesc: string) => void;

	constructor(plugin: Quadro, onSubmit: (fullCode: string, codeDesc: string) => void) {
		super(plugin);
		this.onSubmit = onSubmit;
	}

	override onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h4", { text: "New code creation" });
		contentEl.createEl("small", {
			text: 'If there is a file "Template.md" at the root of the Codes Folder, the new Code File will be populated with its frontmatter.',
		});
		contentEl.createEl("br", {});
		contentEl.createEl("br", {});

		// name input field
		new Setting(contentEl)
			.setName("Name of the Code")
			.setDesc('Use a slash ("/") in the name to create the Code File in a subfolder (group).')
			.addText((text) =>
				text.onChange((value) => {
					this.fullCode = value.trim();
					this.confirmationButton?.setDisabled(this.fullCode === "");
				}),
			);

		// description input field
		new Setting(contentEl)
			.setName("Code Description")
			.setDesc('Will be added as metadata with the key "code description".')
			.addText((text) =>
				text.onChange((value) => {
					this.codeDesc = value.trim();
				}),
			);

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) => {
				this.confirmationButton = btn
					.setButtonText("Create")
					.setCta()
					.setDisabled(true)
					.onClick(() => {
						this.close();
						this.onSubmit(this.fullCode, this.codeDesc);
					});
			})
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
}

class InputForMultipleFiles extends ExtendedInputModal {
	input = "";
	onSubmit: (fullCode: string) => void;

	constructor(plugin: Quadro, onSubmit: (fullCode: string) => void) {
		super(plugin);
		this.onSubmit = onSubmit;
	}

	override onOpen() {
		const { contentEl } = this;

		// info text
		contentEl.createEl("h4", { text: "Bulk-create new codes" });
		contentEl.createEl("p", { text: "Every line will result in a new code file." });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") in the name to create the Code File in a subfolder (group).',
		});
		contentEl.createEl("p", {
			text: 'If there is a file "Template.md" at the root of the Codes Folder, the new Code Files will be populated with its frontmatter.',
		});

		// textarea field
		new Setting(contentEl).setClass("quadro-bulk-code-creation").addTextArea((text) =>
			text.onChange((value) => {
				this.input = value.trim();
				this.confirmationButton?.setDisabled(this.input === "");
			}),
		);

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) => {
				this.confirmationButton = btn
					.setButtonText("Create")
					.setCta()
					.setDisabled(true)
					.onClick(() => {
						this.close();
						this.onSubmit(this.input);
					});
			})
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
}

//──────────────────────────────────────────────────────────────────────────────

async function createCodeFile(
	plugin: Quadro,
	fullCode: string,
	codeDesc: string,
): Promise<TFile | false> {
	const { app, settings } = plugin;
	fullCode = fullCode
		.replace(/\.md$/, "") // no extension
		.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
		.replace(/^\.|\/\./g, ""); // no hidden files/folders

	// GUARD Code File already exists
	const absolutePath = normalizePath(`${settings.coding.folder}/${fullCode}.md`);
	const fileExists = app.vault.getFileByPath(absolutePath);
	if (fileExists) {
		new Notice(`Code "${fullCode}" already exists, Code File not created.`);
		return false;
	}

	// create folder
	const parts = fullCode.split("/");
	const codeName = parts.pop();
	const codeSubfolder = parts.length ? "/" + parts.join("/") : "";
	const parent = settings.coding.folder + codeSubfolder;
	const folderExists = app.vault.getFolderByPath(parent);
	if (!folderExists) await app.vault.createFolder(parent);

	// CODE FILE content
	// read from template file, and if it has a description key, replace it there
	const descriptionLine = `code description: "${codeDesc.replaceAll('"', "'")}"`;

	const templateFile = app.vault.getFileByPath(settings.coding.folder + "/Template.md");
	const frontmatterLines: string[] = [];
	if (templateFile) {
		const templateContent = await app.vault.read(templateFile);
		let { exists, frontmatter: templateFrontmatter } = getFrontMatterInfo(templateContent);
		if (exists) {
			const templateHasDescriptionKey = templateFrontmatter.match(/^code description:/m);
			templateFrontmatter = templateHasDescriptionKey
				? templateFrontmatter.replace(/^code description:.*$/m, descriptionLine)
				: descriptionLine + "\n" + templateFrontmatter;
			frontmatterLines.push(...templateFrontmatter.trim().split("\n"));
		}
	} else {
		frontmatterLines.push(descriptionLine);
	}

	const content = ["---", ...frontmatterLines, "---", "", ""];

	// create CODE FILE
	const newCodeFile = await app.vault.create(`${parent}/${codeName}.md`, content.join("\n"));
	return newCodeFile;
}

/** Prompts for name of new file, then runs callback on it. */
export function createOneCodeFile(plugin: Quadro, callback: (codeFile: TFile) => void): void {
	new InputForOneFile(plugin, async (fullCode, codeDesc) => {
		const codeFile = await createCodeFile(plugin, fullCode, codeDesc);
		if (codeFile) {
			new Notice(`Created new code file: "${fullCode}"`);
			callback(codeFile);
		} else {
			new Notice("File creation failed.");
		}
	}).open();
}

export async function bulkCreateCodeFilesCommand(plugin: Quadro): Promise<void> {
	new InputForMultipleFiles(plugin, async (userInput) => {
		let newFiles = 0;
		const failedFiles: string[] = [];
		for (const fullCode of userInput.split("\n")) {
			const newFile = await createCodeFile(plugin, fullCode, "");
			if (newFile) newFiles++;
			else failedFiles.push(fullCode);
		}

		// report
		let msg = `${newFiles} file(s) created`;
		if (failedFiles.length > 0) msg += "\nCould not create: " + failedFiles.join(", ");
		new Notice(msg, (failedFiles.length + 2) * 1000);
	}).open();
}
